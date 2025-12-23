# Report PDF Generation Setup

## Overview

The report system now supports automatic PDF generation using WeasyPrint. This allows you to:
- Download individual student reports as PDF
- Download all class reports as a single combined PDF
- Generate professional, print-ready report cards

## Installation

### Step 1: Install WeasyPrint

WeasyPrint requires some system dependencies before installation.

#### Windows
```bash
# Install GTK3 runtime (required for WeasyPrint)
# Download and install from: https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer/releases

# Then install WeasyPrint
pip install weasyprint
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get install python3-pip python3-cffi python3-brotli libpango-1.0-0 libpangoft2-1.0-0
pip install weasyprint
```

#### macOS
```bash
brew install python3 cairo pango gdk-pixbuf libffi
pip install weasyprint
```

### Step 2: Verify Installation

```bash
python -c "from weasyprint import HTML; print('WeasyPrint installed successfully!')"
```

If you see the success message, you're ready to go!

## Features

### 1. Single Student PDF Download

**From Generate Reports Page:**
1. Select Term and Class
2. Click "Load Students"
3. Click the download icon (📥) next to any student
4. PDF will download automatically

**From Preview Modal:**
1. Preview a student's report
2. Click "Download PDF" button
3. PDF will download with filename: `Report_StudentName_TermName.pdf`

### 2. Bulk Class PDF Download

**Download All Reports:**
1. Select Term and Class
2. Click "Load Students"
3. Click "Download All" button
4. Confirm the action
5. A single PDF containing all student reports will download
6. Filename: `Reports_ClassName_TermName.pdf`

**Features:**
- Each student report on a separate page
- Sorted by class position
- Professional page breaks
- Ready for printing

### 3. Print from Browser

If WeasyPrint is not installed, the system falls back to browser printing:
1. Click download icon
2. Opens preview page in new tab
3. Click "Print" button
4. Use browser's print-to-PDF feature

## PDF Customization

### Modify Report Layout

Edit `services/report_generator.py` → `generate_report_html()` method:

```python
# Change page size
@page { size: A4; margin: 15mm; }  # Default
@page { size: Letter; margin: 20mm; }  # US Letter

# Change fonts
font-family: 'Segoe UI', Arial, sans-serif;  # Default
font-family: 'Times New Roman', serif;  # Formal

# Change colors
background: #2563eb;  # Blue header
background: #059669;  # Green header
```

### Modify Grading Scale

Edit the `get_grade()` method in `services/report_generator.py`:

```python
@staticmethod
def get_grade(percentage):
    if percentage >= 70:
        return 'A'
    elif percentage >= 59:
        return 'B'
    elif percentage >= 49:
        return 'C'
    elif percentage >= 40:
        return 'D'
    else:
        return 'F'
    # ... customize as needed
```

### Add School-Specific Elements

In `generate_report_html()`, you can add:
- School stamp/seal
- Watermarks
- Additional information sections
- Custom headers/footers

Example:
```python
html += '''
<div style="text-align: center; margin-top: 20px;">
    <img src="/static/images/school_stamp.png" style="width: 100px;">
</div>
'''
```

## API Endpoints

### Download Single Student PDF
```
POST /reports/api/download-pdf
Content-Type: application/json

{
  "student_id": "uuid",
  "term_id": "uuid",
  "class_room_id": "uuid",
  "config_id": "uuid" (optional)
}

Response: PDF file download
```

### Download Class PDF
```
POST /reports/api/download-class-pdf
Content-Type: application/json

{
  "class_room_id": "uuid",
  "term_id": "uuid",
  "config_id": "uuid" (optional)
}

Response: PDF file download
```

## Troubleshooting

### "PDF generation not available" Error

**Cause:** WeasyPrint is not installed

**Solution:**
1. Follow installation instructions above
2. Restart Flask application
3. Try again

### PDF Generation is Slow

**Cause:** Large classes or complex reports

**Solutions:**
1. Generate reports in smaller batches
2. Use simpler report layouts
3. Consider background job processing (Celery)

### Images Not Showing in PDF

**Cause:** Relative URLs or missing images

**Solutions:**
1. Use absolute URLs for images
2. Ensure images are accessible
3. Check image file paths

Example fix:
```python
# Bad
<img src="/static/logo.png">

# Good
<img src="http://localhost:5000/static/logo.png">
```

