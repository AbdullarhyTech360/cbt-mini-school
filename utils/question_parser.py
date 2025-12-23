"""
Question Parser Utility
Handles parsing of questions from JSON, CSV, and Word documents
"""

import json
import csv
import io
from docx import Document
from utils.math_content_parser import (
    extract_images_from_docx,
    process_question_text,
    extract_math_from_text
)


def parse_json_questions(file_content):
    """
    Parse questions from JSON format
    Expected format:
    [
        {
            "question_text": "What is the capital of France?",
            "question_type": "mcq",
            "options": ["Paris", "London", "Berlin"],
            "answer": 1
        },
        ...
    ]
    """
    try:
        if isinstance(file_content, bytes):
            file_content = file_content.decode('utf-8')
        
        questions = json.loads(file_content)
        
        if not isinstance(questions, list):
            return None, "JSON must contain an array of questions"
        
        parsed_questions = []
        for idx, q in enumerate(questions, 1):
            try:
                question_data = {
                    "question_text": q.get("question_text", "").strip(),
                    "question_type": q.get("question_type", "mcq").lower(),
                }
                
                if not question_data["question_text"]:
                    continue
                
                # Handle different question types
                if question_data["question_type"] in ["mcq", "true_false"]:
                    options = q.get("options", [])
                    answer_index = q.get("answer", 0)
                    
                    if not options:
                        continue
                    
                    question_data["options"] = [
                        {"text": opt, "is_correct": (i == answer_index)}
                        for i, opt in enumerate(options)
                    ]
                    
                elif question_data["question_type"] == "short_answer":
                    question_data["correct_answer"] = q.get("correct_answer", "")
                
                parsed_questions.append(question_data)
                
            except Exception as e:
                print(f"Error parsing question {idx}: {str(e)}")
                continue
        
        return parsed_questions, None
        
    except json.JSONDecodeError as e:
        return None, f"Invalid JSON format: {str(e)}"
    except Exception as e:
        return None, f"Error parsing JSON: {str(e)}"


def parse_csv_questions(file_content):
    """
    Parse questions from CSV format
    Expected format:
    question_text,question_type,options,correct_answer
    "What is the capital of France?","mcq","[""Paris"", ""London"", ""Berlin""]","1"
    """
    try:
        if isinstance(file_content, bytes):
            file_content = file_content.decode('utf-8')
        
        csv_file = io.StringIO(file_content)
        reader = csv.DictReader(csv_file)
        
        parsed_questions = []
        for idx, row in enumerate(reader, 1):
            try:
                question_data = {
                    "question_text": row.get("question_text", "").strip(),
                    "question_type": row.get("question_type", "mcq").lower().strip(),
                }
                
                if not question_data["question_text"]:
                    continue
                
                # Handle different question types
                if question_data["question_type"] in ["mcq", "true_false"]:
                    options_str = row.get("options", "[]").strip()
                    correct_answer_str = row.get("correct_answer", "0").strip()
                    
                    # Remove quotes if present
                    if correct_answer_str.startswith('"') and correct_answer_str.endswith('"'):
                        correct_answer_str = correct_answer_str[1:-1]
                    
                    try:
                        options = json.loads(options_str)
                    except:
                        # Try parsing as comma-separated
                        options = [opt.strip() for opt in options_str.split(",")]
                    
                    try:
                        answer_index = int(correct_answer_str)
                    except ValueError:
                        print(f"Warning: Could not parse answer index '{correct_answer_str}' for row {idx}, defaulting to 0")
                        answer_index = 0
                    
                    question_data["options"] = [
                        {"text": opt, "is_correct": (i == answer_index)}
                        for i, opt in enumerate(options)
                    ]
                    
                elif question_data["question_type"] == "short_answer":
                    correct_answer = row.get("correct_answer", "").strip()
                    # Remove quotes if present
                    if correct_answer.startswith('"') and correct_answer.endswith('"'):
                        correct_answer = correct_answer[1:-1]
                    question_data["correct_answer"] = correct_answer
                
                parsed_questions.append(question_data)
                
            except Exception as e:
                print(f"Error parsing CSV row {idx}: {str(e)}")
                continue
        
        return parsed_questions, None
        
    except Exception as e:
        return None, f"Error parsing CSV: {str(e)}"


