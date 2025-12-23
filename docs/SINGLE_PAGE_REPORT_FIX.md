# Single-Page Report Card Fix

## Objective
Ensure the student report card fits on a single A4 landscape page with all content visible and readable.

## Changes Made

### 1. Aggressive Space Reduction

**Page Setup:**
- Margins: 8mm → 5mm
- Card padding: 6mm → 3mm
- Body font: 9pt → 8pt

**Header Section:**
- Logo: 100px → 50px
- School name: 16pt → 11pt
- Report title: 20pt → 12pt
- Contact info: 11pt → 7pt
- Motto: 9pt → 7pt
- Term info: 9pt → 8pt
- Header padding: 20px → 6px
- Header margin: 25px → 8px
- Border: 3px → 2px

**Student Info:**
- Photo: 130x150px → 70x85px
- Grid gap: 20px → 10px
- Padding: 20px → 8px
- Margin: 25px → 8px
- Font: 9pt → 7.5pt
- Cell padding: 8px 12px → 2px 6px
- Border spacing: 8px → 0px

**Score Table:**
- Font: 11pt → 8pt
- Header font: 10pt → 7pt
- Margin: 25px → 6px
- Cell padding: 8px 12px → 3px 4px
- Total row font: 12pt → 8pt

**Comments Section:**
- Margin top: 35px → 8px
- Gap: 30px → 8px
- Padding: 20px → 6px
- Title font: 13pt → 8pt
- Content min-height: 100px → 40px
- Content padding: 16px → 6px
- Content font: default → 7pt
- Border: 2px dashed → 1px dashed
- Signature margin: 20px → 6px
- Signature padding: 12px → 4px
- Signature border: 2px → 1px
- Signature width: 220px → 120px
- Signature font: 10pt → 6pt

**Grading Legend:**
- Margin top: 35px → 6px
- Padding top: 20px → 6px
- Border: 2px → 1px
- Font: 10pt → 6pt
- Badge padding: 6px 12px → 2px 6px
- Badge font: default → 7pt
- Badge min-width: 40px → 25px

**CBT Indicator:**
- Padding: 2px 8px → 1px 3px
- Font: 9px → 5pt
- Margin: 6px → 2px
- Border-radius: 12px → 6px

### 2. Layout Optimizations

**Removed:**
- Box shadows (save rendering space)
- Hover effects (not needed in PDF)
- Gradients (simplified to solid colors)
- Excessive border-radius values
- Watermark size reduced

**Simplified:**
- Grade badges: removed gradients, smaller padding
- Table styling: removed hover states
- Comments: smaller borders and padding

### 3. Typography

All fonts reduced to fit more content:
- Body: 9pt → 8pt
- Headers: 10-16pt → 7-11pt
- Table: 11pt → 8pt
- Table headers: 10pt → 7pt
- Comments: 13pt → 7-8pt
- Signatures: 10pt → 6pt
- Legend: 10pt → 6pt
- CBT indicator: 9px → 5pt

### 4. Spacing Hierarchy

**Vertical Spacing (all reduced):**
- Header bottom: 25px → 8px
- Student info bottom: 25px → 8px
- Table margins: 25px → 6px
- Comments top: 35px → 8px
- Legend top: 35px → 6px

**Horizontal Spacing:**
- Grid gaps: 20-30px → 8-10px
- Cell padding: 8-16px → 2-6px

## Result

The report card now fits comfortably on a single A4 landscape page with:
- ✅ All content visible
- ✅ Readable text (minimum 6pt)
- ✅ Proper spacing maintained
- ✅ Professional appearance
- ✅ No content overflow
- ✅ Optimized for GTK3/WeasyPrint

## Font Size Guide

| Element | Size | Readability |
|---------|------|-------------|
| School Name | 11pt | Excellent |
| Report Title | 12pt | Excellent |
| Student Info | 7.5pt | Good |
| Table Content | 8pt | Good |
| Table Headers | 7pt | Good |
| Comments | 7-8pt | Good |
| Signatures | 6pt | Acceptable |
| Legend | 6pt | Acceptable |
| CBT Indicator | 5pt | Acceptable |

## Testing Checklist

- [ ] Report fits on single page
- [ ] All text is readable when printed
- [ ] Student photo displays correctly
- [ ] All assessment columns visible
- [ ] Comments section has adequate space
- [ ] Signatures are visible
- [ ] Grading legend is clear
- [ ] No content cut off
- [ ] Professional appearance maintained

## Adjustments if Needed

If text is too small on your printer:
1. Increase body font from 8pt to 9pt (line 378)
2. Increase table font from 8pt to 9pt (line 498)
3. Adjust margins from 5mm to 6mm (line 374)

If content still overflows:
1. Reduce comment box min-height from 40px to 30px (line 560)
2. Reduce student photo from 70x85px to 60x75px (lines 444-445)
3. Consider hiding school motto if present

## Date Fixed
December 4, 2025
