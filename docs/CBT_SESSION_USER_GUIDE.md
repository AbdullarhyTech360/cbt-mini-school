# CBT Session Persistence - User Guide

## For Students 👨‍🎓👩‍🎓

### What's New?

Your exam progress is now **automatically saved**! You'll never lose your work again, even if:
- Your internet disconnects
- Your browser crashes
- Your device runs out of battery
- You accidentally close the tab

### How to Use

#### Taking an Exam (Normal Flow)

1. **Start the Exam**
   - Click "Start Exam" from your dashboard
   - Read the instructions
   - Click "Begin"

2. **Answer Questions**
   - Select your answers as usual
   - Your progress saves automatically every 30 seconds
   - You'll see a small "Saved" message appear briefly

3. **Navigate Freely**
   - Use "Previous" and "Next" buttons
   - Click question numbers to jump around
   - All your answers are saved automatically

4. **Submit When Done**
   - Click "Submit Quiz" when finished
   - Confirm your submission
   - View your results

#### Resuming an Interrupted Exam

**Scenario**: Your internet disconnected or you closed the browser

1. **Return to the Exam**
   - Log back in to your account
   - Go to the exam page
   - You'll see a popup message

2. **Choose What to Do**
   
   **Option A: Resume Session** (Recommended)
   - Click "Resume Session"
   - You'll return to exactly where you left off
   - All your answers are still there
   - Timer shows remaining time
   
   **Option B: Start Fresh**
   - Click "Start Fresh"
   - Begin the exam from the beginning
   - Previous answers are discarded

3. **Continue the Exam**
   - Everything works the same
   - Your progress continues to save
   - Complete and submit as normal

### Visual Indicators

#### "Saved" Indicator
```
┌─────────────────────┐
│  ✓ Saved            │  ← Appears briefly after auto-save
└─────────────────────┘
```

#### Resume Modal
```
┌──────────────────────────────────────────┐
│  Resume Previous Session?                 │
│                                           │
│  We found a previous session for this     │
│  exam. You had answered 5 questions       │
│  with 20 minutes remaining. Would you     │
│  like to continue where you left off?     │
│                                           │
│  [Resume Session]  [Start Fresh]          │
└──────────────────────────────────────────┘
```

### Frequently Asked Questions

**Q: How often is my progress saved?**
A: Automatically every 30 seconds, plus immediately when you answer a question.

**Q: What if I want to change an answer after it's saved?**
A: No problem! Just select a different answer. The new answer will be saved.

**Q: Can I resume on a different device?**
A: Yes! As long as you log in with the same account, you can resume from any device.

**Q: What if I don't want to resume?**
A: Click "Start Fresh" when the resume modal appears. Your old session will be discarded.

**Q: How long can I take a break?**
A: Your session is saved indefinitely, but remember the exam timer continues from where you left off.

**Q: What happens if the timer runs out while I'm away?**
A: When you resume, if time has run out, the exam will auto-submit with your saved answers.

**Q: Can I see my saved progress?**
A: Yes! When you resume, you'll see all your previously answered questions marked.

**Q: Is my data secure?**
A: Yes! Your session data is encrypted and only accessible to you and authorized administrators.

---

## For Teachers 👨‍🏫👩‍🏫

### What This Means for You

Students can now:
- Resume exams after technical issues
- Take breaks during long exams (if allowed)
- Not lose progress due to network problems

### Benefits

✅ **Fewer Complaints**: Students won't lose work due to technical issues
✅ **Fairer Testing**: Technical problems don't affect scores
✅ **Better Data**: Complete session tracking for all exams
✅ **Less Stress**: Students can focus on the exam, not technical issues

### What You Should Know

1. **Automatic Process**: No action required from you
2. **Transparent**: Students see clear messages about saving/resuming
3. **Secure**: Only the student can access their session
4. **Tracked**: All session activity is logged

### Monitoring Student Sessions

You can view active exam sessions:

1. Log in as admin
2. Go to **Admin Dashboard**
3. Click **"Exam Sessions"** in the menu
4. See real-time list of students taking exams

**What You'll See:**
- Student name
- Exam name
- Current question number
- Number of answered questions
- Time remaining
- Last activity timestamp

---

## For Administrators 👨‍💼👩‍💼

### Admin Dashboard

Access: `/admin/exam-sessions`

#### Features

1. **Active Sessions View**
   - See all students currently taking exams
   - Real-time progress tracking
   - Last activity timestamps
   - Time remaining for each student

