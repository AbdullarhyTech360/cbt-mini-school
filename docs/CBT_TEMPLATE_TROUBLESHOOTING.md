# CBT Template Troubleshooting Guide

## ✅ What Has Been Implemented

### 1. Beautiful Modern Design
- ✅ Purple/pink gradient theme
- ✅ Glass-morphism effects
- ✅ Smooth animations
- ✅ Professional shadows and depth

### 2. Student Information (Left Sidebar - Desktop Only)
- ✅ **Full Name**: Shows `first_name + last_name`
- ✅ **Username**: With @ prefix
- ✅ **Registration Number**: If available
- ✅ **Profile Image/Avatar**: Shows actual image or initials in gradient circle
- ✅ **Student Role Badge**: Blue badge showing "Student"
- ✅ **Online Status**: Green dot indicator

### 3. School Details (Left Sidebar)
- ✅ School name
- ✅ Academic session (from exam.school_term)
- ✅ Term name and examination type
- ✅ Student's class name

### 4. Exam Details (Left Sidebar)
- ✅ Subject name and code
- ✅ Exam type
- ✅ Exam date
- ✅ Total questions (dynamically updated)
- ✅ Duration
- ✅ Maximum score

### 5. Instructions (Left Sidebar)
- ✅ Quick instructions with checkmarks
- ✅ Keyboard shortcuts guide with styled badges
- ✅ Visual keyboard hint badges (N, P, A, B, C, D)

### 6. Invigilator Information (Left Sidebar Bottom)
- ✅ Invigilator's full name (from exam.invigilator)
- ✅ Invigilator's profile image or initials
- ✅ Falls back to "System Monitored" if no invigilator

### 7. Keyboard Shortcuts (Fully Functional)
- ✅ **N** - Next question
- ✅ **P** - Previous question
- ✅ **A, B, C, D** - Select corresponding options
- ✅ Visual hints on buttons and options
- ✅ Prevents conflicts with input fields

### 8. Beautiful Question Navigation (Right Sidebar)
- ✅ Larger buttons (12x12 with rounded-xl)
- ✅ Gradient backgrounds
- ✅ Hover effects with scale and shadow
- ✅ Ripple animation on hover
- ✅ Color coding:
  - **Purple gradient** - Current question
  - **Green gradient** - Answered questions
  - **White with border** - Unanswered questions

### 9. Enhanced Options Display
- ✅ Large letter badges (A, B, C, D) in gradient boxes
- ✅ Keyboard hint badges on each option
- ✅ Selected options have full gradient background
- ✅ Smooth hover animations

### 10. Mobile Responsive
- ✅ Floating action button for question navigator
- ✅ Bottom sheet modal for question grid
- ✅ Optimized layout for all screen sizes

## 🔧 If You Don't See the Changes

### Step 1: Clear Browser Cache
**This is the most common issue!**

#### Chrome/Edge:
1. Press `Ctrl + Shift + Delete`
2. Select "Cached images and files"
3. Click "Clear data"
4. Or use `Ctrl + F5` to hard refresh

#### Firefox:
1. Press `Ctrl + Shift + Delete`
2. Select "Cache"
3. Click "Clear Now"
4. Or use `Ctrl + Shift + R` to hard refresh

### Step 2: Verify Template Version
Look for a small green badge showing "v2.0" in the top-left corner of the page. If you see this, the new template is loaded!

### Step 3: Check Flask App is Running
```bash
python app.py
```

### Step 4: Test with Incognito/Private Window
Open the page in an incognito/private browsing window to bypass cache completely.

### Step 5: Verify You're Logged In
1. Login as a student user (e.g., `student1`)
2. Navigate to an exam start page

### Step 6: Check Console for Errors
1. Press `F12` to open Developer Tools
2. Go to "Console" tab
3. Look for any red error messages
4. Share any errors you see

## 📱 Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Left Sidebar (Desktop)  │  Main Content  │  Right Sidebar  │
│  - Student Profile       │  - Header      │  - Question     │
│  - School Info           │  - Timer       │    Navigator    │
│  - Exam Details          │  - Progress    │  - Legend       │
│  - Instructions          │  - Question    │                 │
│  - Keyboard Shortcuts    │  - Options     │                 │
│  - Invigilator Info      │  - Navigation  │                 │
└─────────────────────────────────────────────────────────────┘
```

## 🎨 Visual Features

1. **Gradient Background**: Purple to pink gradient on body
2. **Glass Effect**: Semi-transparent white panels with blur
3. **Smooth Animations**: All buttons and cards have hover effects
4. **Color-Coded Navigation**: Easy to see which questions are answered
5. **Keyboard Hints**: Visual badges showing keyboard shortcuts
6. **Progress Bar**: Gradient progress bar showing completion
7. **Timer**: Prominent timer with warning animation when low

## 🐛 Known Issues

1. **Sidebar only shows on large screens (lg breakpoint)**: This is intentional for better mobile experience
2. **Material Symbols may not load immediately**: They're loaded from Google Fonts CDN
3. **MathJax rendering**: May take a moment to render mathematical notation

## ✅ Test Checklist

- [ ] Can you see the purple gradient background?
- [ ] Can you see the left sidebar with student info? (Desktop only)
- [ ] Can you see the right sidebar with question numbers? (Desktop only)
- [ ] Can you see keyboard shortcut badges (N, P, A, B, C, D)?
- [ ] Do the keyboard shortcuts work?
- [ ] Do question navigation buttons change color when answered?
- [ ] Can you see the invigilator information at the bottom of left sidebar?
- [ ] Does the timer display correctly?
- [ ] Do the options have letter badges (A, B, C, D)?

## 📞 Still Having Issues?

If you've tried all the above and still don't see the changes:

1. **Take a screenshot** of what you're seeing
2. **Check the browser console** (F12) for errors
3. **Verify the URL** you're accessing
4. **Confirm you're logged in** as a student
5. **Try a different browser**

## 🎯 Quick Test

Run this test script to verify data is available:
```bash
python test_template_render.py
```

This will show you:
- Test user information
- Test exam information
- Invigilator information
- Direct URL to test the page
