"""
Mathematical Content Parser
Handles extraction and conversion of mathematical notation and images from DOCX files
"""

import re
import base64
from io import BytesIO
from docx import Document
from docx.oxml.ns import qn
from docx.oxml import parse_xml
from docx.text.paragraph import Paragraph


def extract_math_from_text(text):
    """
    Extract mathematical notation from text and convert to LaTeX format
    Supports common patterns like:
    - x^2 -> x²
    - sqrt(x) -> √x
    - Fractions like 1/2
    """
    if not text:
        return text, False
    
    has_math = False
    
    # Check for common math patterns
    math_patterns = [
        r'\^',  # Powers
        r'sqrt\(',  # Square roots
        r'\\frac',  # LaTeX fractions
        r'\\sum',  # Summation
        r'\\int',  # Integration
        r'\\alpha|\\beta|\\gamma|\\delta',  # Greek letters
        r'[₀₁₂₃₄₅₆₇₈₉]',  # Subscripts
        r'[⁰¹²³⁴⁵⁶⁷⁸⁹]',  # Superscripts
        r'[∑∫∂∇√∞≈≠≤≥±×÷]',  # Math symbols
    ]
    
    for pattern in math_patterns:
        if re.search(pattern, text):
            has_math = True
            break
    
    # Convert common patterns to LaTeX if not already in LaTeX
    if has_math and not text.strip().startswith('$'):
        # Convert powers: x^2 -> x^{2}
        text = re.sub(r'(\w)\^(\w)', r'\1^{\2}', text)
        
        # Convert sqrt to LaTeX
        text = re.sub(r'sqrt\(([^)]+)\)', r'\\sqrt{\1}', text)
        
        # Wrap in inline math delimiters if it contains LaTeX commands
        if '\\' in text:
            text = f'${text}$'
    
    return text, has_math


def extract_images_from_docx(doc):
    """
    Extract all images from a DOCX document
    Returns a dictionary mapping image IDs to base64-encoded image data
    """
    images = {}
    
    try:
        # Get all image relationships
        for rel in doc.part.rels.values():
            if "image" in rel.target_ref:
                image_data = rel.target_part.blob
                # Convert to base64
                image_base64 = base64.b64encode(image_data).decode('utf-8')
                
                # Determine image format from content type
                content_type = rel.target_part.content_type
                if 'png' in content_type:
                    image_format = 'png'
                elif 'jpeg' in content_type or 'jpg' in content_type:
                    image_format = 'jpeg'
                elif 'gif' in content_type:
                    image_format = 'gif'
                else:
                    image_format = 'png'  # Default
                
                # Store with data URI format
                images[rel.rId] = f"data:image/{image_format};base64,{image_base64}"
    
    except Exception as e:
        # print(f"Error extracting images: {str(e)}")
    
    return images


def get_paragraph_image(paragraph, images_dict):
    """
    Check if a paragraph contains an image and return its base64 data
    """
    try:
        # Check for inline images
        for run in paragraph.runs:
            # Check for drawing elements (images)
            drawings = run._element.findall(qn('w:drawing'))
            for drawing in drawings:
                # Find the image reference
                blips = drawing.findall('.//' + qn('a:blip'))
                for blip in blips:
                    embed = blip.get(qn('r:embed'))
                    if embed and embed in images_dict:
                        return images_dict[embed]
    except Exception as e:
        # print(f"Error getting paragraph image: {str(e)}")
    
    return None


def convert_office_math_to_latex(math_element):
    """
    Convert Office Math (OMML) to LaTeX
    Handles common mathematical structures from Word Equation Editor
    
    This is a simplified converter. For production use, consider using:
    - python-mammoth library
    - omml2mathml converter
    - Or just preserve the text as-is and let MathJax handle it
    """
    try:
        # For now, extract all text content and preserve it
        # This works better than trying to parse complex OMML structure
        all_text = []
        
        # Get all text nodes in order
        for elem in math_element.iter():
            # Get text content
            if elem.text and elem.text.strip():
                text = elem.text.strip()
                # Don't add if it's just whitespace or already added
                if text and text not in all_text:
                    all_text.append(text)
            
            # Get tail text (text after the element)
            if elem.tail and elem.tail.strip():
                tail = elem.tail.strip()
                if tail and tail not in all_text:
                    all_text.append(tail)
        
        if all_text:
            # Join with spaces and clean up
            result = ' '.join(all_text)
            
            # Basic cleanup
            result = result.replace('  ', ' ')  # Remove double spaces
            
            return result
        
        return None
        
    except Exception as e:
        # print(f"Error converting Office Math to LaTeX: {str(e)}")
        return None


