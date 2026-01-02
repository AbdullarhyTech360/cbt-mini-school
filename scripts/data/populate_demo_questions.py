#!/usr/bin/env python3
"""
Script to populate the demo question bank with sample questions for student practice.
"""

from app import app, db
from models.demo_question import DemoQuestion, DemoOption

def populate_demo_questions():
    """Populate the database with demo questions for practice."""

    # Check if demo questions already exist
    existing_questions = DemoQuestion.query.count()
    if existing_questions > 0:

        return

    # Sample demo questions
    demo_questions_data = [
        # Mathematics Questions
        {
            "question_text": "What is the value of π (pi) approximately?",
            "question_type": "mcq",
            "subject": "Mathematics",
            "difficulty": "easy",
            "options": [
                {"text": "3.14", "is_correct": True},
                {"text": "2.71", "is_correct": False},
                {"text": "1.41", "is_correct": False},
                {"text": "1.73", "is_correct": False}
            ]
        },
        {
            "question_text": "Solve for x: 2x + 5 = 15",
            "question_type": "mcq",
            "subject": "Mathematics",
            "difficulty": "easy",
            "options": [
                {"text": "x = 5", "is_correct": True},
                {"text": "x = 10", "is_correct": False},
                {"text": "x = 7.5", "is_correct": False},
                {"text": "x = 2.5", "is_correct": False}
            ]
        },
        {
            "question_text": "What is the area of a circle with radius 5cm? (Use π = 3.14)",
            "question_type": "mcq",
            "subject": "Mathematics",
            "difficulty": "medium",
            "options": [
                {"text": "78.5 cm²", "is_correct": True},
                {"text": "31.4 cm²", "is_correct": False},
                {"text": "15.7 cm²", "is_correct": False},
                {"text": "25 cm²", "is_correct": False}
            ]
        },
        {
            "question_text": "The square root of 144 is 12.",
            "question_type": "true_false",
            "subject": "Mathematics",
            "difficulty": "easy",
            "options": [
                {"text": "True", "is_correct": True},
                {"text": "False", "is_correct": False}
            ]
        },
        {
            "question_text": "What is the result of 15 × (8 - 3) + 7?",
            "question_type": "short_answer",
            "subject": "Mathematics",
            "difficulty": "medium",
            "correct_answer": "82"
        },

        # English Questions
        {
            "question_text": "Which word is a synonym for 'happy'?",
            "question_type": "mcq",
            "subject": "English",
            "difficulty": "easy",
            "options": [
                {"text": "Joyful", "is_correct": True},
                {"text": "Sad", "is_correct": False},
                {"text": "Angry", "is_correct": False},
                {"text": "Tired", "is_correct": False}
            ]
        },
        {
            "question_text": "Identify the verb in the sentence: 'She quickly ran to the store.'",
            "question_type": "mcq",
            "subject": "English",
            "difficulty": "medium",
            "options": [
                {"text": "ran", "is_correct": True},
                {"text": "quickly", "is_correct": False},
                {"text": "She", "is_correct": False},
                {"text": "store", "is_correct": False}
            ]
        },
        {
            "question_text": "A noun is a word that describes an action.",
            "question_type": "true_false",
            "subject": "English",
            "difficulty": "easy",
            "options": [
                {"text": "True", "is_correct": False},
                {"text": "False", "is_correct": True}
            ]
        },
        {
            "question_text": "What punctuation mark is used at the end of a question?",
            "question_type": "short_answer",
            "subject": "English",
            "difficulty": "easy",
            "correct_answer": "Question mark"
        },
        {
            "question_text": "Which sentence is written in past tense?",
            "question_type": "mcq",
            "subject": "English",
            "difficulty": "medium",
            "options": [
                {"text": "She will go to school.", "is_correct": False},
                {"text": "She goes to school.", "is_correct": False},
                {"text": "She went to school.", "is_correct": True},
                {"text": "She is going to school.", "is_correct": False}
            ]
        },

        # Science Questions
        {
            "question_text": "What is the chemical symbol for water?",
            "question_type": "mcq",
            "subject": "Science",
            "difficulty": "easy",
            "options": [
                {"text": "H2O", "is_correct": True},
                {"text": "CO2", "is_correct": False},
                {"text": "NaCl", "is_correct": False},
                {"text": "O2", "is_correct": False}
            ]
        },
        {
            "question_text": "The Earth revolves around the Sun.",
            "question_type": "true_false",
            "subject": "Science",
            "difficulty": "easy",
            "options": [
                {"text": "True", "is_correct": True},
                {"text": "False", "is_correct": False}
            ]
        },
        {
            "question_text": "What gas do plants absorb from the atmosphere for photosynthesis?",
            "question_type": "mcq",
            "subject": "Science",
            "difficulty": "medium",
            "options": [
                {"text": "Carbon dioxide", "is_correct": True},
                {"text": "Oxygen", "is_correct": False},
                {"text": "Nitrogen", "is_correct": False},
                {"text": "Hydrogen", "is_correct": False}
            ]
        },
        {
            "question_text": "What is the powerhouse of the cell?",
            "question_type": "short_answer",
            "subject": "Science",
            "difficulty": "medium",
            "correct_answer": "Mitochondria"
        },
        {
            "question_text": "Which planet is known as the Red Planet?",
            "question_type": "mcq",
            "subject": "Science",
            "difficulty": "easy",
            "options": [
                {"text": "Mars", "is_correct": True},
                {"text": "Venus", "is_correct": False},
                {"text": "Jupiter", "is_correct": False},
                {"text": "Saturn", "is_correct": False}
            ]
        },

        # History Questions
        {
            "question_text": "In which year did World War II end?",
            "question_type": "mcq",
            "subject": "History",
            "difficulty": "medium",
            "options": [
                {"text": "1945", "is_correct": True},
                {"text": "1939", "is_correct": False},
                {"text": "1950", "is_correct": False},
                {"text": "1941", "is_correct": False}
            ]
        },
        {
            "question_text": "The first President of the United States was George Washington.",
            "question_type": "true_false",
            "subject": "History",
            "difficulty": "easy",
            "options": [
                {"text": "True", "is_correct": True},
                {"text": "False", "is_correct": False}
            ]
        },
        {
            "question_text": "Who wrote the Declaration of Independence?",
            "question_type": "short_answer",
            "subject": "History",
            "difficulty": "medium",
            "correct_answer": "Thomas Jefferson"
        },
        {
            "question_text": "The ancient Egyptian civilization was located along which river?",
            "question_type": "mcq",
            "subject": "History",
            "difficulty": "medium",
            "options": [
                {"text": "Nile River", "is_correct": True},
                {"text": "Amazon River", "is_correct": False},
                {"text": "Mississippi River", "is_correct": False},
                {"text": "Danube River", "is_correct": False}
            ]
        },
        {
            "question_text": "The Renaissance period began in which century?",
            "question_type": "mcq",
            "subject": "History",
            "difficulty": "hard",
            "options": [
                {"text": "14th century", "is_correct": True},
                {"text": "12th century", "is_correct": False},
                {"text": "16th century", "is_correct": False},
                {"text": "18th century", "is_correct": False}
            ]
        }
    ]

    # Create demo questions
    for question_data in demo_questions_data:
        # Create the question
        question = DemoQuestion(
            question_text=question_data["question_text"],
            question_type=question_data["question_type"],
            subject=question_data["subject"],
            difficulty=question_data["difficulty"],
            correct_answer=question_data.get("correct_answer")
        )

        db.session.add(question)
        db.session.flush()  # Get the question ID without committing

        # Create options if this is an MCQ or True/False question
        if question_data["question_type"] in ["mcq", "true_false"]:
            for i, option_data in enumerate(question_data["options"]):
                option = DemoOption(
                    text=option_data["text"],
                    is_correct=option_data["is_correct"],
                    order=i,
                    question_id=question.id
                )
                db.session.add(option)

    # Commit all changes
    db.session.commit()


if __name__ == "__main__":
    with app.app_context():
        populate_demo_questions()
