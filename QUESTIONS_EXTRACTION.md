# Questions Extraction Feature

## Overview

The Questions Extraction feature allows teachers to automatically extract questions from documents (PDF, DOCX, images) using Google's Gemini AI. Teachers can review and edit the extracted questions before saving them to the database.

## Setup

### 1. Get a Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key

### 2. Set Environment Variable

Add your Gemini API key to your environment:

**On Windows (PowerShell):**
```powershell
$env:GEMINI_API_KEY="your_api_key_here"
```

**On Windows (Command Prompt):**
```cmd
set GEMINI_API_KEY=your_api_key_here
```

**On Linux/Mac:**
```bash
export GEMINI_API_KEY="your_api_key_here"
```

Or add to your `.env` file (if using python-dotenv):
```
GEMINI_API_KEY=your_api_key_here
```

### 3. Install Dependencies

Ensure you have activated the virtual environment, then run:

```bash
# Install required packages
pip install google-generativeai requests python-docx pytesseract pdf2image pillow
```

**Note:** For PDF support with OCR, you also need to install **Poppler** on your system:
- **Windows:** Download from https://github.com/oschwartz10612/poppler-windows/releases/ and add to PATH
- **macOS:** `brew install poppler`
- **Linux:** `sudo apt-get install poppler-utils`

### 4. Restart the Flask Application

```bash
python app.py
```

## Usage

1. Navigate to **Staff Portal** → **Upload Questions**
2. Click the **Extract** tab (third tab)
3. Select:
   - Class & Subject
   - Term
   - Exam Type
4. Upload a file (PDF, DOCX, PNG, JPG, TIFF)
5. Optionally add a custom prompt for better extraction
6. Click "Extract"
7. Review the extracted questions in the preview table
8. Click "Approve & Create Questions" to save them to the database

## Supported File Formats

| Format | Notes |
|--------|-------|
| **PDF** | Text-based or scanned PDFs (OCR applied to scanned content) |
| **DOCX** | Microsoft Word documents |
| **PNG** | Image files |
| **JPG/JPEG** | Image files |
| **TIFF** | Image files (scanned documents) |

## How It Works

### Flow

1. **Upload** → Teacher selects a file and optional custom prompt
2. **Extract** → Gemini AI processes the file and extracts questions
3. **Normalize** → Service converts Gemini's response to the app's question format
4. **Review** → Teacher sees extracted questions in a preview table
5. **Approve** → Teacher reviews and approves questions for creation
6. **Create** → Questions are saved to the database with proper validation

### Gemini Extraction

The service sends files to Google's Gemini API with a detailed prompt that requests:
- Question text
- Question type (MCQ, True/False, Short Answer)
- Options (for MCQ/True/False)
- Correct answers
- Math notation detection
- Context/tables if needed

Gemini returns a JSON array of extracted questions, which is then normalized and validated against the application's question format rules.

### Fallback Behavior

If Gemini API is not configured:
- **DOCX files** → Uses local DOCX parser (no Gemini call)
- **Images/PDFs** → Attempts OCR (if pytesseract installed) and returns minimal structure
- **All other cases** → Returns error asking to configure Gemini API

## Validation Rules

Extracted questions follow the same validation as bulk uploads:

- **MCQ**: Minimum 3 options, exactly one marked as correct
- **True/False**: Exactly 2 options (True/False), one marked as correct
- **Short Answer**: Requires a correct answer text
- All questions require non-empty question text
- For questions depending on tables: context must be included

## Troubleshooting

### Error: "GEMINI_API_KEY environment variable is not set"
- Ensure you've set the `GEMINI_API_KEY` environment variable before starting the app
- Restart the Flask application after setting the variable

### Error: "Gemini response was not valid JSON"
- The Gemini model may have returned text instead of JSON
- Try uploading a clearer document or adjust the custom prompt
- Check that the document contains actual questions

### Error: "pytesseract: "tesseract" is not installed"
- Install Tesseract OCR on your system (comes with poppler setup)

### Error: "PDF doesn't exist or not readable"
- Ensure the file is a valid PDF and not corrupted
- Try with a smaller file first

## API Endpoints

### Extract Questions
- **POST** `/staff/extract_questions`
- **Requires**: Authorization, file, subject_id, class_room_id, term_id, exam_type_id
- **Returns**: JSON array of extracted questions

### Create Questions from Extracted JSON
- **POST** `/staff/create_questions_from_json`
- **Requires**: Authorization, subject_id, class_room_id, term_id, exam_type_id, questions array
- **Returns**: Creation summary with created count and any errors

## Privacy & Cost Notes

- Document content is sent to Google's Gemini API servers
- Each extraction incurs API usage (check Gemini pricing)
- Consider enabling audit logging if required by your institution
- Confirm with your school's IT/legal team before enabling for all teachers

## Future Enhancements

- Async/background processing for large files
- Inline editing of questions before approval
- LaTeX rendering in review preview
- Image preview for scanned questions
- Batch extraction from multiple files
- Custom extraction templates per subject
