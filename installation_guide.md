# 🎯 Single-Page Report Card - Installation Guide

## ✅ What You'll Get
- **Single A4 page** - Everything fits perfectly on one page
- **Exact match** to your image design
- **Professional layout** with school logo, student photo, and colored sections
- **Canvas preview** - See exactly how PDF will look before downloading

---

## 📦 Step 1: Backup Your Current File
Before making changes, backup your current `generate_report.js` file:
```bash
cp generate_report.js generate_report.js.backup
```

---

## 🔧 Step 2: Replace the generateReportHTML Function

Open your `generate_report.js` file and **find this function**:
```javascript
function generateReportHTML(reportData) {
    // ... your current code ...
}
```

**DELETE** everything from `function generateReportHTML(reportData) {` until the closing `}` of that function.

**PASTE** the new function from the artifact above (the entire generateReportHTML function plus helper functions at the bottom).

---

## 📍 Step 3: Exact Location in Your File

In your `generate_report.js`, find this line (around line 800):
```javascript
// Helper function to generate HTML for the report
function generateReportHTML(reportData) {
```

**Replace from that line** until you see the next major function. Keep these helper functions at the end:
- `getSimpleGrade()`
- `getGradeColor()`  
- `formatPosition()`
- `formatAssessmentName()`
- `calculateResumptionDate()`

---

## 🎨 Step 4: Verify It Works

1. **Refresh your browser** (Ctrl + F5 or Cmd + Shift + R)
2. **Select a term and class**
3. **Click "Preview"** on any student
4. **You should see**:
   - A modal with canvas preview
   - Your report card looking exactly like the image
   - Everything on a single page

---

## 🐛 Troubleshooting

### Problem: Preview is blank
**Solution:**
```javascript
// Check browser console (F12) for errors
// Make sure html2canvas is loaded:
console.log(typeof html2canvas); // Should say "function"
```

### Problem: Report card has multiple pages
**Solution:** The CSS already handles this, but if issues persist, add:
```css
body {
    overflow: hidden !important;
}
```

### Problem: Colors look different in PDF
**Solution:** Already handled with:
```css
-webkit-# print-color-adjust: exact !important;
# print-color-adjust: exact !important;
```

### Problem: School logo not showing
**Solution:** Make sure your logo path is correct:
```javascript
// In your backend, ensure logo path is returned like:
school.logo = "uploads/logo.png"  // NOT "/static/uploads/logo.png"
```

---

## 🎯 Quick Test Checklist

After installation, verify:

- [ ] Preview button opens modal
- [ ] Report card shows on single page
- [ ] School name and logo display correctly
- [ ] Student photo appears (or placeholder if none)
- [ ] All subjects and scores show correctly
- [ ] Term information is accurate
- [ ] Download button works
- [ ] ESC key closes preview

---

## 🔥 Pro Tips

### 1. Adjust Font Sizes (if needed)
Find this in the CSS section:
```css
body {
    font-size: 9px;  /* Change to 8px for smaller text */
}
```

### 2. Change School Colors
Find this in the CSS:
```css
.header {
    background: linear-gradient(135deg, #5b6fd8 0%, #4c5fd8 100%);
    /* Change to your school colors */
}
```

### 3. Customize Grading Scale
Find this function:
```javascript
function getSimpleGrade(percentage) {
    if (percentage >= 70) return 'A';  // Adjust thresholds
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
}
```

---

## 📝 Complete File Structure

Your `generate_report.js` should have these sections in order:

1. **Global variables** (currentStudents, currentFilters, etc.)
2. **DOM loaded event listeners**
3. **Load functions** (loadTerms, loadClasses, etc.)
4. **UI functions** (showNotification, showGlobalLoading, etc.)
5. **Student management** (loadStudents, renderStudentsTable, etc.)
6. **Preview functions** (previewReport, showCanvasBasedPreview, etc.)
7. **Download functions** (downloadReport, downloadFromPreview, etc.)
8. **👉 NEW: generateReportHTML function** ← Replace this one
9. **Helper functions** (getSimpleGrade, formatPosition, etc.)
10. **PDF generation** (generateClientSidePDF)

---

## 🚀 Advanced: Custom School Header

Want to customize the header more? Find this section:
```javascript
<div class="school-info">
    <h1>${school.name || 'KHULAFA\'U INTERNATIONAL SCHOOL'}</h1>
    <p>${school.address || 'No. 3 Gaa Road, Shika'} • Tel: ${school.phone || '08032998966'}</p>
</div>
```

Change the default values to match your school.

---

## ✨ Features Included

✅ **Single A4 Page Layout** - Never splits across pages  
✅ **School Logo** - Circular logo in header  
✅ **Student Photo** - With name label  
✅ **Colored Header** - Professional gradient  
✅ **Assessment Columns** - Dynamic based on your config  
✅ **Overall Performance** - Highlighted in purple  
✅ **Grading Scale** - Color-coded badges  
✅ **Comments Sections** - For teacher and principal  
✅ **Watermark** - "OFFICIAL COPY" in background  
✅ **Footer** - Official document notice  

---

## 🆘 Need Help?

Common issues and solutions:

**Issue**: "Function not defined"  
**Fix**: Make sure you copied ALL helper functions at the bottom

**Issue**: "reportData is undefined"  
**Fix**: Check your API endpoint returns data in correct format

**Issue**: Preview shows but download fails  
**Fix**: Check that html2pdf.js is loaded in your HTML

**Issue**: Wrong data showing  
**Fix**: Verify your backend API response matches expected format

---

## 📞 Support

If you encounter any issues:
1. Check browser console (F12) for errors
2. Verify all helper functions are copied
3. Ensure your backend returns data in correct format
4. Test with a simple student first

---

## 🎉 You're Done!

Your report card is now:
- ✅ Single page only
- ✅ Matches your design image
- ✅ Professional and # print-ready
- ✅ Canvas preview shows exact output

Enjoy your new report card system! 🚀
