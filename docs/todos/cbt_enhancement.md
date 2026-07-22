# CBT System Enhancement

This enhancement introduces a comprehensive suite of features and improvements to the Computer-Based Testing (CBT) system. Key objectives include:
*   **Customizable Configuration:** Replacing hard-coded or static settings with a dynamic, user-friendly configuration interface.
*   **Improved User Experience:** Enhancing the visual design and usability of the CBT platform for all users.
*   **Expanded Functionality:** Adding new tools to support diverse testing scenarios.
*   **Code Quality & Security:** Fixing critical bugs, removing dead code, and addressing security concerns.

## User Roles and Permissions

*   **Administrators:**  
    Admins have full control over the CBT system. They can configure system settings tailored to their school's needs, manage exams, and monitor exam analytics. Admins can also view all exams conducted within the system.

*   **Teachers:**  
    Teachers can access and review pre-configured CBT exams assigned to their students. They can also utilize tools like the built-in calculator to assist with exam preparation or grading support.

*   **Students:**  
    Students can participate in CBT exams. If the feedback option is enabled, they receive immediate feedback on their performance, including detailed insights into correct and incorrect answers to aid learning.

---

## Priority 0 — Critical Fixes

These must be resolved before any new feature work. They address security, data correctness, and dead code.

### 1. XSS Sanitization on Question Rendering
**File:** `static/js/student/test_with_session.js:288`
`innerHTML` is used without sanitization to render question text. This is a security risk.
**Fix:** Use DOMPurify or a sanitization function before setting innerHTML, while still allowing MathJax rendering.

### 2. Fix Hardcoded School Name Fallback
**File:** `templates/student/cbt_test.html:218`
The template falls back to `"Greenwood High School"` instead of using dynamic school data.
**Fix:** Pass school data to the template from the route and use a dynamic fallback from settings.

### 3. Remove Dead `test.js` Code
**Files:** `static/js/student/test.js` (367 lines)
Two competing exam-taking scripts exist: `test.js` (array-based) and `test_with_session.js` (object-based). Only `test_with_session.js` is loaded. `test.js` is dead code.
**Fix:** Remove `test.js` or clearly mark it as legacy/deprecated.

### 4. Use GradeScale Model Instead of Hardcoded Grades
**File:** `routes/student_routes.py:444-453`
Letter grades are hardcoded (A≥70%, B≥59%, etc.) instead of using the existing `GradeScale` model.
**Fix:** Replace hardcoded grading logic with a lookup against the `GradeScale` model.

### 5. Extract Duplicate Enrollment Logic into Helper
**File:** `routes/student_routes.py:26-93`
The enrollment + auto-enroll logic is copy-pasted across `exam_details`, `start_exam`, `get_exam_questions`, and `submit_exam`.
**Fix:** Extract into a reusable helper function `check_and_enroll_student(user, exam)`.

---

## Priority 1 — New Features (Enhancement Doc)

These are the core new features requested in the original enhancement document.

### 6. Calculator Tool
**Status:** Not yet implemented. No frontend or backend calculator exists.
**Plan:**
- Create `static/js/components/calculator.js` — a draggable scientific/standard calculator.
- Add calculator toggle button to `cbt_test.html` header (next to dark mode toggle).
- Make it configurable per-exam (admin can enable/disable calculator per exam).
- Add `calculator_enabled` boolean field to `Exam` model.
- Add admin setting to toggle calculator availability globally.

### 7. On-The-Go Tests
**Status:** `Exam` model supports `is_on_the_go` and `save_after_completion` fields, but no admin UI exists for creating them.
**Plan:**
- Add "On-The-Go Test" tab or toggle in the admin exam creation modal (`exams.html` / `exams.js`).
- Allow On-The-Go tests to bypass term/scheduling constraints.
- Add admin setting to toggle On-The-Go tests globally.
- Ensure On-The-Go tests appear in student dashboard when available.

### 8. CBT Configuration Section in Admin Settings
**Status:** Settings page has permissions, school info, terms, sections, assessments — but no dedicated CBT configuration section.
**Plan:** Add a new `<details>` section in `settings.html` for "CBT Configuration" covering:
- Enabling/disabling calculator per exam.
- On-The-Go test settings (save vs discard).
- Feedback options (detailed vs summary).
- Timer warning threshold (currently hardcoded at 5 min).

