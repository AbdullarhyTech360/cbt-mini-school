# CBT Session Persistence - Quick Start Guide

## What's New? 🎉

Your CBT system now has **automatic progress saving**! Students will never lose their exam progress again, even if:
- Their internet connection drops
- They accidentally close the browser
- Their device runs out of battery
- The page refreshes

## How It Works

### For Students

1. **Taking an Exam**
   - Start the exam as usual
   - Answer questions normally
   - Progress is saved automatically every 30 seconds
   - A small "Saved" indicator appears briefly when progress is saved

2. **If Something Goes Wrong**
   - Close the browser (accidentally or on purpose)
   - Come back to the exam page
   - You'll see a message: "Resume Previous Session?"
   - Click "Resume Session" to continue where you left off
   - OR click "Start Fresh" to begin again

3. **What Gets Saved**
   - All your answers
   - Which question you were on
   - How much time is left
   - The order of questions (so you see the same questions)

### For Administrators

**No configuration needed!** The feature is already active.

## Testing the Feature

### Test Scenario 1: Network Interruption
1. Start an exam as a student
2. Answer a few questions
3. Wait for the "Saved" indicator (or wait 30 seconds)
4. Close the browser completely
5. Open the browser and go back to the exam
6. You should see the "Resume Previous Session?" modal
7. Click "Resume Session"
8. Verify all answers are still there

### Test Scenario 2: Page Refresh
1. Start an exam
2. Answer some questions
3. Refresh the page (F5 or Ctrl+R)
4. You should see the resume modal
5. Resume and verify progress is restored

### Test Scenario 3: Time Preservation
1. Start an exam with 30 minutes
2. Answer questions for 5 minutes
3. Close the browser
4. Return to the exam
5. Resume the session
6. Verify the timer shows approximately 25 minutes remaining

## Files Changed/Added

### New Files
- `models/exam_session.py` - Database model for sessions
- `static/js/student/test_with_session.js` - Enhanced JavaScript with auto-save
- `migrations/add_exam_sessions_table.py` - Database migration
- `CBT_SESSION_PERSISTENCE.md` - Full documentation
- `CBT_SESSION_QUICK_START.md` - This file

### Modified Files
- `models/__init__.py` - Added ExamSession import
- `routes/student_routes.py` - Added session management endpoints
- `templates/student/cbt_test.html` - Updated to use new JavaScript

## API Endpoints Added

1. **POST** `/student/exam/<exam_id>/session/save`
   - Saves current progress
   - Called automatically

2. **GET** `/student/exam/<exam_id>/session/restore`
   - Checks for existing session
   - Returns session data if found

3. **POST** `/student/exam/<exam_id>/session/complete`
   - Marks session as completed
   - Called when exam is submitted

## Database Table Added

**Table:** `exam_sessions`

Key columns:
- `student_id` - Who is taking the exam
- `exam_id` - Which exam
- `current_question_index` - Current position
- `time_remaining` - Seconds left
- `answers` - JSON of all answers
- `question_order` - JSON of question IDs
- `is_active` - Is session ongoing?
- `is_completed` - Was exam submitted?

## Monitoring Sessions

You can query active sessions:

```python
from models.exam_session import ExamSession

# Get all active sessions
active_sessions = ExamSession.query.filter_by(is_active=True).all()

# Get sessions for a specific exam
exam_sessions = ExamSession.query.filter_by(exam_id='exam_id_here').all()

# Get a student's active session
student_session = ExamSession.query.filter_by(
    student_id='student_id_here',
    is_active=True
).first()
```

## Troubleshooting

### "Resume Session" not appearing
- Make sure you answered at least one question before closing
- Check that 30 seconds passed (or an answer was saved)
- Verify the student is logged in with the same account

### Progress not saving
- Check browser console for errors (F12)
- Verify network connectivity
- Ensure the database migration ran successfully

### Old sessions interfering
Sessions are automatically managed. If needed, you can manually mark old sessions as inactive:

```python
from models.exam_session import ExamSession
from models import db

# Mark all old sessions for a student as inactive
old_sessions = ExamSession.query.filter_by(
    student_id='student_id_here',
    is_active=True
).all()

for session in old_sessions:
    session.is_active = False
    
db.session.commit()
```

## Performance Notes

- Auto-save runs every 30 seconds (configurable in JavaScript)
- Saves are asynchronous and don't block the UI
- Minimal database impact (one row per exam session)
- JSON fields keep the database lean

## Next Steps

1. ✅ Migration completed
2. ✅ Feature is active
3. 🧪 Test with a demo student account
4. 📢 Inform students about the new feature
5. 📊 Monitor session data for insights

## Benefits Summary

✅ **No more lost progress**
✅ **Better student experience**
✅ **Reduced support requests**
✅ **Fair testing environment**
✅ **Automatic and transparent**
✅ **Works offline (saves when connection returns)**

---

**You're all set!** The CBT session persistence feature is now active and protecting your students' exam progress.