def parse_word_questions(file_content):
    """
    Parse questions from Word document with support for mathematical notation and images
    Expected format:
    Question: What is the capital of France?
    Type: MCQ
    Options:
    - London
    - *Paris
    - Berlin
    
    Question: The Earth is flat.
    Type: True/False
    Options:
    - True
    - *False
    
    Question: What is the chemical symbol for water?
    Type: Short Answer
    Answer: H2O
    
    Supports:
    - Mathematical notation (LaTeX, Unicode symbols)
    - Embedded images in questions and options
    - Rich text formatting
    """
    try:
        doc = Document(io.BytesIO(file_content))
        
        # Extract all images from the document first
        images_dict = extract_images_from_docx(doc)
        print(f"=== Found {len(images_dict)} images in document ===")
        
        parsed_questions = []
        current_question = None
        current_options = []
        in_options = False
        
        print("=== Parsing DOCX file ===")
        for idx, para in enumerate(doc.paragraphs):
            text = para.text.strip()
            print(f"Paragraph {idx}: '{text}'")
            
            if not text:
                # Check if paragraph contains only an image
                image_data = process_question_text(para, images_dict)[2]
                if image_data and current_question:
                    # Attach image to current question or option
                    if in_options and current_options:
                        current_options[-1]["option_image"] = image_data
                        print(f"  -> Attached image to last option")
                    else:
                        current_question["question_image"] = image_data
                        print(f"  -> Attached image to question")
                continue
            
            # Check for question start
            if text.lower().startswith("question:"):
                print(f"  -> Found question start")
                # Save previous question if exists
                if current_question:
                    if current_question["question_type"] in ["mcq", "true_false"]:
                        current_question["options"] = current_options
                        print(f"  -> Saved previous question with {len(current_options)} options")
                    parsed_questions.append(current_question)
                
                # Process question text for math and images
                question_text = text[9:].strip()  # Remove "Question:" prefix
                processed_text, has_math, image_data = process_question_text(para, images_dict)
                if processed_text and processed_text != text:
                    question_text = processed_text[9:].strip() if processed_text.lower().startswith("question:") else processed_text
                else:
                    question_text, has_math = extract_math_from_text(question_text)
                
                # Start new question
                current_question = {
                    "question_text": question_text,
                    "question_type": "mcq",
                    "options": [],
                    "has_math": has_math
                }
                
                if image_data:
                    current_question["question_image"] = image_data
                
                current_options = []
                in_options = False
                
            elif text.lower().startswith("type:") and current_question:
                q_type = text[5:].strip().lower()
                print(f"  -> Found type: {q_type}")
                if "mcq" in q_type or "multiple" in q_type:
                    current_question["question_type"] = "mcq"
                elif "true" in q_type or "false" in q_type:
                    current_question["question_type"] = "true_false"
                elif "short" in q_type:
                    current_question["question_type"] = "short_answer"
                    
            elif text.lower().startswith("options:") and current_question:
                print(f"  -> Found options marker")
                in_options = True
                
            elif text.lower().startswith("answer:") and current_question:
                answer_text = text[7:].strip()
                # Process answer for math notation
                answer_text, has_math = extract_math_from_text(answer_text)
                current_question["correct_answer"] = answer_text
                if has_math:
                    current_question["has_math"] = True
                print(f"  -> Found answer: {answer_text}")
                in_options = False
                
            elif in_options and text.startswith("-"):
                # Parse option
                option_text = text[1:].strip()
                is_correct = option_text.startswith("*")
                if is_correct:
                    option_text = option_text[1:].strip()
                
                # Process option text for math and images
                processed_text, has_math, image_data = process_question_text(para, images_dict)
                if processed_text and processed_text != text:
                    option_text = processed_text[1:].strip() if processed_text.startswith("-") else processed_text
                    if option_text.startswith("*"):
                        option_text = option_text[1:].strip()
                else:
                    option_text, has_math = extract_math_from_text(option_text)
                
                option_data = {
                    "text": option_text,
                    "is_correct": is_correct,
                    "has_math": has_math
                }
                
                if image_data:
                    option_data["option_image"] = image_data
                
                print(f"  -> Found option: {option_text} (correct: {is_correct}, has_math: {has_math})")
                current_options.append(option_data)
        
        # Save last question
        if current_question:
            if current_question["question_type"] in ["mcq", "true_false"]:
                current_question["options"] = current_options
                print(f"  -> Saved last question with {len(current_options)} options")
            parsed_questions.append(current_question)
        
        print(f"=== Total questions parsed: {len(parsed_questions)} ===")
        for idx, q in enumerate(parsed_questions):
            has_image = "question_image" in q
            print(f"Question {idx + 1}: {q['question_type']}, options: {len(q.get('options', []))}, has_math: {q.get('has_math', False)}, has_image: {has_image}")
        
        return parsed_questions, None
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return None, f"Error parsing Word document: {str(e)}"


def parse_questions_file(file, file_type=None):
    """
    Main function to parse questions from any supported file format
    
    Args:
        file: File object or file content
        file_type: 'json', 'csv', or 'word' (auto-detected if None)
    
    Returns:
        tuple: (parsed_questions, error_message)
    """
    try:
        # Read file content
        if hasattr(file, 'read'):
            content = file.read()
            filename = getattr(file, 'filename', '')
        else:
            content = file
            filename = ''
        
        # Auto-detect file type if not provided
        if not file_type:
            if filename.endswith('.json'):
                file_type = 'json'
            elif filename.endswith('.csv'):
                file_type = 'csv'
            elif filename.endswith('.docx'):
                file_type = 'word'
            else:
                return None, "Unsupported file format. Please use JSON, CSV, or DOCX files."
        
        # Parse based on file type
        if file_type == 'json':
            return parse_json_questions(content)
        elif file_type == 'csv':
            return parse_csv_questions(content)
        elif file_type == 'word':
            return parse_word_questions(content)
        else:
            return None, f"Unsupported file type: {file_type}"
            
    except Exception as e:
        return None, f"Error reading file: {str(e)}"