### 9. Post-Exam Feedback Page
**Status:** No feedback UI exists — only a score popup after submission.
**Plan:** Create a post-exam results page showing:
- Score breakdown per question.
- Correct/incorrect indicators.
- Explanations (if provided by teacher).
- Performance summary chart.
- Show only if `show_feedback` is enabled on the exam.

---

## Priority 2 — UX Improvements

These improve the existing user experience without adding new features.

### 10. Question Flag/Review Feature
Students cannot flag questions for later review. The question navigator only shows answered/unanswered/current states.
**Plan:** Add a "flagged" state with a visual indicator (e.g., orange color + flag icon) on the question navigator and a flag toggle button in the question area.

### 11. Display Exam Instructions
**File:** `models/exam.py:16` — `instructions` field exists but `cbt_test.html` doesn't show it.
**Plan:** Display exam instructions in the test header or on the pre-exam instruction screen (`quiz_instruction.html`).

### 12. Timer Dark Mode Fix
**File:** `static/js/student/test_with_session.js:711-713`
Timer warning only removes `text-blue-600` but the base color is `text-blue-600 dark:text-blue-400`.
**Fix:** Also handle `dark:text-blue-400` class swap when timer enters warning state.

### 13. Exam Session Monitor — Dark Mode Support
**File:** `templates/admin/exam_sessions.html`
The entire exam sessions page lacks dark mode support (hardcoded white/gray-50 backgrounds).
**Fix:** Add `dark:` Tailwind variants throughout the template.

### 14. Exam Session Monitor — Auto-Refresh
**File:** `templates/admin/exam_sessions.html`
The page shows static data. Admins monitoring live exams need auto-refresh.
**Fix:** Add JavaScript polling every 30 seconds to refresh session data.

### 15. Before-Refresh Confirmation Dialog
Only `beforeunload` saves progress but doesn't warn the user with a confirmation.
**Fix:** Add a confirmation dialog when the user tries to refresh or navigate away during an exam.

---

## Priority 3 — Nice-to-Haves ✅ COMPLETED

These are lower-priority improvements that enhance polish and accessibility.

### 16. Student Dashboard Improvements
**File:** `templates/student/dashboard.html`, `static/js/student/dashboard.js` (nearly empty — 3 lines)
**Plan:**
- Add exam history with scores/grades.
- Add performance trends.
- Add upcoming exams section with countdown.
- Show recent exam feedback (if enabled).

### 17. Responsive Question Navigator Grid
On desktop, the navigator uses `grid-cols-5` which becomes cramped for exams with 50+ questions.
**Fix:** Make grid responsive — `grid-cols-5 md:grid-cols-8 lg:grid-cols-10`.

### 18. Mobile Exam Taking UX Improvements
The mobile nav toggle is a floating button at bottom-right, but the main exam area doesn't optimize for mobile — options can be hard to read.
**Fix:** Improve mobile layout with larger touch targets and collapsible header.

### 19. Accessibility Improvements
- No ARIA labels on question navigation buttons.
- Keyboard shortcuts conflict with browser shortcuts in some contexts.
- No screen reader announcements when navigating questions.
**Fix:** Add `aria-label`, `role`, and `aria-live` attributes throughout the test UI.

### 20. Configurable Demo Test Timer
**File:** `static/js/student/demo_test.js:7`
The demo test timer is hardcoded to 5 minutes.
**Fix:** Allow configurable demo timer or show question count-based estimate.

---

## New Features

### Calculator Tool
A built-in calculator is now available for both teachers and students during exams. This tool simplifies calculations, reducing errors and saving time for numerical questions.

### On-The-Go Tests
The "On-The-Go Test" feature enables schools to create ad-hoc exams outside the standard academic schedule. This is ideal for:
*   Evaluating new students to determine appropriate class placements.
*   Conducting mid-semester or summer assessments (e.g., holiday lessons).
*   Preparing exams for special events, workshops, or extracurricular classes.

**Configuration Options:**  
Schools can configure whether On-The-Go Tests are saved to the system for future reference or discarded after completion, providing flexibility in data management.
