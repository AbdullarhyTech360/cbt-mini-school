# Dashboard Permissions & Exam Filtering Feature

## Overview
This feature adds granular control over dashboard access for different user roles and fixes exam filtering to ensure students only see exams scheduled for their class and subjects.

## Changes Made

### 1. Exam Filtering Fix (Login Page)
**File:** `routes/auth_routes.py`

**Problem:** Students were seeing all exams regardless of their class or enrolled subjects when checking user existence on the login page.

**Solution:** Updated the `/check_user` endpoint to filter exams by:
- Student's class (class_room_id)
- Student's enrolled subjects
- Exam date (upcoming only)
- Exam status (active and not finished)
- Demo users still see all exams (no restrictions)

### 2. Dashboard Visibility Permissions
**Files:** 
- `migrations/add_dashboard_permissions.py` (new)
- `routes/dashboard.py`
- `templates/admin/settings.html`
- `static/js/admin/settings.js`

**New Permissions Created:**
1. `students_can_view_dashboard` - Controls student dashboard access
2. `teachers_can_view_dashboard` - Controls teacher dashboard access
3. `staff_can_view_dashboard` - Controls staff dashboard access

**How It Works:**
- Admins can toggle these permissions from **Admin > Settings > User Permissions & Privileges**
- When disabled, users of that role will be redirected to login with an error message
- Admin dashboard access is always enabled (cannot be disabled)
- Permission checks happen at the route level before rendering the dashboard

### 3. Login Response Enhancement
**File:** `routes/auth_routes.py`

**Added:** `can_view_dashboard` field to login response
- Frontend can use this to show/hide dashboard navigation
- Provides immediate feedback about dashboard access status

## Usage

### For Administrators

1. **Access Settings:**
   - Navigate to Admin > Settings
   - Scroll to "User Permissions & Privileges" section

2. **Control Dashboard Access:**
   - Toggle "Students can view dashboard" to enable/disable student dashboard
   - Toggle "Teachers can view dashboard" to enable/disable teacher dashboard
   - Toggle "Staff can view dashboard" to enable/disable staff dashboard

3. **Default State:**
   - All dashboard permissions are enabled by default
   - Changes take effect immediately

### For Developers

**Running the Migration:**
```bash
python run_dashboard_permissions_migration.py
```

**Checking Permission Status:**
```python
from models import is_permission_active

# Check if students can view dashboard
can_view = is_permission_active("students_can_view_dashboard")
```

**Adding Permission Checks to Routes:**
```python
from models import is_permission_active
from flask import flash, redirect, url_for

@app.route("/some/dashboard")
def some_dashboard():
    can_view = is_permission_active("role_can_view_dashboard")
    if not can_view:
        flash("Dashboard access is disabled.", "error")
        return redirect(url_for("login"))
    # ... rest of route logic
```

## Database Schema

### Permission Table
```sql
permission_id: VARCHAR(36) PRIMARY KEY
permission_name: VARCHAR(20) NOT NULL
permission_description: VARCHAR(100) NOT NULL
is_active: BOOLEAN DEFAULT TRUE
created_for: VARCHAR(20) NOT NULL
permission_created_at: DATETIME
permission_updated_at: DATETIME
```

### New Permission Records
| Permission Name | Description | Created For | Default State |
|----------------|-------------|-------------|---------------|
| students_can_view_dashboard | Allow students to access their dashboard | student | Active |
| teachers_can_view_dashboard | Allow teachers to access their dashboard | teacher | Active |
| staff_can_view_dashboard | Allow staff to access their dashboard | staff | Active |

## Testing

### Test Dashboard Access Control
1. Login as admin
2. Go to Settings > User Permissions
3. Disable "Students can view dashboard"
4. Logout and login as a student
5. Verify: Student is redirected to login with error message
6. Re-enable the permission
7. Verify: Student can now access dashboard

### Test Exam Filtering
1. Create multiple exams for different classes
2. Login as a student from Class A
3. Verify: Only exams for Class A appear
4. Verify: Only exams for enrolled subjects appear
5. Login as demo user
6. Verify: All active exams appear (no filtering)

## Benefits

1. **Enhanced Security:** Admins can temporarily disable dashboard access during maintenance or system updates
2. **Flexible Control:** Different roles can have different access levels
3. **Better UX:** Students only see relevant exams (their class and subjects)
4. **Audit Trail:** Permission changes are logged with timestamps
5. **Demo Support:** Demo users maintain full access for testing purposes

## Future Enhancements

- Add time-based permission scheduling (e.g., disable dashboards during exam periods)
- Add class-specific dashboard permissions
- Add permission history/audit log
- Add bulk permission management
- Add email notifications when permissions change
