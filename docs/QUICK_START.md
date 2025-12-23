# Quick Start: Math & Image Support

## 3-Minute Setup Guide

### Step 1: Run Migration (30 seconds)
```bash
python migrations/add_math_and_image_support.py
```

Expected output:
```
✓ Successfully added math and image support columns
```

### Step 2: Update Student Routes (1 minute)

Open `routes/student_routes.py` and find these two lines (appears twice):

**Find:**
```python
'order': i  # New randomized order
```

**Add after it:**
```python
'has_math': getattr(option, 'has_math', False),
'option_image': getattr(option, 'option_image', None)
```

**Then find:**
```python
'options': options_data
```

**Add after it:**
```python
'has_math': getattr(question, 'has_math', False),
'question_image': getattr(question, 'question_image', None)
```

### Step 3: Restart Server (30 seconds)
```bash
# Stop current server (Ctrl+C)
python app.py
```

### Step 4: Test (1 minute)

1. Create a Word document with:
```
Question: What is $x^2 + 5x + 6 = 0$?
Type: MCQ
Options:
- x = 1, 2
- *x = -2, -3
- x = 2, 3
```

2. Upload via "Bulk Upload Questions"
3. Create an exam
4. Take exam as student
5. Verify math renders correctly

## Done! 🎉

Your system now supports:
- ✅ Mathematical equations
- ✅ Scientific notation
- ✅ Images in questions
- ✅ Images in options

## Need More Help?

- **Full Guide:** `MATH_AND_IMAGE_SUPPORT_GUIDE.md`
- **Examples:** `SAMPLE_MATH_QUESTIONS_TEMPLATE.md`
- **Symbols:** `MATH_SYMBOLS_QUICK_REFERENCE.md`
- **Troubleshooting:** `IMPLEMENTATION_COMPLETE.md`

## Common Symbols to Copy-Paste

```
² ³ √ ± × ÷ ≈ ≠ ≤ ≥ ∞
α β γ δ θ λ μ π σ φ ω
H₂O CO₂ x₁ x₂
```

## LaTeX Quick Examples

```
$x^2$              → x²
$\frac{a}{b}$      → fraction
$\sqrt{x}$         → √x
$\sum_{i=1}^{n}$   → summation
$\int x dx$        → integral
```

---

**That's it! Start creating math-rich exams now!** 🚀
