# PDF Layout Improvements

## Issue Description

PDFs were being generated with layout issues:
1. Content width appeared too narrow
2. Subject score tables were breaking across pages instead of staying together

## Root Causes

### 1. Narrow Page Margins
Default margins were too wide, reducing available content area.

### 2. Portrait Orientation Limitation
Portrait orientation constrained horizontal space for tables with many columns.

### 3. Inadequate Page Break Control
Lack of specific page break avoidance for table elements.

### 4. Suboptimal CSS Styling
Font sizes and spacing were not optimized for PDF output.

## Fixes Applied

### 1. Improved Page Dimensions
```javascript
// Changed from portrait to landscape orientation for more horizontal space
jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }

// Reduced side margins to maximize content width
margin: [0.5, 0.3, 0.5, 0.3] // top, right, bottom, left
```

### 2. Enhanced Page Break Control
```javascript
pagebreak: { 
    mode: ['avoid-all', 'css', 'legacy'],
    before: '.page-break-before',
    after: '.page-break-after',
    avoid: 'tr, th, td, .no-page-break'
}
```

### 3. Optimized CSS for PDF Output
- Reduced overall font sizes (12px base, smaller for table elements)
- Tightened spacing and padding throughout
- Added `table-layout: auto` for better column distribution
- Added `no-page-break` class to prevent table fragmentation

### 4. Table-Specific Improvements
```html
<table class="no-page-break">
```

## Expected Results

1. **Wider Content Area** - Landscape orientation provides more horizontal space
2. **Reduced Page Breaks** - Tables stay together on single pages
3. **Better Space Utilization** - Reduced margins maximize content area
4. **Improved Readability** - Optimized font sizes and spacing for printed documents
5. **Consistent Layout** - Tables and content blocks maintain integrity

## Testing Verification

After applying these fixes, the system should:
- Generate PDFs with appropriate width for content
- Keep subject tables on single pages without breaking
- Maintain readable font sizes and proper spacing
- Preserve all content without truncation
- Maintain professional appearance

## Rollback Plan

If issues persist, the changes can be reverted by:
1. Changing orientation back to portrait
2. Restoring original margin settings
3. Removing page break control enhancements
4. Reverting CSS optimizations to original values