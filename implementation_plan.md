# Improved AI Chat Tab Implementation Plan

This plan details the implementation of a modern, premium **AI Chat** interface for the upload questions page in both the admin and staff panels. It introduces a **Claude Artifacts-style split-pane layout** that keeps the conversation history on the left and a live-updating interactive question workspace on the right.

---

## User Review Required

> [!IMPORTANT]
> **Unified Workspace Layout**: The proposed design replaces standard message-embedded question lists with a **Claude Artifacts-Style Split Layout**. This ensures that the generated questions remain visible and editable in a persistent workspace panel on the right side of the screen, while the user chats on the left.
>
> **Missing Admin Endpoints**: Currently, the backend only has `/staff/ai_chat_generate` and `/staff/create_questions_from_json` in `routes/staff_routes.py`. We must implement their equivalents in `routes/admin_action_routes.py` with support for admin-specific options (such as selecting a target teacher).
>
> **Severe Backend Bug Fix**: The current `/staff/ai_chat_generate` route crashes with a 400 error ("No questions generated") if a user requests questions via text *without* uploading any files. This plan fixes this by adding support for text-only prompt generation.

---

## Open Questions

> [!NOTE]
> 1. **Client-side vs. Server-side Export**: For the PDF and Word export buttons, would you prefer using client-side libraries (like `jspdf` and a client-side docx builder) or server-side routes? We recommend **server-side routes** (using `weasyprint`/`docx` on Python) as it ensures consistent formatting and respects math/LaTeX rendering.
> 2. **Conversation History Memory**: Should the conversation history persist across tab switches or page reloads? We propose keeping it in-memory for the active session, but resetting it on page reload for privacy and token efficiency.

---

## Proposed Changes

### Component 1: Templates & Layout (HTML)

#### [MODIFY] [admin/upload_questions.html](file:///c:/Users/abdullahi/Desktop/dev/projects/full_stack/cbt-mini-school/templates/admin/upload_questions.html)
- Add click handlers for `aiChatTab` in DOMContentLoaded (currently missing for admin).
- Load **MathJax** script at the bottom of the template (currently loaded in staff but missing in admin).
- Replace the simple `#aiChatSection` with a **gorgeous split-pane workspace**:
  - **Left Side (Chat Panel, width: 45%)**:
    - **Header**: Compact header showing active model ("Gemini 3.5 Flash") and status indicator.
    - **Scrollable Area**: Message bubbles with clean transitions.
      - *User bubble*: Right-aligned, primary-to-blue-600 gradient, white text.
      - *AI bubble*: Left-aligned, white/dark-gray background, Gemini spark icon avatar, markdown-parsed content.
      - *Attachment cards*: Inline preview chips for attached documents.
    - **Bottom Input Bar**: Rounded text input supporting multi-line typing, a paperclip attachment button, active file pill overlay, and a send button with hover micro-animations.
  - **Right Side (Question Workspace Panel, width: 55%)**:
    - **Metadata Settings**: Integrates selectors for Class & Subject, Term, Exam Type, and Teacher (Teacher is admin-only) inside a top collapsible header.
    - **Live Questions List**: A list of structured, expandable cards representing the generated questions.
      - Each card supports inline editing of the question text, type selection (MCQ, Short Answer), adding/removing options, toggling correct answers, and LaTeX rendering.
    - **Actions Bar**: Floating actions to "Save All to Database" (disabled if metadata is missing), "Export as PDF", and "Export as DOCX".
    - **Empty State**: Beautiful vector/CSS placeholder: "Your generated questions will appear here. Start a conversation on the left to begin."

#### [MODIFY] [staff/upload_questions.html](file:///c:/Users/abdullahi/Desktop/dev/projects/full_stack/cbt-mini-school/templates/staff/upload_questions.html)
- Replace `#aiChatSection` with the same premium split-pane workspace design (matching the admin panel, minus the Teacher selection).

---

### Component 2: JavaScript Logic (JS)

#### [MODIFY] [admin/upload_questions.js](file:///c:/Users/abdullahi/Desktop/dev/projects/full_stack/cbt-mini-school/static/js/admin/upload_questions.js)
- Implement full chat lifecycle handlers:
  - `addMessageToChat(type, content, files)`: Appends beautiful bubbles with fade-in animation.
  - `showTypingIndicator()` / `hideTypingIndicator()`: Renders pulsing bubble.
  - File selection queue (storing files before sending).
- Implement interactive workspace updates:
  - `renderWorkspaceQuestions(questions)`: Parses JSON responses and renders editable cards in the right-hand panel.
  - Event listeners for card fields: auto-syncing edits back to the local javascript state.
  - MathJax integration: Call `MathJax.typesetPromise()` after rendering cards to render LaTeX formulas instantly.
- Implement server save and export actions:
  - Send reviewed question array to `/admin/create_questions_from_json` upon clicking "Save All".
  - Handle PDF/Word export generation triggers.

#### [MODIFY] [staff/upload_questions.js](file:///c:/Users/abdullahi/Desktop/dev/projects/full_stack/cbt-mini-school/static/js/staff/upload_questions.js)
- Implement matching frontend logic for staff chat interface, pointing to `/staff/...` endpoints.

---

### Component 3: Backend Services & Routes (Python)

#### [MODIFY] [gemini_extractor.py](file:///c:/Users/abdullahi/Desktop/dev/projects/full_stack/cbt-mini-school/services/gemini_extractor.py)
- Create a new helper function `generate_questions_from_prompt(custom_prompt)`:
  - Uses the same system prompt and model candidates as `extract_questions_from_file`.
  - Sends a text-only generative request to the Gemini API (meaning users can chat and generate questions from text guidelines without uploading documents).

#### [MODIFY] [staff_routes.py](file:///c:/Users/abdullahi/Desktop/dev/projects/full_stack/cbt-mini-school/routes/staff_routes.py)
- Fix `staff_ai_chat_generate`:
  - Detect if no files were uploaded. If so, call `generate_questions_from_prompt(full_prompt)` instead of iterating over files.
  - Support multi-turn history by retrieving `conversation_history` from request JSON and feeding it to the Gemini prompt context.

#### [NEW] [admin_action_routes.py](file:///c:/Users/abdullahi/Desktop/dev/projects/full_stack/cbt-mini-school/routes/admin_action_routes.py)
- Implement `/admin/ai_chat_generate`:
  - Adapts `staff_ai_chat_generate` to the admin context.
  - Accepts `teacher_id` from the request to ensure generated questions are correctly associated with the selected teacher.
- Implement `/admin/create_questions_from_json`:
  - Saves the final approved questions to the database on behalf of the selected teacher.

---

## Verification Plan

### Automated Verification
Run testing script to ensure that the python dependencies are active and routes respond correctly:
```powershell
python -c "import docx; import google.generativeai; print('Dependencies OK')"
```

### Manual Verification
1. Open the upload questions tab as both Admin and Staff.
2. Select the "AI Chat" tab and verify the layout switches to the premium split-pane.
3. Test generating questions:
   - **Text Only**: Ask: *"Create 3 MCQs about gravity"* without uploading a file. Verify it works.
   - **With Files**: Upload a document and request extraction. Verify progress and output.
4. Interact with the Question Workspace on the right:
   - Edit a question text.
   - Add/remove options.
   - Discard/delete a question.
5. Save questions to the database and verify they are successfully saved and displayed in the main questions list.
6. Verify PDF and Word exports match the question formats.
