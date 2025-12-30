# Verification Checklist for Report Config Fix

## Quick Verification Steps

### Step 1: Verify Frontend is Sending Config ID ✓
**What to check:** Browser Network tab

1. Open Admin → Generate Reports
2. Open Developer Tools (F12)
3. Go to Network tab
4. Select a Term, Class, and Config
5. Click "Load Students"
6. Click "Preview" on a student
7. Look for request to `/reports/api/preview`
8. Click on it and check the Request body

**Expected:** Should see:
```json
{
  "student_id": "...",
  "term_id": "...",
  "class_room_id": "...",
  "config_id": "..."
}
```

**If config_id is null/missing:** 
- Check that you selected a config in the dropdown
- Check generate_report.js line 183

---

### Step 2: Verify Backend is Receiving Config ID ✓
**What to check:** Server console logs

1. Start the server
2. Generate a report preview (as in Step 1)
3. Look at the server console output

**Expected:** Should see:
```
[DEBUG] Preview request - config_id: <some-id>, type: <class 'str'>
[DEBUG] Config found: True
[DEBUG] Config term_id: <id>, requested term_id: <id>, match: True
[DEBUG] Config class_room_id: <id>, requested class_room_id: <id>
[DEBUG] Active assessments from config: ['ca', 'exam']
[DEBUG] All assessment_type_dicts before filtering: ['ca', 'exam', 'cbt']
[DEBUG] Assessment types after filtering: ['ca', 'exam']
[DEBUG] Final assessment_types being returned: ['ca', 'exam']
```

**If config_id is None:**
- Frontend is not sending it
- Check Step 1

**If Config found: False:**
- Config ID doesn't exist in database
- Verify config was created and saved

**If Config term/class mismatch:**
- Config is for different term/class
- Create config for correct term/class

---

### Step 3: Verify Assessment Filtering is Working ✓
**What to check:** Server logs and report data

1. Create a config with ONLY "CA" and "Exam" checked
2. Uncheck "CBT"
3. Save the config
4. Generate a report with this config
5. Check server logs for:
   ```
   [DEBUG] Active assessments from config: ['ca', 'exam']
   [DEBUG] Assessment types after filtering: ['ca', 'exam']
   ```

**Expected:** 
- "CBT" should NOT be in the final list
- Report should only show CA and Exam columns

**If all assessments still showing:**
- Check that active_assessments is not empty
- Check filtering logic in report_generator.py lines 197-204

---

### Step 4: Verify Display Settings are Applied ✓
**What to check:** Report preview

1. Create a config with:
   - "Show Logo" = UNCHECKED
   - "Show Position" = UNCHECKED
2. Save the config
3. Generate a report with this config

**Expected:**
- Logo should NOT appear in the header
- Position should show as "N/A" instead of actual position

**If settings not applied:**
- Check display_settings in server logs
- Check report_generator.py lines 155-163

---

### Step 5: Run the Debug Test Script ✓
**What to do:**

```bash
python test_config_debug.py
```

**Expected output:**
```
Available Terms:
  - term-1: First Term (2024/2025)

Available Classes:
  - class-1: JSS 1A

Available Report Configs:
  - config-1: JSS 1A Config
    Term: term-1, Class: class-1
    Active Assessments: ['ca', 'exam']
    Display Settings: {'show_logo': True, ...}

Students in Class class-1:
  - student-1: John Doe
  - student-2: Jane Smith

============================================================
TEST 1: Preview WITHOUT Config
============================================================
✓ Report generated successfully

Assessment Types (3):
  - ca: Continuous Assessment
  - exam: Terminal Examination
  - cbt: Computer Based Test

...

============================================================
TEST 2: Preview WITH Config
============================================================
✓ Report generated successfully

Assessment Types (2):
  - ca: Continuous Assessment
  - exam: Terminal Examination

...

============================================================
COMPARISON
============================================================

Without Config: {'ca', 'exam', 'cbt'}
With Config: {'ca', 'exam'}

✓ SUCCESS: Config is being applied!
  Removed: {'cbt'}
  Added: set()
```

**If test shows "ISSUE: Config is NOT being applied!":**
- Assessment types are the same with or without config
- This means the filtering is not working
- Check server logs for filtering debug messages

---

## Detailed Verification by Component

### Component 1: Frontend (generate_report.js)
**File:** `static/js/admin/generate_report.js`
**Line:** 183

**Check:**
```javascript
currentFilters = {
    term_id: termId,
    class_room_id: classId,
    config_id: configId || null  // Should be null, not undefined
};
```

**Verify:** 
- Open browser console
- Run: `console.log(currentFilters)`
- Should show config_id with actual value or null

---

### Component 2: Backend Routes (report_routes.py)
**File:** `routes/report_routes.py`
**Lines:** 348-357

**Check:** Debug logging is present

**Verify:**
- Start server
- Generate report
- Check console for `[DEBUG]` messages

---

### Component 3: Report Generator (report_generator.py)
**File:** `services/report_generator.py`
**Lines:** 130-210

**Check:** 
1. Config validation (lines 130-152)
2. Assessment type filtering (lines 157-210)
3. Debug logging throughout

**Verify:**
- Server logs show all debug messages
- Config validation passes
- Assessment filtering works

---

### Component 4: Report Config Model (report_config.py)
**File:** `models/report_config.py`

**Check:** Methods exist:
- `get_active_assessments()`
- `get_display_settings()`
- `get_merge_config()`

**Verify:**
```python
from models.report_config import ReportConfig
config = ReportConfig.query.first()
# print(config.get_active_assessments())
# print(config.get_display_settings())
```

---

## Common Issues and Quick Fixes

| Issue | Symptom | Fix |
|-------|---------|-----|
| Config not sent | config_id is null in network tab | Select config before clicking Preview |
| Config not found | "Config found: False" in logs | Verify config exists in database |
| Term mismatch | "Config term mismatch" in logs | Create config for correct term |
| Class mismatch | "Config class mismatch" in logs | Create config for all classes or correct class |
| Filtering not working | All assessments still showing | Check active_assessments is not empty |
| Display settings ignored | Logo/position still showing | Check display_settings in logs |
| JavaScript error | Preview button doesn't work | Check browser console for errors |

---

## Database Verification

If you need to check the database directly:

```python
from app import app
from models.report_config import ReportConfig

with app.app_context():
    # Get all configs
    configs = ReportConfig.query.all()
    for config in configs:
        # print(f"Config: {config.config_name}")
        # print(f"  Term: {config.term_id}")
        # print(f"  Class: {config.class_room_id}")
        # print(f"  Active Assessments: {config.get_active_assessments()}")
        # print(f"  Display Settings: {config.get_display_settings()}")
        # print()
```

---

## Success Criteria

✓ Config is created and saved
✓ Config ID is sent from frontend
✓ Config ID is received by backend
✓ Config is found in database
✓ Config validation passes (term and class match)
✓ Active assessments are filtered correctly
✓ Display settings are applied
✓ Report shows only selected columns
✓ Report respects display settings

If all of these are true, the fix is working!
