# Quick Test Guide - Exam Reset Feature

## Prerequisites
- Admin account logged in
- At least one student with completed exams
- Development server running

## Test Steps

### 1. Access the Reset Exam Feature
```
1. Navigate to: http://127.0.0.1:5000/admin/exams
2. Click on the "Reset Exams" tab
3. Verify the reset exam form is displayed
```

**Expected Result**: 
- Form with two dropdowns (Student and Exam)
- Reset button (disabled)
- Warning message visible
- Clear form button visible

### 2. Test Student Selection
```
1. Click on "Select Student" dropdown
2. Search for a student by typing
3. Select a student from the list
```

**Expected Result**:
- Exam dropdown shows "Loading exams..."
- Status message changes to "Loading completed exams..." (blue)
- After loading, exam dropdown is enabled
- Status shows "X completed exam(s) found" (green) OR "No completed exams" (yellow)

### 3. Test Exam Selection
```
1. Click on "Select Exam" dropdown
2. Review the list of completed exams with scores
3. Select an exam
```

**Expected Result**:
- Exam details panel appears showing:
  - Student name
  - Exam name
  - Score (e.g., 85/100)
  - Status (Completed)
- Reset button becomes enabled (red gradient)

### 4. Test Reset Confirmation
```
1. Click "Reset Exam" button
2. Review the confirmation modal
3. Read the warning message
```

**Expected Result**:
- Modal appears with:
  - Title: "Confirm Exam Reset"
  - Detailed message with student name, exam name, and score
  - Warning about permanent deletion
  - Two buttons: "Yes, Reset Exam" (red) and "Cancel" (gray)

### 5. Test Reset Cancellation
```
1. Click "Cancel" in the confirmation modal
```

**Expected Result**:
- Modal closes
- Form remains filled with selected data
- No changes made to database

### 6. Test Successful Reset
```
1. Click "Reset Exam" button again
2. Click "Yes, Reset Exam" in the modal
3. Wait for the operation to complete
```

**Expected Result**:
- Button shows "Resetting..." with spinner
- Success modal appears with message
- Form is cleared after clicking OK
- Student can now retake the exam

### 7. Test Clear Form
```
1. Select a student and exam
2. Click "Clear Form" button
```

**Expected Result**:
- All dropdowns reset to default
- Exam dropdown disabled
- Details panel hidden
- Reset button disabled
- Status message reset

### 8. Test Edge Cases

#### No Completed Exams
```
1. Select a student who hasn't completed any exams
```

**Expected Result**:
- Exam dropdown shows "No completed exams found"
- Status message: "This student has not completed any exams yet" (yellow)
- Reset button remains disabled

#### Network Error Simulation
```
1. Disconnect network (or stop server)
2. Try to select a student
```

**Expected Result**:
- Error message appears
- Status shows "Failed to load exams. Please try again." (red)
- User-friendly error modal

### 9. Test Responsive Design

#### Desktop View
```
1. View on desktop browser (≥768px width)
```

**Expected Result**:
- Two-column grid layout
- Side-by-side dropdowns
- Full-width details panel

#### Mobile View
```
1. Resize browser to mobile width (<768px)
2. Or use browser dev tools mobile emulation
```

**Expected Result**:
- Single-column layout
- Stacked form fields
- Full-width buttons
- Scrollable content

### 10. Test Dark Mode
```
1. Toggle dark mode in the application
2. Review all UI elements
```

**Expected Result**:
- All elements properly styled for dark mode
- Good contrast and readability
- Proper border and background colors

## Verification Checklist

After reset, verify:
- [ ] Student can access the exam again
- [ ] Previous score is removed from database
- [ ] Student's exam list shows exam as "Not Started"
- [ ] Exam appears in student's available exams
- [ ] No errors in browser console
- [ ] No errors in server logs

## Common Issues & Solutions

### Issue: Exam dropdown not loading
**Solution**: Check browser console for errors, verify API endpoint is working

### Issue: Reset button stays disabled
**Solution**: Ensure both student and exam are selected, check JavaScript console

### Issue: Modal not appearing
**Solution**: Verify modal.js is loaded before exams.js

### Issue: Form not clearing after reset
**Solution**: Check success callback in JavaScript, verify no console errors

## API Endpoints to Test

### Get Completed Exams
```bash
GET /admin/student/<student_id>/completed-exams
```

**Test with curl**:
```bash
curl -X GET "http://127.0.0.1:5000/admin/student/STUDENT_ID/completed-exams" \
  -H "Cookie: session=YOUR_SESSION_COOKIE"
```

### Reset Exam
```bash
POST /admin/exam/<exam_id>/<user_id>/reset
```

**Test with curl**:
```bash
curl -X POST "http://127.0.0.1:5000/admin/exam/EXAM_ID/USER_ID/reset" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_COOKIE"
```

## Performance Checks

- [ ] Student dropdown loads quickly (<1s)
- [ ] Exam loading completes in <2s
- [ ] Reset operation completes in <3s
- [ ] No memory leaks after multiple resets
- [ ] Smooth animations and transitions

## Security Checks

- [ ] Non-admin users cannot access the page
- [ ] Cannot reset exams for students not enrolled in subject
- [ ] Cannot reset exams that haven't been completed
- [ ] Proper authentication required for API calls
- [ ] No sensitive data exposed in client-side code

## Browser Compatibility

Test on:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

## Success Criteria

✅ All test steps pass without errors
✅ UI is responsive and user-friendly
✅ Data integrity maintained after reset
✅ Proper error handling for all scenarios
✅ Good performance across all operations
✅ Accessible and works in dark mode

## Troubleshooting

If tests fail:
1. Check browser console for JavaScript errors
2. Check server logs for Python errors
3. Verify database connections
4. Clear browser cache and reload
5. Check network tab for failed API calls
6. Verify all files are saved and server restarted
