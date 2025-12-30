# Student Report Generation System

## Overview

A comprehensive report generation system with flexible exam merging, customizable display settings, and preview capabilities before downloading.

## Features

### 1. Report Configuration
- **Flexible Exam Merging**: Combine multiple assessments (e.g., CBT + Exam, CA1 + CA2)
- **Selective Display**: Choose which assessments to show in the report
- **Display Settings**: Toggle school logo, student image, class position
- **Multiple Configurations**: Create different report configs for different terms/classes

### 2. Report Content
Each report includes:
- School name, logo, address, phone, motto
- Term and academic session
- Student name, admission number, photo
- Class name and position (e.g., "1st out of 30")
- Subject-wise scores with assessment breakdown
- Overall total and grade
- Space for teacher and principal comments

### 3. Preview & Download
- Preview reports before generating PDF
- Individual student reports
- Bulk class reports
- Print-friendly format

## Setup Instructions

### 1. Run Migration
```bash
python migrations/add_report_config_table.py
```

### 2. Access Report Features
Navigate to:
- **Report Configuration**: `/reports/config`
- **Generate Reports**: `/reports/generate`

## Usage Guide

### Creating a Report Configuration

1. **Navigate to Report Config**
   - Click "Report Config" in the admin sidebar
   - Click "New Configuration"

2. **Basic Settings**
   - **Configuration Name**: e.g., "End of Term Report"
   - **Term**: Select the term
   - **Class**: Optional - leave blank for all classes
   - **Set as Default**: Check to make this the default config

3. **Display Settings**
   - Toggle school logo display
   - Toggle student image display
   - Toggle class position display

4. **Active Assessments**
   - Select which assessments to include in the report
   - Example: Check "First CA", "Second CA", "Exam"

5. **Exam Merging Rules**
   - Click "Add Merge Rule"
   - **Merge Name**: Name for the merged assessment (e.g., "Final Exam")
   - **Components**: Comma-separated assessment codes (e.g., "cbt,exam")
   - **Display As**: How to show it in report (e.g., "exam")

### Example Merge Scenarios

#### Scenario 1: Merge CBT with Exam
```
Merge Name: Final Exam
Components: cbt,exam
Display As: exam
```
Result: CBT score + Exam score = Final Exam score

#### Scenario 2: Merge Two CAs
```
Merge Name: Total CA
Components: first_ca,second_ca
Display As: ca_total
```
Result: First CA + Second CA = Total CA

#### Scenario 3: Multiple Merges
```
Rule 1:
  Merge Name: Mid-term Total
  Components: first_ca,second_ca
  Display As: midterm

Rule 2:
  Merge Name: Final Exam
  Components: cbt,exam
  Display As: final_exam
```

### Generating Reports

1. **Navigate to Generate Reports**
   - Click "Generate Reports" in the admin sidebar

2. **Select Filters**
   - **Term**: Choose the term
   - **Class**: Choose the class
   - **Report Config**: Choose configuration (or use default)
   - Click "Load Students"

3. **Preview Individual Report**
   - Click the eye icon next to a student
   - Review the report in the preview modal
   - Click "Download PDF" to # print/save

4. **Bulk Operations**
   - **Preview All**: Opens preview for all students
   - **Download All**: Generates PDFs for all students

## API Endpoints

### Configuration Management

#### Get All Configurations
```
GET /reports/api/configs
```

#### Create Configuration
```
POST /reports/api/configs
Body: {
  "config_name": "End of Term Report",
  "term_id": "term-uuid",
  "class_room_id": "class-uuid",
  "is_default": false,
  "display_settings": {
    "show_logo": true,
    "show_student_image": true,
    "show_position": true
  },
  "active_assessments": ["first_ca", "second_ca", "exam"],
  "merge_config": {
    "merged_exams": [
      {
        "name": "Final Exam",
        "components": ["cbt", "exam"],
        "display_as": "exam"
      }
    ]
  }
}
```

#### Update Configuration
```
PUT /reports/api/configs/<config_id>
Body: Same as create
```

#### Delete Configuration
```
DELETE /reports/api/configs/<config_id>
```

### Report Generation

#### Preview Single Student Report
```
POST /reports/api/preview
Body: {
  "student_id": "student-uuid",
  "term_id": "term-uuid",
  "class_room_id": "class-uuid",
  "config_id": "config-uuid" (optional)
}
```

