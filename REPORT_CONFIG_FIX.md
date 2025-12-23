# Report Configuration Fix Guide

## Issues Fixed

1. ✅ Display settings now working (logo, student image, position)
2. ✅ Assessment names formatted properly (no underscores)
3. 📝 Layout improvements (student name under photo, no blank spaces)
4. ℹ️ Merge configuration behavior explained

---

## Layout Fixes Required

### Fix 1: Add Student Name Under Photo

**File:** `static/js/admin/generate_report.js`  
**Line:** 1547

**Find:**

```javascript
                </div>
```

**Replace with:**

```javascript
                </div>
                ${displaySettings.show_student_image ? `<div style="font-size:8pt; font-weight:600; color:#334155; margin-top:2mm; text-align:center;">${student.name || ''}</div>` : ''}
```

---

### Fix 2: Remove "Student Name" from Table

**File:** `static/js/admin/generate_report.js`  
**Lines:** 1553-1560

**Delete:**

```javascript
<tr>
  <td class="info-label">Student Name:</td>
  <td class="info-val" style="width: 40%;">
    ${student.name || ""}
  </td>
  <td class="info-label">Class:</td>
  <td class="info-val">${student.class_name || ""}</td>
</tr>
```

**Replace with:**

```javascript
<tr>
  <td class="info-label">Admission No:</td>
  <td class="info-val">${student.admission_number || ""}</td>
  <td class="info-label">Class:</td>
  <td class="info-val">${student.class_name || ""}</td>
</tr>
```

---

### Fix 3: Make Position Row Conditional

**File:** `static/js/admin/generate_report.js`  
**Lines:** 1561-1574

**Delete:**

```javascript
<tr>
  <td class="info-label">Admission No:</td>
  <td class="info-val">${student.admission_number || ""}</td>
  <td class="info-label">
    ${displaySettings.show_position ? "Position:" : ""}
  </td>
  <td class="info-val text-primary">
    $
    {displaySettings.show_position
      ? `${formatPosition(
          position
        )} <span style="font-weight:400; font-size:6.5pt; color:#64748b;">of ${total_students}</span>`
      : ""}
  </td>
</tr>
```

**Replace with:**

```javascript
                ${displaySettings.show_position ? `<tr>
                    <td class="info-label">Position:</td>
                    <td class="info-val text-primary">${formatPosition(position)} <span style="font-weight:400; font-size:6.5pt; color:#64748b;">of ${total_students}</span></td>
                    <td class="info-label">Overall Grade:</td>
                    <td class="info-val"><span class="badge badge-${overallGrade}">${overallGrade}</span> <span style="font-weight:400;">(${overallPercentage.toFixed(1)}%)</span></td>
                </tr>` : `<tr>
                    <td class="info-label">Overall Grade:</td>
                    <td class="info-val"><span class="badge badge-${overallGrade}">${overallGrade}</span> <span style="font-weight:400;">(${overallPercentage.toFixed(1)}%)</span></td>
                    <td class="info-label">Total Score:</td>
                    <td class="info-val">${Math.round(overall_total)} <span style="font-weight:400; color:#64748b;">/ ${overall_max}</span></td>
                </tr>`}
```

---

### Fix 4: Remove Duplicate Row

**File:** `static/js/admin/generate_report.js`  
**Lines:** 1575-1584

**Delete completely** (this row is now integrated above):

```javascript
<tr>
  <td class="info-label">Overall Grade:</td>
  <td class="info-val">
    <span class="badge badge-${overallGrade}">${overallGrade}</span>{" "}
    <span style="font-weight:400;">(${overallPercentage.toFixed(1)}%)</span>
  </td>
  <td class="info-label">Total Score:</td>
  <td class="info-val">
    ${Math.round(overall_total)}{" "}
    <span style="font-weight:400; color:#64748b;">/ ${overall_max}</span>
  </td>
</tr>
```

---

## Merge Configuration Guide

### Why You're Seeing Duplicate Assessments

If you see two assessments with the same name (e.g., two "FIRST CA"), it's because:

1. You created a merge rule: `cbt + exam → Exam`
2. But you ALSO checked `cbt` and `exam` in Active Assessments

The backend only removes component assessments if they're NOT in the active list.

### Solution

When creating merge configurations in `/reports/config`:

1. **Create Merge Rule:**

   - Components: `cbt`, `exam`
   - Display As: `Exam`

2. **Update Active Assessments:**
   - ✅ Check: `first_ca`, `second_ca`, `Exam`
   - ❌ Uncheck: `cbt`, `exam`

This ensures only the merged "Exam" appears with combined scores.

---

## Testing After Fixes

1. Save all files
2. Hard refresh browser: **Ctrl + F5**
3. Go to `/reports/config`
4. Edit your configuration:
   - Uncheck `cbt` and `exam` from Active Assessments
   - Keep merged assessment checked
5. Go to `/reports/generate`
6. Select the configuration
7. Generate a report

### Expected Results

- ✅ Student name appears under photo
- ✅ No "Student Name" row in table
- ✅ Position row disappears completely when hidden
- ✅ No blank table cells
- ✅ Only merged assessment appears (not components)
- ✅ Assessment names display properly formatted

---

## Browser Console Logs

Check console (F12) for:

```
[Report HTML] Using configuration: {...}
[Report HTML] Display settings: {...}
```

This confirms configuration is being applied.

---

## Files Changed

- ✅ `services/report_generator.py` - Added config to API response
- ✅ `static/js/admin/generate_report.js` - Applied display settings
- 📝 `static/js/admin/generate_report.js` - Layout fixes (manual edits above)
