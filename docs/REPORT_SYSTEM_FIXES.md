# Report System Fixes - November 22, 2025

## Issues Fixed

### 1. CBT Scores Not Showing in Reports
**Problem:** CBT scores were not appearing in student reports even though students had taken tests.

**Solution:** Modified `services/report_generator.py` to include CBT scores:
- Changed grade filtering to include `is_from_cbt` flag
- Updated position calculation to count CBT scores in rankings
- CBT scores now show automatically without requiring manual publishing

### 2. Missing Subjects Not Displayed
**Problem:** Only subjects with grades were showing in reports. If a student's class offered 10 subjects but only had grades in 5, only those 5 appeared.

**Solution:** Modified report generation logic:
- First fetch ALL subjects assigned to the student's class
- Initialize report with all class subjects
- Populate with available grades
- Show dashes (-) for subjects without scores

### 3. Position Calculation Excluding CBT
**Problem:** Class position rankings were not including CBT scores, making positions inaccurate.

**Solution:** Updated `calculate_class_position()` method:
```python
# Before: Only published grades
Grade.is_published == True

# After: Published grades OR CBT scores
db.or_(Grade.is_published == True, Grade.is_from_cbt == True)
```

## Files Modified

1. **services/report_generator.py**
   - `get_student_scores()`: Now fetches all class subjects first
   - `calculate_class_position()`: Includes CBT scores in rankings
   - Grade filtering: Includes `is_from_cbt` flag

## Result

Reports now correctly:
- ✅ Show ALL subjects from student's class
- ✅ Display CBT scores automatically
- ✅ Show dashes for missing assessment scores
- ✅ Calculate accurate class positions including CBT
- ✅ Maintain proper formatting and styling

## File Organization

Moved documentation and utility scripts to archive folders:
- `docs/archive/` - Old documentation files
- `scripts/archive/` - Utility and test scripts

This keeps the root directory clean while preserving historical documentation.
