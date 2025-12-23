# Report Generation System - Quick Start

## What This System Does

This report generation system allows you to:
1. **Merge Exams**: Combine multiple assessments (e.g., CBT + Exam = Final Exam)
2. **Customize Display**: Choose what appears on the report card
3. **Preview Reports**: See reports before downloading
4. **Bulk Generate**: Create reports for entire classes

## Quick Setup (3 Steps)

### Step 1: Run Migration
```bash
python migrations/add_report_config_table.py
```

### Step 2: Create Sample Configurations
```bash
python setup_sample_reports.py
```

### Step 3: Access the System
- **Configure Reports**: http://localhost:5000/reports/config
- **Generate Reports**: http://localhost:5000/reports/generate

## Common Use Cases

### Use Case 1: Merge CBT with Exam
**Scenario**: Your school takes CBT (20 marks) and Exam (60 marks), but you want to show them as one "Final Exam (80 marks)" on the report.

**Solution**:
1. Go to Report Config
2. Create new configuration
3. Add merge rule:
   - Merge Name: `Final Exam`
   - Components: `cbt,exam`
   - Display As: `final_exam`
4. In Active Assessments, uncheck CBT and Exam, check final_exam

**Result**: Report shows "Final Exam: 75/80" instead of "CBT: 15/20, Exam: 60/60"

### Use Case 2: Combine Multiple CAs
**Scenario**: You have First CA (10 marks) and Second CA (10 marks), want to show as "Total CA (20 marks)"

**Solution**:
1. Add merge rule:
   - Merge Name: `Total CA`
   - Components: `first_ca,second_ca`
   - Display As: `total_ca`
2. Uncheck individual CAs, check total_ca

**Result**: Report shows "Total CA: 18/20" instead of two separate CAs

### Use Case 3: Different Reports for Different Terms
**Scenario**: First term shows all assessments, second term merges some

**Solution**:
1. Create "First Term Report" config for first term
2. Create "Second Term Report" config for second term with merging
3. Select appropriate config when generating reports

## Report Configuration Options

### Display Settings
- ✅ **Show School Logo**: Display school logo at top
- ✅ **Show Student Image**: Display student photo
- ✅ **Show Class Position**: Show "1st out of 30"

### Active Assessments
Select which assessments appear on the report:
- First CA
- Second CA
- CBT
- Exam
- (Or your custom assessments)

### Merge Rules
Combine assessments:
- **Merge Name**: What to call the combined assessment
- **Components**: Which assessments to combine (comma-separated codes)
- **Display As**: Code name for the merged assessment

## Generating Reports

### For One Student
1. Go to Generate Reports
2. Select Term and Class
3. Click eye icon next to student
4. Review preview
5. Click "Download PDF" or Print

### For Entire Class
1. Go to Generate Reports
2. Select Term and Class
3. Click "Preview All" or "Download All"

## Understanding Assessment Codes

Assessment codes are used in merge rules. Common codes:
- `first_ca` - First Continuous Assessment
- `second_ca` - Second Continuous Assessment
- `cbt` - Computer Based Test
- `exam` - Examination

To find your codes:
1. Go to Report Config
2. Look at the Active Assessments section
3. The codes are shown in the checkboxes

## Report Card Layout

```
┌─────────────────────────────────────────┐
│         [School Logo]                   │
│         SCHOOL NAME                     │
│         School Motto                    │
│         Address | Phone                 │
│    STUDENT REPORT CARD                  │
│    First Term - 2024-2025               │
├─────────────────────────────────────────┤
│ [Photo]  Name: John Doe                 │
│          Admission: STU001              │
│          Class: Primary 1               │
│          Position: 1st out of 30        │
├─────────────────────────────────────────┤
│ Subject    | CA1 | CA2 | Exam | Total  │
├─────────────────────────────────────────┤
│ Math       | 18  | 19  | 55   | 92/100 │
│ English    | 17  | 18  | 52   | 87/100 │
│ Science    | 19  | 20  | 58   | 97/100 │
├─────────────────────────────────────────┤
│ TOTAL                          276/300  │
├─────────────────────────────────────────┤
│ Teacher's Comment:                      │
│ [Space for comment]                     │
│ Signature: _______________              │
│                                         │
│ Principal's Comment:                    │
│ [Space for comment]                     │
│ Signature: _______________              │
└─────────────────────────────────────────┘
```

## Troubleshooting

### "No students found"
- Ensure students are enrolled in the selected class
- Check that the class has active students

### "No scores showing"
- Verify grades are published (is_published = True)
- Check that scores exist for the selected term
- Ensure assessment types match

### "Merge not working"
- Verify component codes are correct
- Check that all components have scores
- Ensure merged assessment is in Active Assessments

### "Position shows N/A"
- Need at least 2 students with grades
- Ensure grades are published
- Check term_id matches

## Tips & Best Practices

1. **Test First**: Create a test configuration before using in production
2. **Use Descriptive Names**: Name configs clearly (e.g., "End of Term Report 2024")
3. **Set Defaults**: Mark commonly used configs as default
4. **Preview Always**: Always preview before bulk downloading
5. **Backup Data**: Backup database before making changes

## Next Steps

1. ✅ Run migration
2. ✅ Create sample configs
3. ✅ Test with one student
4. ✅ Customize for your school
5. ✅ Generate class reports

## Need Help?

- Read full documentation: `REPORT_GENERATION_GUIDE.md`
- Check code comments in the files
- Test with sample data first
- Review browser console for errors

## Example Workflow

**Monday**: Configure report settings
1. Create "End of Term Report" config
2. Set merge rules for CBT+Exam
3. Choose display settings
4. Set as default

**Tuesday**: Input all scores
1. Teachers input CA scores
2. Students take CBT
3. Teachers input exam scores
4. Publish all grades

**Wednesday**: Generate reports
1. Go to Generate Reports
2. Select term and class
3. Preview a few students
4. Download all reports
5. Print and distribute

## Advanced: Multiple Report Types

You can create different configs for different purposes:

**Progress Report** (Mid-term)
- Show only CAs
- No position
- Minimal layout

**Final Report** (End of term)
- Show all assessments
- Include position
- Full layout with comments

**Parent Copy** (Simplified)
- Merge all assessments
- Show only totals
- No detailed breakdown

**School Records** (Detailed)
- Show all individual assessments
- Include all metadata
- Full breakdown

---

**Ready to start?** Run the migration and setup script, then visit `/reports/config`!