def get_full_paragraph_text(paragraph):
    """
    Extract all text from a paragraph including text in equation elements
    python-docx's paragraph.text doesn't include equation text properly
    """
    try:
        full_text = []
        
        # Iterate through all runs in the paragraph
        for run in paragraph.runs:
            # Get regular text
            if run.text:
                full_text.append(run.text)
        
        # Also check for math elements and extract their text
        for math_elem in paragraph._element.findall('.//' + qn('m:oMath')):
            # Get all text from math element
            for text_elem in math_elem.iter():
                if text_elem.text and text_elem.text.strip():
                    full_text.append(text_elem.text.strip())
        
        return ' '.join(full_text).strip()
    except Exception as e:
        # print(f"Error extracting full paragraph text: {str(e)}")
        return paragraph.text.strip()


def extract_math_ml_from_docx(paragraph):
    """
    Extract MathML or Office Math from DOCX paragraph
    Converts to LaTeX format for rendering with MathJax
    """
    try:
        # Look for Office Math elements (from Word Equation Editor)
        math_elements = paragraph._element.findall('.//' + qn('m:oMath'))
        
        if math_elements:
            latex_expressions = []
            
            for math_elem in math_elements:
                # Try to convert to LaTeX
                latex = convert_office_math_to_latex(math_elem)
                if latex:
                    latex_expressions.append(latex)
            
            if latex_expressions:
                # Join multiple expressions and wrap in LaTeX delimiters
                combined = ' '.join(latex_expressions)
                return f'${combined}$', True
                
    except Exception as e:
        # print(f"Error extracting MathML: {str(e)}")
    
    return None, False


def convert_unicode_math_symbols(text):
    """
    Convert Unicode mathematical symbols to LaTeX equivalents
    """
    if not text:
        return text, False
    
    has_math = False
    
    # Unicode to LaTeX mapping
    unicode_map = {
        '²': '^{2}',
        '³': '^{3}',
        '√': '\\sqrt',
        '∑': '\\sum',
        '∫': '\\int',
        '∂': '\\partial',
        '∇': '\\nabla',
        '∞': '\\infty',
        '≈': '\\approx',
        '≠': '\\neq',
        '≤': '\\leq',
        '≥': '\\geq',
        '±': '\\pm',
        '×': '\\times',
        '÷': '\\div',
        'α': '\\alpha',
        'β': '\\beta',
        'γ': '\\gamma',
        'δ': '\\delta',
        'θ': '\\theta',
        'λ': '\\lambda',
        'μ': '\\mu',
        'π': '\\pi',
        'σ': '\\sigma',
        'φ': '\\phi',
        'ω': '\\omega',
    }
    
    original_text = text
    for unicode_char, latex_equiv in unicode_map.items():
        if unicode_char in text:
            text = text.replace(unicode_char, latex_equiv)
            has_math = True
    
    # Wrap in math delimiters if we made replacements
    if has_math and not text.strip().startswith('$'):
        text = f'${text}$'
    
    return text, has_math


def process_question_text(paragraph, images_dict):
    """
    Process a question paragraph to extract text, math, and images
    Returns: (text, has_math, image_data)
    """
    # Get the full text including equation content
    text = get_full_paragraph_text(paragraph)
    has_math = False
    image_data = None
    
    # Check for images
    image_data = get_paragraph_image(paragraph, images_dict)
    
    # Check for MathML (Word Equation Editor content)
    math_elements = paragraph._element.findall('.//' + qn('m:oMath'))
    
    if math_elements:
        # Has equation editor content
        has_math = True
        
        # Wrap in math delimiters if not already wrapped
        if text and not text.startswith('$'):
            text = f'${text}$'
    else:
        # No equation editor, check for Unicode symbols
        text, has_unicode_math = convert_unicode_math_symbols(text)
        if has_unicode_math:
            has_math = True
        else:
            # Check for other math patterns
            text, has_pattern_math = extract_math_from_text(text)
            if has_pattern_math:
                has_math = True
    
    return text, has_math, image_data