### Fonts Not Rendering Correctly

**Cause:** Missing system fonts

**Solution:**
```python
# In generate_report_html(), specify web-safe fonts
font-family: Arial, Helvetica, sans-serif;
```

### PDF Layout Breaks

**Cause:** Content overflow or page breaks

**Solution:**
```css
/* Add to CSS in generate_report_html() */
.score-table {
    page-break-inside: avoid;  /* Keep table together */
}

.comment-box {
    page-break-inside: avoid;  /* Keep comments together */
}
```

## Performance Optimization

### For Large Classes (50+ students)

**Option 1: Background Processing**
```python
# Install Celery
pip install celery redis

# Create task
@celery.task
def generate_class_reports(class_id, term_id, config_id):
    # Generate PDFs in background
    pass
```

**Option 2: Pagination**
```python
# Generate in batches of 10
for i in range(0, len(students), 10):
    batch = students[i:i+10]
    generate_batch_pdf(batch)
```

**Option 3: Caching**
```python
# Cache generated PDFs
from flask_caching import Cache
cache = Cache(app, config={'CACHE_TYPE': 'simple'})

@cache.memoize(timeout=3600)
def get_student_report_pdf(student_id, term_id):
    # Generate and cache for 1 hour
    pass
```

## Advanced Features

### Add Watermark

```python
# In generate_report_html()
html += '''
<div style="position: fixed; top: 50%; left: 50%; 
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 72pt; color: rgba(0,0,0,0.05);
            z-index: -1;">
    CONFIDENTIAL
</div>
'''
```

### Add QR Code

```python
import qrcode
import base64
from io import BytesIO

# Generate QR code
qr = qrcode.make(f"https://school.com/verify/{student_id}")
buffer = BytesIO()
qr.save(buffer, format='PNG')
qr_base64 = base64.b64encode(buffer.getvalue()).decode()

# Add to HTML
html += f'<img src="data:image/png;base64,{qr_base64}">'
```

### Add Barcode

```python
from barcode import Code128
from barcode.writer import ImageWriter

# Generate barcode
barcode = Code128(student.admission_number, writer=ImageWriter())
buffer = BytesIO()
barcode.write(buffer)
barcode_base64 = base64.b64encode(buffer.getvalue()).decode()

# Add to HTML
html += f'<img src="data:image/png;base64,{barcode_base64}">'
```

## Security Considerations

### Protect PDF Downloads

```python
@report_bp.route("/api/download-pdf", methods=["POST"])
@admin_or_staff_required  # Already implemented
def download_single_pdf():
    # Additional checks
    user = User.query.get(session["user_id"])
    
    # Ensure staff can only download from their classes
    if user.role == "staff":
        # Check if staff teaches this class
        pass
```

### Prevent Unauthorized Access

```python
# Add rate limiting
from flask_limiter import Limiter

limiter = Limiter(app, key_func=lambda: session.get("user_id"))

@report_bp.route("/api/download-pdf", methods=["POST"])
@limiter.limit("10 per minute")  # Max 10 downloads per minute
def download_single_pdf():
    pass
```

## Best Practices

1. **Test First**: Always test with one student before bulk generation
2. **Check Data**: Ensure all grades are published and correct
3. **Preview**: Use preview feature before downloading
4. **Backup**: Keep backup of generated PDFs
5. **Naming**: Use clear, consistent file naming
6. **Storage**: Consider storing generated PDFs for future access
7. **Permissions**: Restrict access to authorized users only

## Alternative: Browser Print

If WeasyPrint installation is problematic, use browser printing:

1. System automatically falls back to preview page
2. Users can print using browser (Ctrl+P / Cmd+P)
3. Select "Save as PDF" in print dialog
4. Works on all platforms without additional setup

## Next Steps

1. ✅ Install WeasyPrint
2. ✅ Test single student download
3. ✅ Test class download
4. ✅ Customize report layout
5. ✅ Train staff on usage
6. ✅ Generate end-of-term reports

## Support

For issues:
1. Check error messages in browser console
2. Check Flask logs for backend errors
3. Verify WeasyPrint installation
4. Test with simple report first
5. Review this documentation

---

**Ready to generate reports?** Install WeasyPrint and start downloading professional PDF report cards!
