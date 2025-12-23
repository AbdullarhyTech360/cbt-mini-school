# Math Rendering - Known Issues & Solutions

## Current Status

✅ **Working:**
- Square roots: √81
- Fractions: ½, ¾, or formatted fractions
- Powers: x², x³
- Subscripts: H₂O, CO₂
- Basic equations
- Unicode symbols

⚠️ **Partially Working:**
- Complex equations from Word Equation Editor
- Integrals (∫)
- Summations (∑)
- Mixed text and equations

## Why Some Symbols Don't Appear

Word's Equation Editor uses a complex XML format (OMML - Office Math Markup Language) that's difficult to convert perfectly to LaTeX. The system extracts the text content, but some formatting is lost.

### Examples of Issues:

1. **Integral sign missing:** `∫ 2x dx` might appear as `2x dx`
2. **Plus signs missing:** `1/5 + 3/5` might appear as `1/5 3/5`
3. **Order changed:** Chemistry formulas might rearrange

## Solutions & Workarounds

### Option 1: Use Simple Text with Unicode (Recommended for Now)

Instead of using Word's Equation Editor, type directly with Unicode symbols:

```
Question: Simplify √81
Type: MCQ
Options:
- 1
- *9
- 5
- 81
```

**Unicode symbols you can copy-paste:**
```
√ ² ³ ± × ÷ ≈ ≠ ≤ ≥ ∞
α β γ δ θ λ μ π σ φ ω
₀ ₁ ₂ ₃ ₄ ₅ ₆ ₇ ₈ ₉
```

### Option 2: Use LaTeX Directly

Type LaTeX notation directly in your Word document:

```
Question: Solve $x^2 + 5x + 6 = 0$
Type: MCQ
Options:
- x = 1, 2
- *x = -2, -3
- x = 2, 3
```

**Common LaTeX:**
- `$x^2$` → x²
- `$\sqrt{81}$` → √81
- `$\frac{1}{2}$` → ½
- `$\int 2x dx$` → ∫2x dx
- `$\sum_{i=1}^{n}$` → Σ
- `$H_2O$` → H₂O

### Option 3: Use Images for Complex Equations

For very complex equations:
1. Create the equation in Word
2. Take a screenshot
3. Insert the image in your Word document
4. The system will extract and display it

## What Works Best

### ✅ Good Examples:

**Simple Math:**
```
Question: What is 5 + 3?
Answer: 8
```

**With Unicode:**
```
Question: Simplify √16
Answer: 4
```

**With LaTeX:**
```
Question: Solve $x^2 = 9$
Answer: $x = ±3$
```

**Chemistry with Subscripts:**
```
Question: What is the formula for water?
Answer: H₂O
```

### ❌ Problematic Examples:

**Complex Equation Editor:**
```
Question: [Complex integral with limits from Word Equation Editor]
Result: Some symbols missing
```

**Solution:** Use LaTeX instead:
```
Question: Calculate $\int_{0}^{1} x^2 dx$
```

## Current Limitations

1. **OMML to LaTeX conversion is imperfect** - Word's equation format is proprietary
2. **Some operators get lost** - Especially +, -, ∫, ∑ in complex equations
3. **Order can change** - Especially in chemical formulas

## Recommended Workflow

### For Simple Questions:
1. Type normally with Unicode symbols
2. No need for Equation Editor

### For Math Questions:
1. Use LaTeX notation directly: `$x^2 + 5x + 6$`
2. Or use simple Unicode: `x² + 5x + 6`

### For Complex Equations:
1. Use LaTeX notation
2. Or insert as image

### For Chemistry:
1. Use subscripts: H₂O, CO₂
2. Or LaTeX: `$H_2O$`, `$CO_2$`

## Testing Your Questions

After uploading, always:
1. Create a test exam
2. Take it as a student
3. Verify all symbols appear correctly
4. If not, re-upload with different format

## Future Improvements

Possible enhancements:
1. Better OMML parser (using specialized library)
2. Image-based equation rendering
3. Built-in equation editor in web interface
4. MathML support

## Quick Reference

### Copy-Paste Symbols:

**Math:**
```
√ ∛ ∜ ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹ ⁰
± ∓ × ÷ ≈ ≠ ≤ ≥ < > ∞
∑ ∏ ∫ ∂ ∇ Δ
```

**Greek:**
```
α β γ δ ε ζ η θ ι κ λ μ
ν ξ ο π ρ σ τ υ φ χ ψ ω
```

**Subscripts:**
```
₀ ₁ ₂ ₃ ₄ ₅ ₆ ₇ ₈ ₉
```

**Superscripts:**
```
⁰ ¹ ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹
```

### LaTeX Quick Reference:

```
$x^2$              → x²
$x_2$              → x₂
$\frac{a}{b}$      → a/b (fraction)
$\sqrt{x}$         → √x
$\sqrt[3]{x}$      → ³√x
$\int$             → ∫
$\sum$             → Σ
$\prod$            → Π
$\alpha$           → α
$\beta$            → β
$\pi$              → π
$\infty$           → ∞
$\pm$              → ±
$\times$           → ×
$\div$             → ÷
$\leq$             → ≤
$\geq$             → ≥
$\neq$             → ≠
$\approx$          → ≈
```

## Tips

1. **Test with simple questions first**
2. **Use Unicode for simple symbols**
3. **Use LaTeX for complex equations**
4. **Use images as last resort**
5. **Always preview before publishing**

## Getting Help

If equations aren't rendering:
1. Check browser console for errors
2. Verify MathJax loaded (Network tab)
3. Try simpler notation
4. Use images for complex cases

---

**Remember:** The system works best with simple, clear notation. Complex Word Equation Editor content may not convert perfectly.
