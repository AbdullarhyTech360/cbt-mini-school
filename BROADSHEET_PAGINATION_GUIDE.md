# Broadsheet Subject Pagination Implementation Guide

## Changes Made

### 1. Backend (routes/report_routes.py)

#### Added subjects_per_page parameter:
```python
@report_bp.route("/api/broad-sheet/export/<format>", methods=["POST"])
def export_broad_sheet(format):
    subjects_per_page = data.get('subjects_per_page', 5)  # Default 5 subjects per page
    return export_broad_sheet_pdf(broad_sheet_data, metadata, school, subjects_per_page)
```

#### Updated export functions:
```python
def export_broad_sheet_pdf(broad_sheet_data, metadata, school, subjects_per_page=5):
    html_content = generate_broad_sheet_html(broad_sheet_data, metadata, school, subjects_per_page)
```

#### Paginated HTML generation:
The generate_broad_sheet_html function now:
1. Splits subjects into chunks based on subjects_per_page
2. Generates multiple pages with page breaks
3. Each page shows all students but only a subset of subjects

### 2. Frontend (static/js/admin/generate_broadsheet.js)

Add subjects_per_page field to export request:
```javascript
async function exportBroadSheet(format) {
    const subjectsPerPage = document.getElementById('subjects-per-page')?.value || 5;
    
    const response = await fetch(`/reports/api/broad-sheet/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            class_room_id: classId,
            term_id: termId,
            exam_type: examType,
            show_exams: showExams,
            show_totals: showTotals,
            config_id: configId,
            subjects_per_page: parseInt(subjectsPerPage)  // Add this
        })
    });
}
```

### 3. UI (templates/admin/generate_report.html)

Add a dropdown for subjects per page in the broad sheet section:
```html
<div class="form-group">
    <label for="subjects-per-page">Subjects Per Page:</label>
    <select id="subjects-per-page" class="form-control">
        <option value="3">3 Subjects</option>
        <option value="4">4 Subjects</option>
        <option value="5" selected>5 Subjects (Default)</option>
        <option value="6">6 Subjects</option>
        <option value="7">7 Subjects</option>
        <option value="0">All Subjects (No Pagination)</option>
    </select>
</div>
```

## Benefits

1. **Improved Readability**: Each page contains fewer columns, making it easier to read
2. **Better Printing**: Pages won't have text overflow or require landscape mode to fit
3. **Flexibility**: Users can configure how many subjects per page based on their needs
4. **Professional**: Multiple pages with proper headers look more organized

## Usage

1. Select class and term
2. Choose how many subjects to display per page (default is 5)
3. Click Export PDF or Excel
4. The PDF will have multiple pages, each showing all students with a subset of subjects
