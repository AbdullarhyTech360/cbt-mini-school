# Debug Guide - Score Display Issue

## Issue
Confirmation modal showing score as `0/20` when actual score is different.

## Root Cause
The score was being stored as `null` in the database or not properly converted to a number in JavaScript, causing it to default to `0`.

## Fixes Applied

### 1. Backend (routes/admin_action_routes.py)
**Changed**: API endpoint now ensures scores are proper numbers
```python
# Before
'score': record.score,  # Could be None

# After
score = float(record.score) if record.score is not None else 0.0
'score': score,  # Always a number
```

### 2. Frontend (static/js/admin/exams.js)
**Changed**: Properly parse scores as numbers from API and dataset

#### When loading exams:
```javascript
// Before
option.dataset.score = exam.score || 0;

// After
const score = parseFloat(exam.score) || 0;
option.dataset.score = score;
```

#### When selecting exam:
```javascript
// Before
score: selectedOption.dataset.score,  // String from dataset

// After
const score = parseFloat(selectedOption.dataset.score) || 0;
score: score,  // Proper number
```

## Debug Logging Added

### Console Logs to Check:
1. **API Response**: `console.log('API Response:', result)`
   - Check if scores are coming from API correctly
   
2. **Exams Data**: `console.log('Exams data:', result.exams)`
   - See the actual exam objects with scores
   
3. **Selected Exam**: `console.log('Selected exam dataset:', {...})`
   - Shows original dataset values and parsed numbers

## How to Debug

### Step 1: Open Browser Console (F12)
Navigate to Console tab

### Step 2: Select a Student
Watch for these logs:
```
API Response: {success: true, exams: Array(3)}
Exams data: [{exam_id: "...", score: 15, max_score: 20, ...}, ...]
```

**Check**:
- Is `score` a number or null?
- Is `max_score` correct?

### Step 3: Select an Exam
Watch for this log:
```
Selected exam dataset: {
  score: "15",           // String from dataset
  maxScore: "20",        // String from dataset
  parsedScore: 15,       // Parsed number
  parsedMaxScore: 20     // Parsed number
}
```

**Check**:
- Are dataset values strings?
- Are parsed values proper numbers?
- Do they match the API response?

### Step 4: Check Confirmation Modal
The modal should now show:
```
"...delete their score of 15/20..."
```

## Common Issues & Solutions

### Issue 1: Score still showing as 0
**Possible Causes**:
- Score is actually 0 in database
- Student hasn't been graded yet
- Score column is null

**Solution**:
1. Check database: `SELECT * FROM student_exam WHERE student_id = '...' AND exam_id = '...'`
2. Verify score column has a value
3. If null, the student may not have been graded

### Issue 2: Score showing as NaN
**Possible Causes**:
- Score is not a valid number
- Parsing failed

**Solution**:
1. Check console logs for the actual value
2. Verify API is returning valid numbers
3. Check for string values like "N/A" or "null"

### Issue 3: Score correct in dropdown but wrong in modal
**Possible Causes**:
- Dataset not being read correctly
- selectedExamData not updated properly

**Solution**:
1. Check console log for "Selected exam dataset"
2. Verify parsedScore matches the dropdown display
3. Check if selectedExamData.score is correct

## Database Check

### Check if score exists:
```sql
SELECT 
    se.student_id,
    se.exam_id,
    se.score,
    se.completed_at,
    e.name as exam_name,
    e.max_score
FROM student_exam se
JOIN exams e ON se.exam_id = e.id
WHERE se.student_id = 'STUDENT_ID_HERE';
```

### Expected Result:
```
student_id | exam_id | score | completed_at        | exam_name | max_score
-----------|---------|-------|---------------------|-----------|----------
abc123     | xyz789  | 15.0  | 2025-11-20 14:30:00 | Math-Test | 20.0
```

### If score is NULL:
The student completed the exam but wasn't graded. This could happen if:
1. Exam was submitted without calculating score
2. Score calculation failed
3. Manual grading required but not done

## Testing Steps

### Test 1: Student with Score
1. Select a student who has completed exams
2. Open browser console
3. Select an exam
4. Check console logs
5. Verify score in dropdown: "Math-Test (Score: 15/20)"
6. Click Reset Exam
7. Verify modal shows: "...score of 15/20..."

### Test 2: Student with Zero Score
1. Select a student who scored 0
2. Verify dropdown shows: "Math-Test (Score: 0/20)"
3. Verify modal shows: "...score of 0/20..."
4. This is correct if they actually scored 0

### Test 3: Student with Null Score
1. If score is null in database
2. System should show: "Score: 0/20"
3. This is expected behavior (null = not graded = 0)

## Expected Behavior

### Scenario 1: Graded Exam
- Database: `score = 15.0`
- Dropdown: "Math-Test (Score: 15/20)"
- Details Panel: "Score: 15/20"
- Modal: "...score of 15/20..."

### Scenario 2: Ungraded Exam
- Database: `score = NULL`
- Dropdown: "Math-Test (Score: 0/20)"
- Details Panel: "Score: 0/20"
- Modal: "...score of 0/20..."

### Scenario 3: Zero Score
- Database: `score = 0.0`
- Dropdown: "Math-Test (Score: 0/20)"
- Details Panel: "Score: 0/20"
- Modal: "...score of 0/20..."

## Verification Checklist

After fixes:
- [ ] API returns proper number for score
- [ ] Dropdown displays correct score
- [ ] Details panel shows correct score
- [ ] Confirmation modal shows correct score
- [ ] Console logs show proper values
- [ ] No NaN or undefined values
- [ ] Scores match database values

## If Issue Persists

1. **Clear browser cache**: Ctrl+Shift+Delete
2. **Hard refresh**: Ctrl+F5
3. **Check browser console** for errors
4. **Verify database** has correct scores
5. **Check API response** in Network tab
6. **Review console logs** for debug info

## Contact Support

If the issue continues:
1. Take screenshot of browser console
2. Note the student ID and exam ID
3. Check database values
4. Provide all debug logs
5. Describe expected vs actual behavior

---

**Fix Version**: 1.1
**Date**: November 20, 2025
**Status**: ✅ Fixed and Ready for Testing
