# CBT Test Page Troubleshooting Guide

## Issue: Seeing Raw JSON Instead of UI

If you're seeing raw JSON data like `[{"question_text": "Convert..."}]` on the page, follow these steps:

### Step 1: Check Your URL

Make sure you're accessing the **correct URL**:

✅ **CORRECT**: `/student/exam/<exam_id>/start`
❌ **WRONG**: `/student/exam/<exam_id>/questions`

The `/questions` endpoint is an API endpoint that returns JSON data. The `/start` endpoint shows the actual test UI.

### Step 2: Clear Browser Cache

1. Press `Ctrl+Shift+Delete` (or `Cmd+Shift+Delete` on Mac)
2. Select "Cached images and files"
3. Click "Clear data"
4. Hard refresh the page: `Ctrl+F5` (or `Cmd+Shift+R` on Mac)

### Step 3: Check Browser Console

1. Open Developer Tools: Press `F12`
2. Go to the "Console" tab
3. Look for any red error messages
4. If you see errors, note them down

### Step 4: Check Network Tab

1. In Developer Tools, go to the "Network" tab
2. Refresh the page
3. Look for `test_with_session.js` in the list
4. Make sure it loads successfully (status 200)
5. Check if `mathjax` scripts are loading

### Step 5: Verify JavaScript is Running

In the browser console, you should see:
```
🎉 CBT Test v2.0 - JavaScript Loaded Successfully!
✅ Keyboard shortcuts enabled: N (next), P (previous), A/B/C/D (select options)
📍 Current URL: ...
```

If you don't see this, JavaScript isn't running.

## Common Fixes

### Fix 1: Restart Flask Server

```bash
# Stop the server (Ctrl+C)
# Then restart it
python app.py
```

### Fix 2: Check File Paths

Make sure these files exist:
- `static/js/student/test_with_session.js`
- `static/js/components/modal.js`
- `templates/student/cbt_test.html`

### Fix 3: Check for Template Errors

If the page shows a Flask error instead of the UI, check the Flask console for error messages.

## MathJax Not Rendering

If math expressions show as `$...$` instead of rendered math:

1. Wait 2-3 seconds for MathJax to load
2. Check browser console for MathJax errors
3. Make sure you see: `MathJax is loaded and ready`
4. Try refreshing the page

## Still Having Issues?

1. Check the Flask server console for error messages
2. Take a screenshot of the browser console errors
3. Note the exact URL you're accessing
4. Check if other pages in the application work correctly
