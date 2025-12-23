# JavaScript Fixes for Report Generation

## Issue 1: Data Structure Handling

The API returns data in the format:
```json
{
  "success": true,
  "report": {
    "student": {...},
    "school": {...},
    "term": {...},
    ...
  }
}
```

But the JavaScript code expects the report data directly.

## Issue 2: Null Safety in PDF Filename Generation

The code tries to access `reportData.student.name` and `reportData.term.name` without null checks.

## Fixes Needed

### In the downloadReport function (around line 442):

Change from:
```javascript
const data = await response.json();

if (data) {
    await generateClientSidePDF(data);
} else {
    throw new Error('Failed to fetch report data');
}
```

Change to:
```javascript
const data = await response.json();

// Check if the response has the expected structure
if (data && data.success && data.report) {
    await generateClientSidePDF(data.report);
} else if (data && !data.success) {
    throw new Error('Failed to fetch report data: ' + (data.message || 'Server error'));
} else {
    throw new Error('Invalid response format from server');
}
```

### In the batch download function (around line 612):

Change from:
```javascript
const reportData = await reportResponse.json();

// Generate PDF for this student using client-side generation
await generateClientSidePDF(reportData);
```

Change to:
```javascript
const reportData = await reportResponse.json();

// Check if the response has the expected structure
if (reportData && reportData.success && reportData.report) {
    // Generate PDF for this student using client-side generation
    await generateClientSidePDF(reportData.report);
} else if (reportData && !reportData.success) {
    throw new Error(`Failed to fetch report data for ${student.name}: ${reportData.message || 'Server error'}`);
} else {
    throw new Error(`Invalid response format for ${student.name}`);
}
```

### In the generateClientSidePDF function (around line 1405):

Change from:
```javascript
filename: `report_${(reportData.student.name || 'student').replace(/\s+/g, '_')}_${(reportData.term.name || 'term').replace(/\s+/g, '_')}.pdf`,
```

Change to:
```javascript
filename: `report_${(reportData.student?.name || 'student').replace(/\s+/g, '_')}_${(reportData.term?.name || 'term').replace(/\s+/g, '_')}.pdf`,
```

## Additional Improvements

Add validation at the beginning of generateReportHTML function:

```javascript
// At the beginning of generateReportHTML function
if (!reportData || typeof reportData !== 'object') {
    console.error('Invalid report data provided to generateReportHTML:', reportData);
    throw new Error('Invalid report data structure');
}

// Check for required data
if (!reportData.student) {
    console.error('Missing student data in report:', reportData);
    throw new Error('Missing student information in report data');
}

if (!reportData.school) {
    console.error('Missing school data in report:', reportData);
    throw new Error('Missing school information in report data');
}

if (!reportData.term) {
    console.error('Missing term data in report:', reportData);
    throw new Error('Missing term information in report data');
}
```