#### Preview Class Reports
```
POST /reports/api/class-preview
Body: {
  "class_room_id": "class-uuid",
  "term_id": "term-uuid",
  "config_id": "config-uuid" (optional)
}
```

#### Get Assessment Types
```
GET /reports/api/assessment-types
```

## Database Schema

### report_config Table
```sql
CREATE TABLE report_config (
    config_id VARCHAR(36) PRIMARY KEY,
    school_id VARCHAR(36) NOT NULL,
    term_id VARCHAR(36) NOT NULL,
    class_room_id VARCHAR(36),
    config_name VARCHAR(200) NOT NULL,
    merge_config TEXT,  -- JSON
    display_settings TEXT,  -- JSON
    active_assessments TEXT,  -- JSON
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (school_id) REFERENCES school(school_id),
    FOREIGN KEY (term_id) REFERENCES school_term(term_id),
    FOREIGN KEY (class_room_id) REFERENCES class_room(class_room_id)
)
```

## Files Created

### Models
- `models/report_config.py` - Report configuration model

### Services
- `services/report_generator.py` - Report generation logic

### Routes
- `routes/report_routes.py` - API endpoints and page routes

### Templates
- `templates/admin/report_config.html` - Configuration management page
- `templates/admin/generate_report.html` - Report generation page
- `templates/reports/preview.html` - Report preview/# print page

### JavaScript
- `static/js/admin/report_config.js` - Configuration page logic
- `static/js/admin/generate_report.js` - Report generation page logic

### Migrations
- `migrations/add_report_config_table.py` - Database migration

## Advanced Features

### Custom Grading Scale
The system uses a default grading scale:
- A: 70-100% (Excellent)
- B: 59-69% (Very Good)
- C: 49-58% (Good)
- D: 40-48% (Pass)
- F: 0-39% (Fail)

To customize, modify the `getGrade()` function in:
- `services/report_generator.py`
- `static/js/admin/generate_report.js`
- `templates/reports/preview.html`

### Position Calculation
Class position is calculated based on total scores across all published grades for the term. Students with equal scores receive the same position.

### PDF Generation
The current implementation uses browser # print functionality. For automated PDF generation, integrate a library like:
- **WeasyPrint** (Python)
- **Puppeteer** (Node.js)
- **wkhtmltopdf**

Example with WeasyPrint:
```python
from weasyprint import HTML

@report_bp.route("/api/download/<student_id>")
def download_pdf(student_id):
    # Generate HTML
    html_content = render_template('reports/preview.html', ...)
    
    # Convert to PDF
    pdf = HTML(string=html_content).write_pdf()
    
    return send_file(
        io.BytesIO(pdf),
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'report_{student_id}.pdf'
    )
```

## Troubleshooting

### Reports Not Showing Scores
- Ensure grades are published (`is_published=True`)
- Check that the term_id and class_room_id match
- Verify assessment types are active

### Merge Not Working
- Check that component assessment codes match exactly
- Ensure all component assessments have scores
- Verify active_assessments includes the merged assessment

### Position Not Calculating
- Ensure multiple students have grades in the same class
- Check that grades are published
- Verify term_id matches

## Future Enhancements

1. **Automated PDF Generation**: Integrate PDF library for bulk downloads
2. **Email Reports**: Send reports directly to parents
3. **Report Templates**: Multiple report card designs
4. **Performance Analytics**: Charts and graphs
5. **Comparison Reports**: Term-over-term comparison
6. **Attendance Integration**: Include attendance in reports
7. **Teacher Comments**: Pre-filled comment suggestions
8. **Batch Processing**: Queue system for large classes

## Security Considerations

- Only admin and staff can access report features
- Students can only view their own reports
- Report configurations are school-specific
- All database queries use parameterized statements

## Performance Tips

1. **Index Database**: Add indexes on frequently queried columns
   ```sql
   CREATE INDEX idx_grade_student_term ON grade(student_id, term_id);
   CREATE INDEX idx_grade_class_term ON grade(class_room_id, term_id);
   ```

2. **Cache Reports**: Cache generated reports for faster access
3. **Pagination**: For large classes, paginate student lists
4. **Background Jobs**: Use Celery for bulk report generation

## Support

For issues or questions:
1. Check this documentation
2. Review the code comments
3. Test with sample data
4. Check browser console for JavaScript errors
5. Review Flask logs for backend errors
