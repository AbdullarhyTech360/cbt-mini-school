# Mathematical Notation and Image Support Guide

## Overview
Your CBT exam system now supports mathematical equations, scientific notation, and images in questions and options through DOCX uploads.

## Features Implemented

### 1. Database Schema Updates
Added new columns to support rich content:

**Questions Table:**
- `question_image` (TEXT): Stores base64-encoded images
- `has_math` (BOOLEAN): Flags questions containing mathematical notation

**Options Table:**
- `option_image` (TEXT): Stores base64-encoded images for options
- `has_math` (BOOLEAN): Flags options containing mathematical notation

### 2. Mathematical Notation Support

#### Supported Formats:
1. **LaTeX notation** - Inline: `$x^2 + y^2 = z^2$` or Display: `$$\frac{a}{b}$$`
2. **Unicode symbols** - √, ∑, ∫, ∂, ∇, ∞, ≈, ≠, ≤, ≥, ±, ×, ÷
3. **Greek letters** - α, β, γ, δ, θ, λ, μ, π, σ, φ, ω
4. **Superscripts/Subscripts** - x², x³, H₂O
5. **Common patterns** - x^2, sqrt(x), fractions

#### Rendering:
- Uses **MathJax 3** for beautiful mathematical rendering
- Automatically detects and converts mathematical content
- Supports both inline and display math modes

### 3. Image Support

#### From DOCX Files:
- Extracts embedded images automatically
- Converts to base64 data URIs for storage
- Supports PNG, JPEG, and GIF formats
- Images can be in questions or options

#### Display:
- Responsive image sizing
- Rounded corners and shadows for better presentation
- Maintains aspect ratio

## How to Use

### Creating Questions with Math and Images in DOCX

#### Format Example:

```
Question: What is the solution to $x^2 + 5x + 6 = 0$?
Type: MCQ
Options:
- x = 1, 2
- *x = -2, -3
- x = 2, 3
- x = -1, -6

Question: Calculate the area of a circle with radius $r = 5$ cm. Use $\pi = 3.14$
Type: MCQ
Options:
- 15.7 cm²
- 31.4 cm²
- *78.5 cm²
- 157 cm²

Question: What is the chemical formula for water?
Type: Short Answer
Answer: H₂O

Question: Solve: $\frac{3}{4} + \frac{1}{2}$
Type: MCQ
Options:
- $\frac{1}{2}$
- $\frac{3}{4}$
- *$\frac{5}{4}$
- $\frac{7}{4}$
```

#### Adding Images:
1. Simply insert images in your DOCX document
2. Place images after the question text or option text
3. The parser will automatically extract and associate them

### Supported Mathematical Symbols

| Symbol | LaTeX | Unicode | Description |
|--------|-------|---------|-------------|
| Power | `x^{2}` | x² | Superscript |
| Square root | `\sqrt{x}` | √x | Square root |
| Fraction | `\frac{a}{b}` | - | Fraction |
| Sum | `\sum` | ∑ | Summation |
| Integral | `\int` | ∫ | Integration |
| Infinity | `\infty` | ∞ | Infinity |
| Approximately | `\approx` | ≈ | Approximately equal |
| Not equal | `\neq` | ≠ | Not equal |
| Less/Greater | `\leq`, `\geq` | ≤, ≥ | Inequalities |
| Plus-minus | `\pm` | ± | Plus or minus |
| Times | `\times` | × | Multiplication |
| Divide | `\div` | ÷ | Division |

### Greek Letters

| Letter | LaTeX | Unicode |
|--------|-------|---------|
| Alpha | `\alpha` | α |
| Beta | `\beta` | β |
| Gamma | `\gamma` | γ |
| Delta | `\delta` | δ |
| Theta | `\theta` | θ |
| Lambda | `\lambda` | λ |
| Pi | `\pi` | π |
| Sigma | `\sigma` | σ |

## Migration Steps

### 1. Run the Database Migration

```bash
python migrations/add_math_and_image_support.py
```

This will add the new columns to your database.

### 2. Update Existing Code

The following files have been updated:
- `models/question.py` - Added new fields
- `utils/math_content_parser.py` - New parser for math and images
- `utils/question_parser.py` - Enhanced DOCX parsing
- `templates/student/cbt_test.html` - Added MathJax support
- `static/js/student/test_with_session.js` - Enhanced rendering
- `routes/staff_routes.py` - Save math/image data
- `routes/admin_action_routes.py` - Save math/image data

### 3. Update Student Routes (Manual Step Required)

You need to update `routes/student_routes.py` in TWO locations where questions are fetched.

Find this code (appears twice):
```python
options_data.append({
    'id': option.id,
    'text': option.text,
    'is_correct': option.is_correct,
    'order': i
})
```

Replace with:
```python
options_data.append({
    'id': option.id,
    'text': option.text,
    'is_correct': option.is_correct,
    'order': i,
    'has_math': getattr(option, 'has_math', False),
    'option_image': getattr(option, 'option_image', None)
})
```

And find:
```python
questions_data.append({
    'id': question.id,
    'question_text': question.question_text,
    'question_type': question.question_type,
    'options': options_data
})
```

Replace with:
```python
questions_data.append({
    'id': question.id,
    'question_text': question.question_text,
    'question_type': question.question_type,
    'options': options_data,
    'has_math': getattr(question, 'has_math', False),
    'question_image': getattr(question, 'question_image', None)
})
```

## Testing

### 1. Create a Test DOCX File

Create a Word document with:
- Questions with mathematical notation
- Questions with embedded images
- Options with mathematical symbols
- Mixed content (text + math + images)

### 2. Upload via Bulk Upload

1. Go to Staff/Admin dashboard
2. Navigate to "Bulk Upload Questions"
3. Select your test DOCX file
4. Choose subject, class, term, and exam type
5. Upload

### 3. Verify in Student Exam

1. Create an exam with the uploaded questions
2. Take the exam as a student
3. Verify:
   - Mathematical notation renders correctly
   - Images display properly
   - Content is readable and formatted well

## Troubleshooting

### Math Not Rendering
- Check browser console for MathJax errors
- Ensure LaTeX syntax is correct
- Verify `has_math` flag is set in database

### Images Not Showing
- Check image size (very large images may cause issues)
- Verify base64 encoding is correct
- Check browser console for errors

### Upload Failures
- Ensure DOCX file is not corrupted
- Check file size limits
- Verify all required fields are provided
- Check server logs for detailed errors

## Best Practices

1. **Keep images reasonably sized** - Large images increase database size
2. **Use LaTeX for complex equations** - More reliable than Unicode
3. **Test uploads with sample files first** - Verify formatting before bulk uploads
4. **Use consistent notation** - Stick to one style (LaTeX or Unicode)
5. **Preview questions** - Always review uploaded questions before creating exams

## Advanced LaTeX Examples

### Fractions
```latex
$\frac{numerator}{denominator}$
```

### Powers and Roots
```latex
$x^{2}$, $x^{n}$, $\sqrt{x}$, $\sqrt[3]{x}$
```

### Equations
```latex
$ax^2 + bx + c = 0$
```

### Matrices
```latex
$$\begin{matrix} a & b \\ c & d \end{matrix}$$
```

### Integrals and Sums
```latex
$\int_{a}^{b} f(x)dx$, $\sum_{i=1}^{n} x_i$
```

## Support

For issues or questions:
1. Check this guide first
2. Review server logs for errors
3. Test with simple examples
4. Verify database migration completed successfully

## Future Enhancements

Potential improvements:
- Support for chemical formulas (ChemTeX)
- Diagram drawing tools
- Audio/video support
- Interactive graphs
- Formula editor in web interface
