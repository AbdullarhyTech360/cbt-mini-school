# Exam Status Management Feature

## Overview
Added functionality to manage exam visibility and lifecycle with "Activate/Deactivate" toggle and "Finish" button.

## Features Implemented

### 1. Database Changes
**New Fields Added to Exam Model:**
- `is_active` (Boolean, default=True): Controls whether students can see and access the exam
- `is_finished` (Boolean, default=False): Marks exam as completed/finished

**Migration:** `migrations/add_exam_status_fields.py`

### 2. Admin Interface Updates

**Exams Table (`templates/admin/exams.html`):**
- Added "Status" column showing:
  - Toggle switch for Active/Inactive (for non-finished exams)
  - "Finished" badge (for finished exams)
- Added "Finish" button in Actions column
- Finished exams show a gray "Finished" badge and cannot be toggled

**Visual Indicators:**
- Active exams: Green toggle switch
- Inactive exams: Gray toggle switch
- Finished exams: Gray badge with checkmark icon

### 3. API Endpoints

**Toggle Active Status:**
```
POST /admin/exam/<exam_id>/toggle-active
```
- Toggles the `is_active` status
- Returns updated status
- Only works for non-finished exams

**Finish Exam:**
```
POST /admin/exam/<exam_id>/finish
```
- Marks exam as finished (`is_finished = True`)
- Automatically deactivates the exam (`is_active = False`)
- Irreversible action
- Shows confirmation dialog before executing

### 4. Student Visibility Rules

**Students can only see exams that are:**
1. ✅ Active (`is_active = True`)
2. ✅ Not finished (`is_finished = False`)
3. ✅ Within their enrolled subjects (for regular students)
4. ✅ Not yet completed by them
5. ✅ Not ended (time_ended is None or in future)

**Demo users:**
- See all active, non-finished exams
- No subject enrollment restrictions

### 5. JavaScript Functionality

**File:** `static/js/admin/exams.js`

**Toggle Switch Handler:**
- Sends POST request to toggle endpoint
- Updates UI immediately
- Shows success/error alerts
- Reverts toggle on failure

**Finish Button Handler:**
- Shows confirmation modal
- Warns that action is irreversible
- Reloads page on success to update UI
- Shows error alert on failure

## Usage

### For Administrators:

**To Deactivate an Exam:**
1. Go to Admin → Exams
2. Find the exam in the table
3. Click the toggle switch in the Status column
4. Exam becomes invisible to students immediately

**To Reactivate an Exam:**
1. Click the toggle switch again
2. Exam becomes visible to students immediately

**To Finish an Exam:**
1. Click the "Finish" button in the Actions column
2. Confirm the action in the dialog
3. Exam is marked as finished and deactivated
4. Cannot be undone - exam will no longer appear in student dashboards

### For Students:

**Exam Visibility:**
- Only active, non-finished exams appear in dashboard
- Finished exams are completely hidden
- Inactive exams are completely hidden

## Files Modified

1. `models/exam.py` - Added is_active and is_finished fields
2. `migrations/add_exam_status_fields.py` - Database migration
3. `routes/admin_action_routes.py` - Added toggle and finish endpoints
4. `routes/dashboard.py` - Updated student exam filtering
5. `templates/admin/exams.html` - Added Status column and buttons
6. `static/js/admin/exams.js` - Added toggle and finish handlers

## Testing

### Test Cases:

1. **Toggle Active Status:**
   - ✅ Toggle exam from active to inactive
   - ✅ Verify students cannot see inactive exam
   - ✅ Toggle back to active
   - ✅ Verify students can see active exam again

2. **Finish Exam:**
   - ✅ Click finish button
   - ✅ Confirm action
   - ✅ Verify exam shows "Finished" badge
   - ✅ Verify toggle switch is removed
   - ✅ Verify students cannot see finished exam
   - ✅ Verify finish button is removed

3. **Student Dashboard:**
   - ✅ Only active, non-finished exams appear
   - ✅ Inactive exams are hidden
   - ✅ Finished exams are hidden

## Database Migration

To apply the migration:
```bash
python migrations/add_exam_status_fields.py
```

The migration:
- Adds `is_active` column (default TRUE)
- Adds `is_finished` column (default FALSE)
- All existing exams will be active and not finished by default

## Notes

- Finishing an exam is **irreversible** - there's no "unfinish" option
- Finished exams remain in the database for record-keeping
- Admins can still view finished exams in the exams table
- Students never see finished or inactive exams
- The toggle switch only appears for non-finished exams
- The finish button only appears for non-finished exams
