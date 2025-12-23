# How to Convert Word Equations to LaTeX

## Method 1: Word's Built-in Conversion (Easiest!)

**Word 2016+ has LaTeX support built-in!**

### Steps:

1. **Open your Word document**

2. **Click on an equation** to select it

3. **Look at the equation toolbar** that appears

4. **Click the dropdown arrow** (usually says "Professional")

5. **Select "Linear"** format

6. **The equation converts to LaTeX-like format!**

### Example:

**Before (Professional format):**
```
[Visual equation showing integral]
```

**After (Linear format):**
```
∫2x dx
```

**Then manually add $ signs:**
```
$\int 2x dx$
```

### For All Equations:

1. Select equation
2. Press `Ctrl + Shift + =` (converts to linear)
3. Add `$` at start and end
4. Done!

## Method 2: Use Mathpix Snip (Best for Complex Equations!)

### What is Mathpix?
- **Free tool** that converts equation screenshots to LaTeX
- **Website:** https://mathpix.com/
- **Free tier:** 50 conversions/month
- **Accuracy:** 99%+

### How to Use:

1. **Download Mathpix Snip** from https://mathpix.com/

2. **Open your Word document**

3. **Press the Mathpix hotkey** (usually `Ctrl + Alt + M`)

4. **Select the equation** with your mouse

5. **Get instant LaTeX code!**

6. **Copy and paste** into your Word document

### Example:

**Screenshot this:** ∫₀¹ x² dx

**Get this:** `\int_{0}^{1} x^2 dx`

**Use this:** `$\int_{0}^{1} x^2 dx$`

## Method 3: Use Python Script (For Bulk Conversion)

I've created a script for you!

### Setup:

```bash
pip install python-docx lxml
```

### Usage:

```bash
python convert_word_equations_to_latex.py input.docx output.docx
```

### Example:

```bash
python convert_word_equations_to_latex.py my_questions.docx my_questions_latex.docx
```

**Note:** This is a basic converter. Review the output and fix any issues manually.

## Method 4: Manual Conversion Reference

### Common Conversions:

| Word Equation | LaTeX Code | Wrapped |
|---------------|------------|---------|
| ∫ 2x dx | `\int 2x dx` | `$\int 2x dx$` |
| x² | `x^2` | `$x^2$` |
| x₂ | `x_2` | `$x_2$` |
| √x | `\sqrt{x}` | `$\sqrt{x}$` |
| ½ | `\frac{1}{2}` | `$\frac{1}{2}$` |
| ∑ᵢ₌₁ⁿ | `\sum_{i=1}^{n}` | `$\sum_{i=1}^{n}$` |
| α | `\alpha` | `$\alpha$` |
| → | `\rightarrow` | `$\rightarrow$` |

### Operators:

| Symbol | LaTeX |
|--------|-------|
| + | `+` |
| - | `-` |
| × | `\times` |
| ÷ | `\div` |
| = | `=` |
| ≠ | `\neq` |
| ≈ | `\approx` |
| ≤ | `\leq` |
| ≥ | `\geq` |
| ± | `\pm` |

## Step-by-Step: Converting Your Questions

### Your Current Question:
```
Question: [Equation Editor: ∫2x dx]
```

### Step 1: Click the equation in Word

### Step 2: Press Ctrl + Shift + = (or select "Linear" format)

### Step 3: You'll see something like:
```
∫2x dx
```

### Step 4: Manually convert to LaTeX:
```
Question: Find $\int 2x \, dx$
```

**Note:** Add `\,` for spacing between 2x and dx

### Step 5: Save and upload!

## Complete Example Conversion

### Original Word Document (with Equation Editor):
```
Question: [Equation: ∫2x dx]
Type: MCQ
Options:
- [Equation: x⁶]
- [Equation: x²]
- none
```

### Converted to LaTeX:
```
Question: Find $\int 2x \, dx$
Type: MCQ
Options:
- $x^6$
- *$x^2 + C$
- none of the options
```

## Tips for Success

### ✅ DO:
1. **Use Mathpix** for complex equations (fastest!)
2. **Use Word's Linear format** for simple equations
3. **Add spacing** with `\,` where needed
4. **Test with 2-3 questions** first
5. **Keep a LaTeX reference** handy

### ❌ DON'T:
1. **Don't forget $ signs** - equations need `$...$`
2. **Don't skip spaces** - use `\,` or `\:` for spacing
3. **Don't mix formats** - be consistent
4. **Don't forget operators** - add `+`, `-`, etc.

## LaTeX Spacing Commands

```
$a b$          → ab (no space)
$a \, b$       → a b (small space)
$a \: b$       → a  b (medium space)
$a \; b$       → a   b (large space)
$a \quad b$    → a    b (quad space)
```

## Testing Your Conversions

After converting:

1. **Save the Word document**
2. **Upload to CBT system**
3. **Create a test exam**
4. **Take the exam as student**
5. **Verify all symbols appear**
6. **If good, continue!**

## Recommended Workflow

### For New Questions:
1. Type LaTeX directly (no conversion needed!)
2. Example: `$\int 2x dx$`

### For Existing Questions:
1. Use Mathpix Snip (screenshot → LaTeX)
2. Or use Word's Linear format
3. Or use the Python script
4. Review and fix manually

## Common Issues & Fixes

### Issue: Integral sign missing
**Before:** `$2x dx$`
**Fix:** `$\int 2x \, dx$`

### Issue: No space between terms
**Before:** `$2xdx$`
**Fix:** `$2x \, dx$`

### Issue: Plus sign missing
**Before:** `$\frac{1}{5}\frac{3}{5}$`
**Fix:** `$\frac{1}{5} + \frac{3}{5}$`

### Issue: Subscripts not showing
**Before:** `$H2O$`
**Fix:** `$H_2O$`

## Resources

### Learn LaTeX:
- **Overleaf Tutorial:** https://www.overleaf.com/learn/latex/Mathematical_expressions
- **Detexify:** http://detexify.kirelabs.org/classify.html (draw symbol → get LaTeX)
- **LaTeX Wikibook:** https://en.wikibooks.org/wiki/LaTeX/Mathematics

### Tools:
- **Mathpix Snip:** https://mathpix.com/ (screenshot → LaTeX)
- **Equation Editor:** https://www.codecogs.com/latex/eqneditor.php
- **LaTeX Live Editor:** https://latexeditor.lagrida.com/

## Summary

**Best Method:** Use **Mathpix Snip**
- Screenshot equation
- Get LaTeX instantly
- Copy to Word
- Upload

**Alternative:** Use **Word's Linear format**
- Click equation
- Press Ctrl + Shift + =
- Add $ signs
- Upload

**For Bulk:** Use the **Python script**
- Run on entire document
- Review output
- Fix any issues
- Upload

---

**Bottom Line:** Converting Word equations to LaTeX is possible and actually quite easy with the right tools. Mathpix Snip is the fastest for complex equations!
