# Quick Start: Dashboard Permissions

## For Administrators

### Accessing Permission Settings
1. Login as admin
2. Navigate to **Admin > Settings**
3. Scroll to **"User Permissions & Privileges"** section
4. Look for the new dashboard permission toggles

### Available Controls
- **Students can view dashboard** - Enable/disable student dashboard access
- **Teachers can view dashboard** - Enable/disable teacher dashboard access
- **Staff can view dashboard** - Enable/disable staff dashboard access

### Default State
All permissions are **ENABLED** by default. Users can access their dashboards normally.

### Disabling Dashboard Access
1. Click the toggle switch to turn it OFF (gray)
2. Changes save automatically
3. Users of that role will be redirected to login when trying to access dashboard
4. Error message: "Dashboard access is currently disabled for [role]. Please contact the administrator."

### Re-enabling Dashboard Access
1. Click the toggle switch to turn it ON (blue/primary color)
2. Changes save automatically
3. Users can immediately access their dashboards again

## For Students

### What Changed?
- You now only see exams scheduled for **your class**
- You only see exams for **subjects you're enrolled in**
- Upcoming exams list is more relevant to you

### If Dashboard is Disabled
- You'll see an error message when trying to access your dashboard
- Contact your school administrator
- You can still login, but dashboard access is temporarily restricted

## For Teachers/Staff

### What Changed?
- Admin can now control your dashboard access
- By default, you have full access

### If Dashboard is Disabled
- You'll see an error message when trying to access your dashboard
- Contact your school administrator
- You can still login, but dashboard access is temporarily restricted

## Technical Notes

### Permission Names (for developers)
```
students_can_view_dashboard
teachers_can_view_dashboard
staff_can_view_dashboard
```

### Checking Permission Status (Python)
```python
from models import is_permission_active

# Check if students can view dashboard
can_view = is_permission_active("students_can_view_dashboard")
```

### Login Response (JavaScript)
```javascript
// Login response now includes:
{
  "success": true,
  "role": "student",
  "user_id": "...",
  "can_view_dashboard": true,  // NEW FIELD
  "available_exams": [...]
}
```

## Troubleshooting

### Problem: Permission toggle doesn't save
**Solution:** Check browser console for errors. Ensure you're logged in as admin.

### Problem: Students still see all exams
**Solution:** 
1. Verify student is enrolled in subjects
2. Check exam class_room_id matches student's class
3. Verify exam is active and not finished

### Problem: Dashboard still accessible after disabling
**Solution:** 
1. Refresh the page
2. Clear browser cache
3. Logout and login again

### Problem: Permission not found in database
**Solution:** Run the migration:
```bash
python run_dashboard_permissions_migration.py
```

## Support

For issues or questions:
1. Check `DASHBOARD_PERMISSIONS_FEATURE.md` for detailed documentation
2. Check `IMPLEMENTATION_SUMMARY.md` for technical details
3. Run `verify_dashboard_permissions.py` to check permission status
