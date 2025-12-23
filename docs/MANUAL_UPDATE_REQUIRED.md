# Manual Update Required for Student Routes

## ⚠️ Important: You need to manually update `routes/student_routes.py`

The file `routes/student_routes.py` contains duplicate code patterns that need to be updated in TWO places. Due to the duplication, automatic replacement wasn't possible.

## What to Update

You need to find and update the code that sends question data to students during exams.

### Location 1: Around line 248-262

**FIND THIS CODE:**
```python
# Create option data with new order indices
options_data = []
for i, option in enumerate(options):
    options_data.append({
        'id': option.id,
        'text': option.text,
        'is_correct': option.is_correct,
        'order': i  # New randomized order
    })

questions_data.append({
    'id': question.id,
    'question_text': question.question_text,
    'question_type': question.question_type,
    'options': options_data
})
```

**REPLACE WITH:**
```python
# Create option data with new order indices
options_data = []
for i, option in enumerate(options):
    options_data.append({
        'id': option.id,
        'text': option.text,
        'is_correct': option.is_correct,
        'order': i,  # New randomized order
        'has_math': getattr(option, 'has_math', False),
        'option_image': getattr(option, 'option_image', None)
    })

questions_data.append({
    'id': question.id,
    'question_text': question.question_text,
    'question_type': question.question_type,
    'options': options_data,
    'has_math': getattr(question, 'has_math', False),
    'question_image': getattr(question, 'question_image', None)
})
```

### Location 2: Around line 688-702

**FIND THE SAME CODE AGAIN** (it appears twice in the file)

**REPLACE WITH THE SAME UPDATED CODE** as above

## How to Find the Code

### Method 1: Search in Your Editor
1. Open `routes/student_routes.py`
2. Search for: `options_data.append`
3. You should find 2 occurrences
4. Update both with the new code

### Method 2: Use Line Numbers
1. Go to line 248 (first occurrence)
2. Update the code
3. Go to line 688 (second occurrence)
4. Update the code again

## What This Does

These changes add support for:
- **Mathematical notation** in questions and options (`has_math` flag)
- **Images** in questions and options (`question_image` and `option_image`)

Without these changes, students won't see:
- Math equations rendered properly
- Images embedded in questions
- Images in answer options

## Verification

After making the changes:

1. **Check syntax**: Make sure no syntax errors
2. **Restart server**: Restart your Flask application
3. **Test**: Create an exam with math questions and verify they display correctly

## Testing Checklist

- [ ] Updated first occurrence (around line 248)
- [ ] Updated second occurrence (around line 688)
- [ ] No syntax errors
- [ ] Server restarts successfully
- [ ] Math questions render with MathJax
- [ ] Images display in questions
- [ ] Images display in options

## Need Help?

If you encounter issues:

1. **Syntax Error**: Check for missing commas, brackets, or quotes
2. **Server Won't Start**: Check Python error messages
3. **Math Not Showing**: Verify the `has_math` field is being sent
4. **Images Not Showing**: Check that `question_image` and `option_image` are included

## Alternative: Use Find and Replace

If you're comfortable with find/replace:

### Find:
```
'order': i  # New randomized order
    })
```

### Replace with:
```
'order': i,  # New randomized order
        'has_math': getattr(option, 'has_math', False),
        'option_image': getattr(option, 'option_image', None)
    })
```

### Then Find:
```
'options': options_data
    })
```

### Replace with:
```
'options': options_data,
        'has_math': getattr(question, 'has_math', False),
        'question_image': getattr(question, 'question_image', None)
    })
```

---

**Once you complete this update, your system will be fully ready to support mathematical notation and images in CBT exams!**
