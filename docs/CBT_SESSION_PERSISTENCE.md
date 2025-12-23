# CBT Session Persistence Feature

## Overview

The CBT (Computer-Based Testing) Session Persistence feature ensures that students never lose their exam progress, even if they experience network issues, accidentally close their browser, or their device runs out of battery. The system automatically saves progress and allows students to resume exactly where they left off.

## Key Features

### 1. **Automatic Progress Saving**
- Progress is saved every 30 seconds automatically
- Progress is saved immediately when a student answers a question
- Progress is saved before the page unloads (browser close, refresh, etc.)

### 2. **Session Restoration**
When a student returns to an exam they were taking:
- The system detects if there's an active session
- Shows a friendly modal asking if they want to resume
- Restores their exact state including:
  - All previously answered questions
  - Current question position
  - Remaining time
  - Question order (so they see the same randomized questions)

### 3. **What Gets Saved**
- **Current Question Index**: Which question they were on
- **Time Remaining**: Exact seconds left on the timer
- **Student Answers**: All answers they've selected
- **Question Order**: The randomized order of questions (ensures consistency)
- **Session Timestamps**: When they started, last activity, etc.

### 4. **Visual Feedback**
- Small "Saved" indicator appears briefly after auto-save
- Console logs for debugging
- Clear modal dialogs for session restoration

## Technical Implementation

### Database Model: `ExamSession`

Located in `models/exam_session.py`, this model tracks:

```python
- id: Unique session identifier
- student_id: Which student owns this session
- exam_id: Which exam this session is for
- current_question_index: Current position in the exam
- time_remaining: Seconds left on the timer
- answers: JSON object of student answers
- question_order: JSON array of question IDs
- is_active: Whether the session is still ongoing
- is_completed: Whether the exam was submitted
- timestamps: started_at, last_activity, completed_at
```

### API Endpoints

#### 1. Save Progress
**POST** `/student/exam/<exam_id>/session/save`

Saves the current exam state. Called automatically every 30 seconds and on answer changes.

Request body:
```json
{
  "current_question_index": 5,
  "time_remaining": 1200,
  "answers": {
    "question_id_1": "option_id_1",
    "question_id_2": "option_id_2"
  },
  "question_order": ["question_id_1", "question_id_2", "question_id_3"]
}
```

#### 2. Restore Session
**GET** `/student/exam/<exam_id>/session/restore`

Checks if there's an active session for the student and returns it.

Response:
```json
{
  "success": true,
  "has_session": true,
  "session": {
    "current_question_index": 5,
    "time_remaining": 1200,
    "answers": {...},
    "question_order": [...]
  }
}
```

#### 3. Complete Session
**POST** `/student/exam/<exam_id>/session/complete`

Marks the session as completed when the exam is submitted.

### Frontend Implementation

The enhanced JavaScript file (`static/js/student/test_with_session.js`) includes:

1. **Session Check on Load**
   - Checks for existing session before loading questions
   - Shows resume modal if session exists
   - Restores state if user chooses to resume

2. **Auto-Save Logic**
   ```javascript
   // Save every 30 seconds
   setInterval(() => saveProgress(), 30000);
   
   // Save on answer change
   radioInput.addEventListener('change', () => saveProgress());
   
   // Save before page unload
   window.addEventListener('beforeunload', () => saveProgress());
   ```

3. **Session Restoration**
   - Fetches questions first
   - Reorders questions to match saved order
   - Restores answers, time, and position
   - Updates UI to reflect restored state

## Installation & Setup

### Step 1: Run the Migration

```bash
python migrations/add_exam_sessions_table.py
```

This creates the `exam_sessions` table in your database.

### Step 2: Verify Installation

The system is now ready to use! No additional configuration needed.

## User Experience

### Starting a New Exam
1. Student clicks "Start Exam"
2. System checks for existing session
3. If no session exists, exam starts normally
4. Progress begins auto-saving immediately

### Resuming an Exam
1. Student returns to exam page
2. System detects active session
3. Modal appears: "Resume Previous Session?"
   - Shows: number of answered questions
   - Shows: time remaining
4. Student chooses:
   - **Resume Session**: Continues from where they left off
   - **Start Fresh**: Begins a new session (old session is discarded)

### During the Exam
- Small "Saved" indicator appears periodically (bottom-right)
- No interruption to the exam experience
- Student can close browser and return anytime

### Network Issues
If network connection is lost:
- Last saved state is preserved in database
- When connection returns, student can resume
- No data loss (as long as last save completed)

## Benefits

### For Students
- **Peace of Mind**: Never lose progress
- **Flexibility**: Can take breaks if needed
- **Reliability**: Network issues won't ruin their exam
- **Fair Testing**: Technical issues don't affect their score

### For Administrators
- **Reduced Support**: Fewer complaints about lost progress
- **Better Data**: Complete session tracking
- **Audit Trail**: Can see when students started/stopped
- **Reliability**: More robust exam system

## Technical Notes

### Session Lifecycle

1. **Created**: When student first answers a question or auto-save triggers
2. **Active**: While student is taking the exam (`is_active=True`)
3. **Completed**: When exam is submitted (`is_completed=True`, `is_active=False`)

### Session Cleanup

Sessions remain in the database for audit purposes. You may want to:
- Archive old completed sessions periodically
- Set up automatic cleanup for sessions older than X days
- Keep sessions for reporting and analytics

### Performance Considerations

- Auto-save is throttled to every 30 seconds to avoid excessive database writes
- Saves are asynchronous and don't block the UI
- Question order is stored once, not on every save
- JSON fields are used for efficient storage of answers

### Security

- Sessions are tied to student_id from the authenticated session
- Students can only access their own sessions
- Session data is validated before restoration
- Completed sessions cannot be modified

## Troubleshooting

### Session Not Restoring
- Check browser console for errors
- Verify student is logged in
- Ensure exam_id matches
- Check if session is marked as completed

### Progress Not Saving
- Check network connectivity
- Verify API endpoints are accessible
- Check browser console for errors
- Ensure database is writable

### Multiple Sessions
- System uses the most recent active session
- Old sessions are automatically marked inactive
- Only one active session per student per exam

## Future Enhancements

Possible improvements:
- Admin dashboard to view active sessions
- Session timeout after X hours of inactivity
- Offline mode with local storage fallback
- Session analytics and reporting
- Automatic session recovery on network reconnect

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify the migration ran successfully
3. Check database logs
4. Review the session data in the database

## Conclusion

The CBT Session Persistence feature provides a robust, user-friendly solution for maintaining exam progress. It's designed to be transparent to students while providing powerful recovery capabilities when needed.
