# Report Route Fix

## Issue Description

The application was showing 404 errors in the logs due to incorrect API endpoint calls:

```
127.0.0.1 - - [17/Dec/2025 22:56:55] "GET /reports/api/report-data/9b2a09ad-94a4-414b-ab21-b309c960c137?term_id=32fb1eec-e0c0-4ed4-a269-97ee1157546b&class_id=8e26914b-d0de-4f36-8ff9-b90ed7d62b29&config_id=87301835-26e9-472f-a0dd-0b4e03d7f5e7 HTTP/1.1" 404 -
```

## Root Cause

The frontend JavaScript code in `static/js/admin/generate_report.js` was calling a non-existent API endpoint:
- Incorrect endpoint: `/reports/api/report-data/`
- Correct endpoint: `/reports/api/student-report/`

## Fix Applied

Updated the JavaScript file to use the correct API endpoint:

1. Line 438: Changed `/reports/api/report-data/${studentId}` to `/reports/api/student-report/${studentId}`
2. Line 603: Changed `/reports/api/report-data/${student.id}` to `/reports/api/student-report/${student.id}`

## Verification

After the fix, the endpoints now correctly map to the existing Flask route:
```python
@report_bp.route("/api/student-report/<student_id>")
@login_required
def get_student_report(student_id):
```

## Additional Notes

The preview functionality continues to work correctly as it was already pointing to the right routes:
- `/reports/preview/<student_id>` now uses the improved template
- All other report generation functionality remains intact