2. **Statistics**
   - Total active sessions
   - Completed sessions today
   - System status

3. **Auto-Refresh**
   - Page refreshes every 30 seconds
   - Always shows current data

#### Use Cases

**During Exam Period:**
- Monitor how many students are taking exams
- Check if students are progressing
- Identify stuck or inactive sessions

**After Technical Issues:**
- Verify students can resume
- Check session data integrity
- Confirm progress was saved

**For Reporting:**
- Track exam completion rates
- Analyze session durations
- Identify patterns

### Session Management

#### View Session Details
```python
from models.exam_session import ExamSession

# Get a student's session
session = ExamSession.query.filter_by(
    student_id='student_id',
    exam_id='exam_id',
    is_active=True
).first()

# print(f"Progress: {session.current_question_index + 1}")
# print(f"Answers: {len(session.get_answers())}")
# print(f"Time left: {session.time_remaining // 60} minutes")
```

#### Manually Mark Session Complete
```python
session.is_active = False
session.is_completed = True
session.completed_at = datetime.utcnow()
db.session.commit()
```

#### Clean Old Sessions
```python
from datetime import datetime, timedelta

# Find old completed sessions
old_date = datetime.utcnow() - timedelta(days=30)
old_sessions = ExamSession.query.filter(
    ExamSession.is_completed == True,
    ExamSession.completed_at < old_date
).all()

# Archive or delete as needed
```

### Troubleshooting

#### Student Can't Resume

**Check:**
1. Is the session marked as active?
   ```python
   session = ExamSession.query.filter_by(
       student_id='student_id',
       exam_id='exam_id'
   ).first()
   # print(f"Active: {session.is_active}")
   ```

2. Is the student logged in with the correct account?

3. Does the exam ID match?

**Fix:**
```python
# Reactivate session if needed
session.is_active = True
db.session.commit()
```

#### Session Data Corrupted

**Check:**
```python
# Verify session data
# print(f"Answers: {session.get_answers()}")
# print(f"Question order: {session.get_question_order()}")
```

**Fix:**
```python
# Reset session if needed
session.set_answers({})
session.current_question_index = 0
db.session.commit()
```

### Best Practices

1. **Regular Monitoring**
   - Check active sessions during exam periods
   - Review completed sessions for anomalies
   - Monitor session durations

2. **Data Cleanup**
   - Archive old completed sessions monthly
   - Keep active sessions for current term
   - Backup session data before cleanup

3. **Student Communication**
   - Inform students about the feature
   - Provide this guide to students
   - Address concerns promptly

4. **Technical Support**
   - Have this guide ready for support staff
   - Document common issues and solutions
   - Keep session data for troubleshooting

### Security Considerations

✅ **Access Control**: Students can only access their own sessions
✅ **Data Encryption**: Session data is stored securely
✅ **Audit Trail**: All session activity is timestamped
✅ **Admin Only**: Monitoring dashboard requires admin role

### Reporting

#### Generate Session Report
```python
from models.exam_session import ExamSession
from datetime import datetime, timedelta

# Sessions in last 7 days
week_ago = datetime.utcnow() - timedelta(days=7)
recent_sessions = ExamSession.query.filter(
    ExamSession.created_at >= week_ago
).all()

# Calculate statistics
total = len(recent_sessions)
completed = sum(1 for s in recent_sessions if s.is_completed)
active = sum(1 for s in recent_sessions if s.is_active)

# print(f"Total sessions: {total}")
# print(f"Completed: {completed}")
# print(f"Active: {active}")
# print(f"Completion rate: {completed/total*100:.1f}%")
```

---

## Quick Reference

### For Students
- ✅ Progress saves automatically
- ✅ Resume anytime from any device
- ✅ Choose to resume or start fresh
- ✅ All answers preserved

### For Teachers
- ✅ No action required
- ✅ Monitor active sessions
- ✅ Fairer testing environment
- ✅ Fewer technical complaints

### For Admins
- ✅ Real-time monitoring dashboard
- ✅ Session management tools
- ✅ Comprehensive logging
- ✅ Security built-in

---

## Support

If you need help:
1. Check this guide first
2. Review the FAQ section
3. Contact your system administrator
4. Check the technical documentation

## Feedback

We'd love to hear your experience with this feature!
- What works well?
- What could be improved?
- Any issues encountered?

---

**Enjoy stress-free exam taking!** 🎓✨
