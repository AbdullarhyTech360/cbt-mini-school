# Question Management Feature

## Overview
A comprehensive interface to view, edit, and delete questions for specific subjects, classes, and terms.

## Features

### 1. Filter Questions
- **Subject Filter**: Select the subject
- **Class Filter**: Select the class
- **Term Filter**: Select the term
- **Load Button**: Fetches questions matching the filters

### 2. View Questions
- Displays all questions for the selected filters
- Shows question text and all options
- Highlights the correct answer in green
- Shows question count
- Search functionality to filter displayed questions

### 3. Edit Questions
- Click the edit icon (pencil) on any question
- Modal opens with:
  - Question text (editable)
  - All options (editable)
  - Radio buttons to mark correct answer
- Save changes or cancel

### 4. Delete Individual Questions
- Click the delete icon (trash) on any question
- Confirmation dialog appears
- Question is permanently deleted

### 5. Delete All Questions
- "Delete All Questions" button appears when questions are loaded
- Deletes ALL questions for the selected subject, class, and term
- Confirmation dialog with count
- Useful for removing incorrectly uploaded questions

## Usage

### To View Questions:
1. Go to Admin → Manage Questions
2. Select Subject, Class, and Term
3. Click "Load Questions"
4. Questions appear in a list

### To Edit a Question:
1. Load questions first
2. Click the edit icon (pencil) on the question
3. Modify the question text or options
4. Select the correct answer
5. Click "Save Changes"

### To Delete a Question:
1. Load questions first
2. Click the delete icon (trash) on the question
3. Confirm deletion
4. Question is removed

### To Delete All Questions:
1. Load questions first
2. Click "Delete All Questions" button (red button at top)
3. Confirm deletion
4. All questions for that subject/class/term are removed

## API Endpoints

### GET /admin/questions
- Renders the question management page
- Returns HTML template

### GET /admin/questions/list
- Lists questions by filters
- Query params: subject_id, class_id, term_id
- Returns JSON with questions array

### PUT /admin/questions/<question_id>
- Updates a question
- Body: { question_text, options }
- Returns success/error

### DELETE /admin/questions/<question_id>
- Deletes a single question
- Returns success/error

### POST /admin/questions/delete-all
- Deletes all questions for filters
- Body: { subjectId, classId, termId }
- Returns deleted count

## Files Created

1. **templates/admin/questions.html**
   - Main question management page
   - Filter interface
   - Questions list
   - Edit modal

2. **static/js/admin/questions.js**
   - JavaScript for question management
   - AJAX calls for CRUD operations
   - Modal handling
   - Search functionality

3. **routes/admin_action_routes.py** (updated)
   - Added question management routes
   - List, update, delete endpoints

4. **templates/admin/base.html** (updated)
   - Added "Manage Questions" link in sidebar

## Use Cases

### Scenario 1: Wrong Subject Questions
**Problem**: Uploaded Mathematics questions to English subject by mistake

**Solution**:
1. Go to Manage Questions
2. Select English, Class, Term
3. Click "Load Questions"
4. Verify these are the wrong questions
5. Click "Delete All Questions"
6. Confirm deletion
7. All wrong questions removed

### Scenario 2: Fix Typo in Question
**Problem**: Question has a spelling error

**Solution**:
1. Go to Manage Questions
2. Select Subject, Class, Term
3. Click "Load Questions"
4. Find the question with typo
5. Click edit icon
6. Fix the typo
7. Click "Save Changes"

### Scenario 3: Wrong Correct Answer
**Problem**: Marked wrong option as correct

**Solution**:
1. Load the questions
2. Find the question
3. Click edit icon
4. Select the correct option
5. Save changes

### Scenario 4: Remove Duplicate Questions
**Problem**: Same question uploaded twice

**Solution**:
1. Load the questions
2. Find the duplicate
3. Click delete icon on one copy
4. Confirm deletion

## Security

- All routes require admin authentication
- Confirmation dialogs for destructive actions
- Database transactions with rollback on error
- Cascade delete for options when question is deleted

## Benefits

1. **Easy Cleanup**: Quickly remove incorrectly uploaded questions
2. **Bulk Operations**: Delete all questions at once
3. **Quick Edits**: Fix typos without re-uploading
4. **Visual Verification**: See all questions before deleting
5. **Filtered View**: Only see questions for specific subject/class/term
6. **Search**: Find specific questions quickly

## Notes

- Questions are filtered by Subject, Class, AND Term
- All three filters must be selected to load questions
- Delete operations are permanent and cannot be undone
- Options are automatically deleted when a question is deleted (cascade)
- Search is client-side and filters the displayed questions
- Edit modal shows all options with current correct answer marked
