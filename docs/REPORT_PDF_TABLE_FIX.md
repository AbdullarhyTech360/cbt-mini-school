# Report Card PDF Simplification & Single-Page Fix

## Problem
When downloading student report cards as PDF using GTK3/WeasyPrint:
1. Tables were shrinking and some columns were not appearing
2. Reports were spanning multiple pages
3. Too many columns (Score/Max sub-columns for each assessment)
4. Student info was arranged vertically taking too much space
5. Percentage column was redundant next to grade

## Solution Applied

### 1. Simplified Table Structure
**Removed:**
- Score/Max sub-columns for each assessment (now just shows the score)
- Percentage (%) column (grade is sufficient)

**Result:** Much cleaner table with more space for assessment columns

**Before:**
```
SN | SUBJECT | CA1 Score | CA1 Max | CA2 Score | CA2 Max | TOTAL | % | GRADE
```

**After:**
```
SN | SUBJECT | CA1 | CA2 | CBT | EXAM | TOTAL | GRADE
```

### 2. Reorganized Student Info
Changed from vertical (row-by-row) to horizontal (side-by-side) layout:

**Before:**
```
Student Name:      John Doe
Admission Number:  12345
Class:             JSS 1A
Position:          1st of 30
Total Score:       450/500
```

**After:**
```
Student Name:  John Doe          Admission Number:  12345
Class:         JSS 1A             Position:          1st of 30
Total Score:   450/500            Overall Grade:     A (90%)
```

This saves significant vertical space and balances the layout.

### 3. Compact Styling
- Reduced all margins and padding
- Smaller fonts (7-9pt) optimized for # print
- Compact header and footer sections
- Smaller comment boxes
- Condensed grading legend

### 4. Fixed Column Widths
Set specific widths to ensure proper display:
- SN: 30px
- Subject: 150px
- Assessment columns: Share remaining space equally
- Total: 70px
- Grade: 50px

## Files Modified
- `services/report_generator.py`
  - Updated `generate_report_html()` method
  - Simplified table structure
  - Reorganized student info layout
  - Removed redundant columns

## Testing
To verify the fix:
1. Go to Admin → Generate Reports
2. Select a term and class
3. Click "Download PDF" for any student
4. Verify:
   - ✅ Report fits on a single A4 landscape page
   - ✅ All assessment columns are visible
   - ✅ Student info is arranged side-by-side
   - ✅ Table shows only scores (no Score/Max sub-columns)
   - ✅ No percentage column (grade is sufficient)
   - ✅ All text is readable

## Key Changes Summary

### Table Structure
```python
# Old: Score and Max for each assessment
for assessment in assessments:
    html += f'<td>{score}</td><td>{max_score}</td>'

# New: Just the score
for assessment in assessments:
    html += f'<td>{score}</td>'
```

### Student Info Layout
```python
# Old: Vertical layout (one field per row)
<tr><td>Student Name:</td><td>{name}</td></tr>
<tr><td>Admission Number:</td><td>{admission}</td></tr>

# New: Horizontal layout (two fields per row)
<tr>
    <td>Student Name:</td><td>{name}</td>
    <td>Admission Number:</td><td>{admission}</td>
</tr>
```

### Column Headers
```python
# Old: Two-row header with Score/Max sub-headers
<tr>
    <th rowspan="2">SN</th>
    <th colspan="2">CA1</th>
    <th>TOTAL</th>
    <th>%</th>
    <th>GRADE</th>
</tr>
<tr>
    <th>Score</th><th>Max</th>
</tr>

# New: Single-row header
<tr>
    <th>SN</th>
    <th>SUBJECT</th>
    <th>CA1</th>
    <th>CA2</th>
    <th>TOTAL</th>
    <th>GRADE</th>
</tr>
```

## Benefits
- ✅ Fits on single page (A4 landscape)
- ✅ Cleaner, more professional look
- ✅ All columns visible and properly sized
- ✅ Better space utilization
- ✅ Easier to read and understand
- ✅ Faster PDF generation (less content)
- ✅ Works perfectly with GTK3/WeasyPrint

## Recommendations
- For classes with many assessment types (>6), use report configuration to merge or hide some assessments
- Test # print quality to ensure fonts are readable on your printer
- Adjust font sizes in `services/report_generator.py` if needed (lines 420-650)

## Date Fixed
December 4, 2025
