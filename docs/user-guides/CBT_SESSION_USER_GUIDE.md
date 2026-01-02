# CBT Session Persistence - User Guide

## For Students 👨‍🎓👩‍🎓

### What's New?

Your exam progress is now **automatically saved**! You'll never lose your work again, even if:
- Your internet disconnects
- Your browser crashes
- Your computer restarts
- You accidentally close the tab

### How It Works

1. **Auto-Save**: Your answers are saved every 30 seconds automatically
2. **Manual Save**: Click the "Save Progress" button anytime to save immediately
3. **Resume**: If you leave and come back, you'll continue exactly where you left off
4. **Final Submit**: When you're ready, click "Submit Exam" to finalize your answers

### Step-by-Step Guide

#### Starting an Exam

1. Log in to your student account
2. Navigate to "My Exams"
3. Click on the exam you want to take
4. Read the instructions carefully
5. Click "Start Exam" when ready

#### During the Exam

1. **Answer Questions**: Select your answer for each question
2. **Navigate**: Use the "Previous" and "Next" buttons to move between questions
3. **Review**: Click "Review" to mark questions you want to check later
4. **Save**: Your progress is saved automatically, but you can click "Save Progress" anytime
5. **Timer**: Keep an eye on the timer at the top of the page

#### If Something Goes Wrong

1. **Internet Disconnects**: Don't worry! Your answers are saved locally. Reconnect and continue.
2. **Browser Crashes**: Simply reopen your browser, log back in, and continue from where you left off.
3. **Computer Restarts**: Your progress is saved on the server. Just log back in and continue.

#### Finishing the Exam

1. **Review**: Check all your answers, especially marked questions
2. **Final Save**: Click "Save Progress" one last time
3. **Submit**: Click "Submit Exam" when you're completely done
4. **Confirmation**: You'll see a confirmation message with your submission details

## For Teachers 👩‍🏫👨‍🏫

### Monitoring Student Progress

1. **Real-time Tracking**: See which students are currently taking exams
2. **Progress Monitoring**: Check if students are saving their work regularly
3. **Session Details**: View when students started, last saved, and their current question

### Managing Exam Sessions

1. **Active Sessions**: View all currently active exam sessions
2. **Session Details**: See detailed information about each session
3. **Session History**: Access past session records for analysis

### Troubleshooting Common Issues

#### Student Can't Resume Exam

1. Check if the exam is still active
2. Verify the student's account status
3. Check the session logs for any errors

#### Progress Not Saving

1. Check the student's internet connection
2. Verify the server is responding correctly
3. Check browser console for JavaScript errors

## For Administrators 👩‍💼👨‍💼

### System Configuration

1. **Save Interval**: Configure how often answers are auto-saved (default: 30 seconds)
2. **Session Timeout**: Set how long inactive sessions are kept (default: 24 hours)
3. **Storage Limits**: Configure maximum storage for session data

### Monitoring System Health

1. **Active Sessions**: Monitor the number of active exam sessions
2. **Storage Usage**: Track how much space session data is using
3. **Error Logs**: Review system errors related to session management

### Maintenance Tasks

1. **Cleanup Old Sessions**: Regularly clean up expired session data
2. **Backup Important Data**: Ensure session data is backed up regularly
3. **Performance Monitoring**: Check system performance during peak exam times

## Technical Details

### Data Storage

- **Local Storage**: Temporary storage in the browser for immediate access
- **Server Storage**: Permanent storage on the server for recovery
- **Sync Mechanism**: Automatic synchronization between local and server storage

### Security Features

- **Session Encryption**: All session data is encrypted
- **Secure Transmission**: Data is transmitted over HTTPS
- **Access Control**: Only authorized users can access their session data

### Performance Optimization

- **Incremental Saves**: Only changes are transmitted, not entire answers
- **Compression**: Data is compressed to reduce bandwidth usage
- **Background Sync**: Saving happens in the background without interrupting the user

## FAQ

### For Students

**Q: What happens if I run out of time?**
A: The system will automatically submit whatever answers you have saved.

**Q: Can I take an exam on multiple devices?**
A: No, each exam session is tied to a single device and browser.

**Q: Can I change my answers after submitting?**
A: No, once an exam is submitted, answers cannot be changed.

### For Teachers

**Q: Can I extend the time for a student's exam?**
A: Yes, you can extend the time for individual students if needed.

**Q: How do I know if a student is cheating?**
A: The system tracks answer patterns and timing, but final determination is up to the teacher.

### For Administrators

**Q: How much storage is needed for session data?**
A: It depends on the number of students and exams, but typically 1-2GB per 1000 students per term.

**Q: Can I customize the save interval?**
A: Yes, the save interval can be configured in the system settings.

## Best Practices

### For Students

1. **Save Regularly**: Don't rely solely on auto-save
2. **Check Connection**: Ensure you have a stable internet connection
3. **Use Supported Browsers**: Use Chrome, Firefox, or Safari for best results

### For Teachers

1. **Prepare Students**: Explain the new save system before exams
2. **Monitor Sessions**: Keep an eye on active sessions during exams
3. **Have a Backup Plan**: Know what to do if technical issues arise

### For Administrators

1. **Regular Maintenance**: Schedule regular cleanup of old session data
2. **Monitor Performance**: Keep an eye on system performance during peak times
3. **Plan for Growth**: Ensure the system can handle increased usage
