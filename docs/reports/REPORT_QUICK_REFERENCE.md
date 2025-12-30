# Report Generation - Quick Reference Card

## 🚀 Getting Started (3 Steps)

### 1. Setup Database
```bash
python migrations/add_report_config_table.py
```

### 2. Install PDF Support (Optional)
```bash
python install_weasyprint.py
```

### 3. Access System
- Configure: http://localhost:5000/reports/config
- Generate: http://localhost:5000/reports/generate

---

## 📋 Common Tasks

### Create Report Configuration

1. Go to **Reports** → **Report Config**
2. Click **"New Configuration"**
3. Fill in:
   - **Name**: e.g., "End of Term Report"
   - **Term**: Select term
   - **Class**: Optional (leave blank for all)
4. **Display Settings**: Check what to show
5. **Active Assessments**: Select which to include
6. **Merge Rules**: Combine assessments (optional)
7. Click **"Save Configuration"**

### Generate Single Report

1. Go to **Reports** → **Generate Reports**
2. Select **Term** and **Class**
3. Click **"Load Students"**
4. Click **👁️ (eye icon)** next to student
5. Review preview
6. Click **"Download PDF"**

### Generate Class Reports

1. Go to **Reports** → **Generate Reports**
2. Select **Term** and **Class**
3. Click **"Load Students"**
4. Click **"Download All"**
5. Confirm → PDF downloads

---

## 🔄 Exam Merging Examples

### Merge CBT + Exam
```
Merge Name: Final Exam
Components: ☑️ CBT  ☑️ Exam
Display As: final_exam

Active Assessments: ☑️ final_exam
```
**Result**: Shows "Final Exam: 75/80" instead of separate scores

### Merge Multiple CAs
```
Merge Name: Total CA
Components: ☑️ First CA  ☑️ Second CA
Display As: total_ca

Active Assessments: ☑️ total_ca
```
**Result**: Shows "Total CA: 18/20"

### Multiple Merges
```
Rule 1:
  Merge Name: Mid-term
  Components: ☑️ CA1  ☑️ CA2
  Display As: midterm

Rule 2:
  Merge Name: Final Exam
  Components: ☑️ CBT  ☑️ Exam
  Display As: final_exam

Active Assessments: ☑️ midterm  ☑️ final_exam
```
**Result**: Shows only "Mid-term" and "Final Exam" columns

---

## 📊 Report Content

### What's Included
- ✅ School logo, name, motto, address
- ✅ Student photo, name, admission number
- ✅ Class name and position (e.g., "1st out of 30")
- ✅ Subject scores with assessment breakdown
- ✅ Overall total, percentage, grade
- ✅ Teacher and principal comment sections
- ✅ Grading scale legend

### Grading Scale (Default)
- **A**: 90-100%
- **B**: 80-89%
- **C**: 70-79%
- **D**: 60-69%
- **F**: Below 60%

---

## 🎯 Quick Tips

### ✅ DO
- Test with one student first
- Preview before bulk download
- Use descriptive config names
- Set default configs for common use
- Ensure grades are published

### ❌ DON'T
- Don't merge assessments with different max scores without checking
- Don't download bulk reports without previewing
- Don't forget to select active assessments after merging
- Don't use special characters in config names

---

## 🔧 Troubleshooting

### "No students found"
→ Check students are enrolled in selected class

### "No scores showing"
→ Ensure grades are published (is_published = True)

### "Merge not working"
→ Check component codes match exactly
→ Verify all components have scores
→ Ensure merged assessment is in Active Assessments

### "Position shows N/A"
→ Need at least 2 students with grades
→ Ensure grades are published

### "PDF download fails"
→ Install WeasyPrint: `python install_weasyprint.py`
→ Or use browser # print (Ctrl+P / Cmd+P)

---

## 📱 Keyboard Shortcuts

- **Ctrl+P / Cmd+P**: Print report (from preview page)
- **Esc**: Close modal
- **Tab**: Navigate form fields

---

## 🎓 Assessment Codes

Common codes used in merge rules:
- `first_ca` - First Continuous Assessment
- `second_ca` - Second Continuous Assessment
- `third_ca` - Third Continuous Assessment
- `cbt` - Computer Based Test
- `exam` - Examination
- `project` - Project Work
- `practical` - Practical Assessment

*Your school may have different codes. Check the Active Assessments section in Report Config to see your codes.*

---

## 📞 Need Help?

1. **Quick Start**: Read `REPORT_SYSTEM_QUICK_START.md`
2. **Full Guide**: Read `REPORT_GENERATION_GUIDE.md`
3. **PDF Setup**: Read `REPORT_PDF_SETUP.md`
4. **Check Logs**: Look at browser console (F12) for errors

---

## 🎉 Typical Workflow

### Monday: Configure
1. Create "End of Term Report" config
2. Set merge rules
3. Choose display settings
4. Set as default

### Tuesday-Thursday: Input Scores
1. Teachers input all assessment scores
2. Publish grades

### Friday: Generate Reports
1. Go to Generate Reports
2. Select term and class
3. Preview a few students
4. Download all reports
5. Print and distribute

---

## 💡 Pro Tips

1. **Create Templates**: Make configs for different report types
   - Progress Report (mid-term)
   - Final Report (end of term)
   - Parent Copy (simplified)

2. **Use Defaults**: Set frequently used configs as default

3. **Batch Processing**: Generate reports class by class

4. **Quality Check**: Always preview before bulk download

5. **Backup**: Keep copies of generated PDFs

---

## 📈 Report Types You Can Create

### Progress Report (Mid-term)
- Show only CAs
- No final exam
- No position
- Quick feedback

### Final Report (End of term)
- All assessments
- Include position
- Full layout
- Official record

### Parent Copy (Simplified)
- Merge all assessments
- Show only totals
- Easy to understand

### School Records (Detailed)
- All individual assessments
- Full breakdown
- Archive copy

---

## ⚡ Quick Commands

```bash
# Setup
python migrations/add_report_config_table.py

# Install PDF support
python install_weasyprint.py

# Create sample data (optional)
python setup_sample_reports.py

# Test WeasyPrint
python -c "from weasyprint import HTML; # print('OK')"
```

---

## 📋 Checklist Before Generating Reports

- [ ] All grades entered and published
- [ ] Report configuration created
- [ ] Display settings configured
- [ ] Merge rules set (if needed)
- [ ] Active assessments selected
- [ ] Tested with one student
- [ ] Preview looks correct
- [ ] Ready to download

---

**Quick Access URLs:**
- Config: `/reports/config`
- Generate: `/reports/generate`
- API Docs: See `REPORT_GENERATION_GUIDE.md`

**Version**: 1.0.0 | **Last Updated**: November 21, 2025
