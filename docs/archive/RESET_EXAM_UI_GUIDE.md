# Reset Exam UI Guide

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Reset Student Exam                                             │
│  Allow students to retake exams by resetting their submission  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Select Student *                    Select Exam *              │
│  ┌─────────────────────────┐        ┌─────────────────────┐   │
│  │ Choose a student...    ▼│        │ Select student... ▼ │   │
│  └─────────────────────────┘        └─────────────────────┘   │
│  Search by username or name          Only completed exams      │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 📘 Exam Details                                           │ │
│  │                                                           │ │
│  │ Student: John Doe                Exam: Math-Midterm      │ │
│  │ Score: 85/100                    Status: Completed       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ⚠️  Warning                                               │ │
│  │ Resetting an exam will permanently delete the student's   │ │
│  │ previous attempt, including their score and answers.      │ │
│  │ This action cannot be undone.                             │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐                           │
│  │ 🔄 Reset Exam│  │  Clear Form  │                           │
│  └──────────────┘  └──────────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## UI States

### 1. Initial State
- Student dropdown: Enabled, showing all active students
- Exam dropdown: Disabled, showing "Select student first..."
- Reset button: Disabled
- Details panel: Hidden

### 2. Student Selected
- Student dropdown: Shows selected student
- Exam dropdown: Enabled, loading completed exams
- Status message: "Loading completed exams..."
- Reset button: Disabled
- Details panel: Hidden

### 3. Exams Loaded (Has Completed Exams)
- Student dropdown: Shows selected student
- Exam dropdown: Enabled, showing completed exams with scores
- Status message: "X completed exam(s) found" (green)
- Reset button: Disabled (until exam selected)
- Details panel: Hidden

### 4. Exams Loaded (No Completed Exams)
- Student dropdown: Shows selected student
- Exam dropdown: Disabled, showing "No completed exams found"
- Status message: "This student has not completed any exams yet" (yellow)
- Reset button: Disabled
- Details panel: Hidden

### 5. Exam Selected (Ready to Reset)
- Student dropdown: Shows selected student
- Exam dropdown: Shows selected exam with score
- Status message: "X completed exam(s) found" (green)
- Reset button: Enabled (red gradient)
- Details panel: Visible, showing all exam details

### 6. Resetting (Loading)
- All inputs: Disabled
- Reset button: Shows spinner "Resetting..."
- Details panel: Visible

### 7. Reset Complete
- Form: Cleared
- Success message: Modal showing success
- All fields: Reset to initial state

## Color Scheme

### Light Mode
- Background: White (#FFFFFF)
- Text: Gray-900 (#111827)
- Borders: Gray-300 (#D1D5DB)
- Primary: Blue (#3B82F6)
- Success: Green (#10B981)
- Warning: Yellow (#F59E0B)
- Error: Red (#EF4444)

### Dark Mode
- Background: Gray-800 (#1F2937)
- Text: White (#FFFFFF)
- Borders: Gray-700 (#374151)
- Primary: Blue (#3B82F6)
- Success: Green (#10B981)
- Warning: Yellow (#F59E0B)
- Error: Red (#EF4444)

## Interactive Elements

### Student Dropdown
- Shows: `username - First Name Last Name`
- Example: `STU001 - John Doe`
- Searchable by typing
- Scrollable list

### Exam Dropdown
- Shows: `Exam Name - Subject (Score: X/Y)`
- Example: `JSS1-Mathematics-Mid Term - Mathematics (Score: 85/100)`
- Only shows completed exams
- Disabled until student selected

### Reset Button
- Default: Disabled (gray, 50% opacity)
- Enabled: Red gradient with hover effect
- Loading: Shows spinner animation
- Icon: Circular arrows (reset symbol)

### Clear Form Button
- Gray background
- Hover effect
- Resets entire form to initial state

## Confirmation Modal

```
┌─────────────────────────────────────────────┐
│  Confirm Exam Reset                         │
├─────────────────────────────────────────────┤
│                                             │
│  Are you sure you want to reset the exam   │
│  "JSS1-Mathematics-Mid Term" for John Doe? │
│                                             │
│  This will permanently delete their score   │
│  of 85/100 and allow them to retake the    │
│  exam. This action cannot be undone.       │
│                                             │
│  ┌──────────────────┐  ┌────────────────┐ │
│  │ Yes, Reset Exam  │  │     Cancel     │ │
│  └──────────────────┘  └────────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

## Success Message

```
┌─────────────────────────────────────────────┐
│  ✓ Success                                  │
├─────────────────────────────────────────────┤
│                                             │
│  Exam reset successfully!                   │
│                                             │
│  John Doe can now retake                    │
│  "JSS1-Mathematics-Mid Term".              │
│                                             │
│  ┌────────────────┐                        │
│  │       OK       │                        │
│  └────────────────┘                        │
│                                             │
└─────────────────────────────────────────────┘
```

## Responsive Design

### Desktop (≥768px)
- Two-column grid for student and exam selection
- Full-width details panel
- Side-by-side buttons

### Mobile (<768px)
- Single-column layout
- Stacked form fields
- Full-width buttons
- Scrollable content

## Accessibility Features

- Proper label associations
- Required field indicators (*)
- Clear error messages
- Keyboard navigation support
- Focus indicators
- Screen reader friendly
- High contrast in dark mode
- Touch-friendly button sizes (48px minimum)

## Status Messages

| Scenario | Message | Color |
|----------|---------|-------|
| Initial | "Only completed exams will be shown" | Gray |
| Loading | "Loading completed exams..." | Blue |
| Success | "X completed exam(s) found" | Green |
| No exams | "This student has not completed any exams yet" | Yellow |
| Error | "Failed to load exams. Please try again." | Red |

## Best Practices

1. Always select student first before exam
2. Review exam details before resetting
3. Read the warning message carefully
4. Confirm the action in the modal
5. Wait for success message before closing
6. Use Clear Form to start over if needed
