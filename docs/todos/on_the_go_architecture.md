# On-The-Go Test — Backend Architecture Specification

## 1. Problem Summary

The current implementation forces On-The-Go tests to ride on the `Exam` model via a boolean `is_on_the_go` flag. This produces several design violations:

| Concern | Current Problem |
|---|---|
| **Conceptual** | On-The-Go is not an exam variant; it is a fundamentally different entity (ad-hoc, no term/ date constraints) |
| **Data integrity** | `Exam` requires `school_term_id` (NOT NULL), but On-The-Go tests have no term — values are meaningless |
| **UX friction** | The admin creation form forces term, date, exam_type fields that are irrelevant for ad-hoc tests |
| **Query complexity** | Every student dashboard / exam availability query must filter `is_on_the_go == True` to bypass date gates |
| **Extensibility** | Adding On-The-Go–specific features (access codes, optional class, ephemeral results) pollutes the Exam model |

## 2. Proposed Model Schema

### 2.1 `OnTheGoTest` — The primary entity

```python
class OnTheGoTest(db.Model):
    """Ad-hoc test not tied to a term, academic session, or scheduled date."""
    __tablename__ = "on_the_go_tests"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    title = db.Column(db.String(200), nullable=False)       # Teacher-defined name, e.g. "Pop Quiz — Algebra"
    description = db.Column(db.Text, nullable=True)          # Optional longer description
    instructions = db.Column(db.Text, nullable=True)         # Custom instructions shown before test starts

    # Core test parameters
    subject_id = db.Column(db.String(36), db.ForeignKey("subject.subject_id"), nullable=False)
    class_room_id = db.Column(db.String(36), db.ForeignKey("class_room.class_room_id"), nullable=True)
        # NULL = available to any enrolled student of this subject (across classes)
    duration = db.Column(db.Interval, nullable=False)        # e.g. 30 minutes
    max_score = db.Column(db.Float, nullable=False)          # e.g. 100
    number_of_questions = db.Column(db.Integer, nullable=True)
        # NULL = use all available questions for (subject, class_room)

    # Feature flags
    calculator_enabled = db.Column(db.Boolean, nullable=False, default=False)
    show_feedback = db.Column(db.Boolean, nullable=False, default=True)
    save_after_completion = db.Column(db.Boolean, nullable=False, default=True)
        # True  → persist full OnTheGoResult + student_on_the_go_test row
        # False → show results ephemerally in the HTTP response; only write
        #          the student_on_the_go_test row to prevent retakes

    # Access control
    access_code = db.Column(db.String(10), nullable=True)
        # Optional PIN students must enter before starting. NULL = no code required.

    # Lifecycle
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_finished = db.Column(db.Boolean, nullable=False, default=False)
    started_at = db.Column(db.DateTime, nullable=True)       # Window open (NULL = immediate)
    ended_at = db.Column(db.DateTime, nullable=True)         # Window close (NULL = no end)

    # Who created it
    created_by_id = db.Column(db.String(36), db.ForeignKey("user.id"), nullable=False)

    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    subject = db.relationship("Subject")
    class_room = db.relationship("ClassRoom")
    created_by = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "instructions": self.instructions,
            "subject_id": self.subject_id,
            "subject_name": self.subject.subject_name if self.subject else None,
            "class_room_id": self.class_room_id,
            "class_room_name": self.class_room.class_room_name if self.class_room else None,
            "duration": self.duration.seconds if self.duration else 0,
            "max_score": self.max_score,
            "number_of_questions": self.number_of_questions,
            "calculator_enabled": self.calculator_enabled,
            "show_feedback": self.show_feedback,
            "save_after_completion": self.save_after_completion,
            "access_code_required": bool(self.access_code),
            "is_active": self.is_active,
            "is_finished": self.is_finished,
            "started_at": self.started_at.strftime("%Y-%m-%d %H:%M:%S") if self.started_at else None,
            "ended_at": self.ended_at.strftime("%Y-%m-%d %H:%M:%S") if self.ended_at else None,
            "created_by_id": self.created_by_id,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": self.updated_at.strftime("%Y-%m-%d %H:%M:%S"),
        }
```

**Key design decisions:**
- `class_room_id` is **nullable** — a test can target all students enrolled in a subject regardless of class.
- `access_code` is **optional** — stored as plaintext (short-lived, low-risk). Enforced at session start.
- `save_after_completion` controls persistence behaviour at the data layer (see §5).
- No `school_term_id`, no `exam_type`, no `date`, no `invigilator_id` — these have no meaning for ad-hoc tests.

### 2.2 `OnTheGoResult` — Persisted results

Use a **dedicated** results table rather than overloading `ExamRecord`, because `ExamRecord` mandates `school_term_id`, `exam_type`, and `academic_year` — none of which apply.

```python
class OnTheGoResult(db.Model):
    """Result for a taken On-The-Go test. Created only when save_after_completion=True."""
    __tablename__ = "on_the_go_results"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)

    on_the_go_test_id = db.Column(
        db.String(36), db.ForeignKey("on_the_go_tests.id", ondelete="CASCADE"), nullable=False
    )
    student_id = db.Column(
        db.String(36), db.ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )

    # Answers JSON — same format as ExamRecord: { question_id: option_id | text }
    answers = db.Column(db.Text, nullable=False)              # JSON string

    # Score information
    correct_answers = db.Column(db.Integer, nullable=False)
    total_questions = db.Column(db.Integer, nullable=False)
    score_percentage = db.Column(db.Float, nullable=False)
    raw_score = db.Column(db.Float, nullable=False)
    max_score = db.Column(db.Float, nullable=False)
    letter_grade = db.Column(db.String(1), nullable=False)

    # Timestamps
    started_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    submitted_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    test = db.relationship("OnTheGoTest", backref=db.backref("results", cascade="all, delete-orphan", lazy=True))
    student = db.relationship("User")

    def set_answers(self, answers_dict):
        self.answers = json.dumps(answers_dict)

    def get_answers(self):
        return json.loads(self.answers)

    def to_dict(self):
        return {
            "id": self.id,
            "on_the_go_test_id": self.on_the_go_test_id,
            "student_id": self.student_id,
            "answers": self.get_answers(),
            "correct_answers": self.correct_answers,
            "total_questions": self.total_questions,
            "score_percentage": self.score_percentage,
            "raw_score": self.raw_score,
            "max_score": self.max_score,
            "letter_grade": self.letter_grade,
            "started_at": self.started_at.strftime("%Y-%m-%d %H:%M:%S"),
            "submitted_at": self.submitted_at.strftime("%Y-%m-%d %H:%M:%S"),
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": self.updated_at.strftime("%Y-%m-%d %H:%M:%S"),
        }
```

### 2.3 `student_on_the_go_test` — Completion tracking (association table)

Analogous to the existing `student_exam` table. This row is **always** written (even when `save_after_completion=False`) to prevent retakes.

```python
student_on_the_go_test = db.Table(
    "student_on_the_go_test",
    db.Column("student_id", db.String(36), db.ForeignKey("user.id"), primary_key=True),
    db.Column("on_the_go_test_id", db.String(36), db.ForeignKey("on_the_go_tests.id"), primary_key=True),
    db.Column("score", db.Float, nullable=True),
    db.Column("completed_at", db.DateTime, nullable=True),
    db.Column("time_taken", db.Integer, nullable=True),      # seconds
)
```

### 2.4 `OnTheGoTestSession` — In-progress session tracking

Separate from `ExamSession` (which references `exams.id`). Mirror the same schema.

```python
class OnTheGoTestSession(db.Model):
    """Track ongoing On-The-Go test sessions for progress save/restore."""
    __tablename__ = "on_the_go_test_sessions"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)

    student_id = db.Column(db.String(36), db.ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    on_the_go_test_id = db.Column(
        db.String(36), db.ForeignKey("on_the_go_tests.id", ondelete="CASCADE"), nullable=False
    )

    current_question_index = db.Column(db.Integer, nullable=False, default=0)
    time_remaining = db.Column(db.Integer, nullable=False)   # seconds
    answers = db.Column(db.Text, nullable=False, default='{}')
    question_order = db.Column(db.Text, nullable=True)       # JSON array

    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_completed = db.Column(db.Boolean, nullable=False, default=False)

    started_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    last_activity = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = db.relationship("User")
    test = db.relationship("OnTheGoTest")

    def set_answers(self, d): self.answers = json.dumps(d)
    def get_answers(self):
        try: return json.loads(self.answers) if self.answers else {}
        except: return {}
    def set_question_order(self, ids): self.question_order = json.dumps(ids)
    def get_question_order(self):
        try: return json.loads(self.question_order) if self.question_order else []
        except: return []
```

### 2.5 Relationship Summary

```
OnTheGoTest
 ├── subject_id         ──→ Subject           (NOT NULL)
 ├── class_room_id      ──→ ClassRoom         (NULLABLE)
 ├── created_by_id      ──→ User              (NOT NULL)
 ├── OnTheGoResult      ←── has_many          (when saved)
 ├── OnTheGoTestSession ←── has_many
 └── student_on_the_go_test ←── many_to_many  (completions)
```

**Why NOT reuse `ExamRecord` / `student_exam` / `ExamSession`?**

| Table | Conflict |
|---|---|
| `ExamRecord` | Requires `school_term_id`, `exam_type`, `academic_year` — all meaningless for ad-hoc tests |
| `student_exam` | Has FK to `exams.id` — cannot point to `on_the_go_tests` |
| `ExamSession` | Has FK to `exams.id` — cannot point to `on_the_go_tests` |

Attempting to make those FKs polymorphic would add significant complexity. Separate tables keep the schema clean and queries simple.

---

## 3. API Endpoint Specification

### 3.1 Admin / Teacher CRUD — `routes/on_the_go_routes.py`

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `GET` | `/admin/on-the-go-tests` | List all On-The-Go tests | admin / staff |
| `POST` | `/admin/on-the-go-tests` | Create a new test | admin / staff |
| `GET` | `/admin/on-the-go-tests/<id>` | Get single test detail | admin / staff |
| `PUT` | `/admin/on-the-go-tests/<id>` | Update test | admin / staff |
| `DELETE` | `/admin/on-the-go-tests/<id>` | Delete test + cascade results/sessions | admin / staff |
| `POST` | `/admin/on-the-go-tests/<id>/activate` | Toggle `is_active` | admin / staff |
| `POST` | `/admin/on-the-go-tests/<id>/finish` | Mark finished (sets `is_finished=True, is_active=False`) | admin / staff |
| `GET` | `/admin/on-the-go-tests/<id>/results` | Aggregate results for a test | admin / staff |

#### `POST /admin/on-the-go-tests` — Request Body

```json
{
  "title": "Pop Quiz — Algebra",
  "description": "Quick assessment covering quadratic equations",
  "instructions": "Answer all 10 questions. You have 20 minutes.",
  "subject_id": "uuid-of-subject",
  "class_room_id": "uuid-or-null",
  "duration_hours": 0,
  "duration_minutes": 20,
  "max_score": 100,
  "number_of_questions": 10,
  "calculator_enabled": false,
  "show_feedback": true,
  "save_after_completion": true,
  "access_code": null,
  "is_active": true,
  "started_at": null,
  "ended_at": null
}
```

**Validation rules (enforced server-side):**
| Field | Rule |
|---|---|
| `title` | Required, max 200 chars |
| `subject_id` | Required, must reference existing Subject |
| `class_room_id` | Optional; if provided, must reference existing ClassRoom + be linked to subject |
| `duration_hours` / `duration_minutes` | At least one > 0; combined total > 60 seconds |
| `max_score` | Required, > 0 |
| `number_of_questions` | Optional; if provided, must be > 0 and ≤ available question count for (subject, class_room) |
| `access_code` | Optional; if provided, max 10 chars, alphanumeric |
| `save_after_completion` | Boolean, default true |

**Response (201 Created):**
```json
{
  "success": true,
  "message": "On-The-Go test created successfully",
  "test": { ... }   // Full OnTheGoTest.to_dict()
}
```

#### `GET /admin/on-the-go-tests` — Response

```json
{
  "success": true,
  "tests": [
    {
      "id": "...",
      "title": "Pop Quiz — Algebra",
      "subject_name": "Mathematics",
      "class_room_name": "SS1A",
      "duration": 1200,
      "max_score": 100,
      "number_of_questions": 10,
      "is_active": true,
      "is_finished": false,
      "created_at": "2026-07-30 10:00:00",
      "total_submissions": 24
    }
  ],
  "total": 12
}
```

#### `PUT /admin/on-the-go-tests/<id>` — Request Body

Same shape as POST but all fields optional. If the test already has student submissions:
- `subject_id`, `class_room_id`, `number_of_questions` changes must be validated against existing sessions
- `is_active` / `is_finished` cannot be toggled via PUT (use dedicated `/activate` and `/finish` routes)

#### `DELETE /admin/on-the-go-tests/<id>`

Cascades: `OnTheGoResult`, `OnTheGoTestSession`, `student_on_the_go_test` entries for this test.

```json
{
  "success": true,
  "message": "On-The-Go test deleted (24 student records removed, 12 sessions cleaned up)"
}
```

#### `GET /admin/on-the-go-tests/<id>/results` — Response

```json
{
  "success": true,
  "test_id": "...",
  "title": "Pop Quiz — Algebra",
  "total_takers": 24,
  "average_score": 67.5,
  "results": [
    {
      "student_id": "...",
      "student_name": "John Doe",
      "score_percentage": 85.0,
      "letter_grade": "B",
      "submitted_at": "2026-07-30 11:00:00",
      "time_taken": 840
    }
  ]
}
```
If `save_after_completion` was false for this test, `results` will be an empty array (results were ephemeral).

---

### 3.2 Student Endpoints — `routes/student_routes.py` (or dedicated file)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/student/on-the-go-tests` | List available tests for current student |
| `POST` | `/student/on-the-go-tests/<id>/verify-access` | Verify access code (if required) |
| `GET` | `/student/on-the-go-tests/<id>` | View test details / instructions |
| `GET` | `/student/on-the-go-tests/<id>/start` | Start the test (renders CBT test page) |
| `GET` | `/student/on-the-go-tests/<id>/questions` | API: fetch randomised questions |
| `POST` | `/student/on-the-go-tests/<id>/submit` | Submit answers and calculate score |
| `POST` | `/student/on-the-go-tests/<id>/session/save` | Save progress |
| `GET` | `/student/on-the-go-tests/<id>/session/restore` | Restore saved session |
| `POST` | `/student/on-the-go-tests/<id>/session/reset` | Reset session |
| `GET` | `/student/on-the-go-tests/<id>/feedback` | View results after submission |

#### `GET /student/on-the-go-tests` — Student Dashboard Listing

**Filtering logic (mirrors existing `dashboard.py` student_dashboard logic but for OnTheGoTest):**

1. Student must be enrolled in the test's subject (via `student_subject`)
2. Test must be `is_active=True` and `is_finished=False`
3. If `started_at` is set, test must have started (≥ `started_at`)
4. If `ended_at` is set, test must not have ended (< `ended_at`)
5. If `class_room_id` is set, student's class must match OR `class_room_id` is NULL
6. Student must NOT already have a completion row in `student_on_the_go_test`
7. Global toggle `cbt_on_the_go_enabled` permission must be active

**Response:**
```json
{
  "success": true,
  "tests": [
    {
      "id": "...",
      "title": "Pop Quiz — Algebra",
      "subject_name": "Mathematics",
      "subject_icon": "functions",
      "duration": 1200,
      "max_score": 100,
      "number_of_questions": 10,
      "calculator_enabled": false,
      "access_code_required": true,
      "started_at": null,
      "ended_at": null
    }
  ],
  "total": 3
}
```

#### `POST /student/on-the-go-tests/<id>/verify-access`

```json
// Request
{ "access_code": "ALGO42" }

// Response (200 OK)
{ "success": true, "message": "Access granted" }

// Response (403)
{ "success": false, "message": "Invalid access code" }
```

If the test has no `access_code`, this endpoint returns 200 without requiring the body field.

#### `GET /student/on-the-go-tests/<id>/start` — Start Test

**Access gate logic (server-side):**
1. Global `cbt_on_the_go_enabled` must be active
2. `is_active=True`, `is_finished=False`
3. Student enrolled in subject (or demo user)
4. Not already completed (check `student_on_the_go_test`)
5. Access code verified (store in session as `otg_access_verified_{id}`)
6. Time window respected (if `started_at` / `ended_at` set)

On success, renders `student/cbt_test.html` (reusing the existing template with `test` context instead of `exam`).

#### `GET /student/on-the-go-tests/<id>/questions`

**Question selection logic** (same as `get_exam_questions`):
```python
query = Question.query.filter_by(subject_id=test.subject_id)
if test.class_room_id:
    query = query.filter_by(class_room_id=test.class_room_id)
questions = query.all()
if test.number_of_questions and test.number_of_questions < len(questions):
    questions = random.sample(questions, test.number_of_questions)
random.shuffle(questions)
```

**Response shape** — identical to `/student/exam/<id>/questions` for frontend compatibility:
```json
{
  "success": true,
  "questions": [ { "id": "...", "question_text": "...", "options": [...], ... } ],
  "total_questions": 10
}
```

#### `POST /student/on-the-go-tests/<id>/submit` — The Ephemeral Gateway

This is the most architecturally significant endpoint. The flow:

```
Receive answers
    │
    ├─ Compute score (same scoring engine as submit_exam)
    │
    ├─ if save_after_completion == True:
    │      ├─ Write OnTheGoResult (full persistence)
    │      └─ Write student_on_the_go_test row
    │
    ├─ if save_after_completion == False:
    │      └─ Write ONLY student_on_the_go_test row (to block retakes)
    │
    ├─ Mark session as completed (OnTheGoTestSession)
    │
    └─ Return results (respecting show_feedback flag)
```

**Response (success, with feedback):**
```json
{
  "success": true,
  "show_results": true,
  "results_saved": false,
  "correct_answers": 8,
  "total_questions": 10,
  "score_percentage": 80.0,
  "raw_score": 80.0,
  "max_score": 100,
  "letter_grade": "B",
  "question_results": [ ... ],
  "redirect_url": "/student/dashboard"
}
```

The `"results_saved": false` flag tells the frontend that results were computed but not written to the database — they exist only in that HTTP response.

**Grade calculation** — for On-The-Go tests without a school term reference, use a **fallback grade scale**:
```python
def compute_grade(score_percentage, test):
    # 1. Try the school's default grade scale
    school = School.query.first()
    if school:
        grade_scale = GradeScale.query.filter_by(
            school_id=school.school_id, is_active=True, is_default=True
        ).first()
        if grade_scale:
            return grade_scale.get_grade_for_percentage(score_percentage)
    # 2. Fallback
    if score_percentage >= 70: return 'A'
    elif score_percentage >= 60: return 'B'
    elif score_percentage >= 50: return 'C'
    elif score_percentage >= 40: return 'D'
    else: return 'F'
```

---

## 4. Route Organization

### File structure

```
routes/
├── on_the_go_routes.py      ← NEW: admin/staff CRUD + results view
├── student_routes.py         ← MODIFIED: add student On-The-Go endpoints
├── admin_action_routes.py    ← UNMODIFIED (remove OTG-related code in cleanup phase)
└── dashboard.py              ← MODIFIED: add On-The-Go tests to student dashboard
```

### Registration in `app.py`

```python
from routes.on_the_go_routes import on_the_go_route

def create_app():
    app = Flask(__name__)
    # ... existing init code ...
    on_the_go_route(app)      # Register new blueprint/route group
    return app
```

### Model registration in `models/__init__.py`

```python
from .on_the_go_test import OnTheGoTest, OnTheGoResult, OnTheGoTestSession, student_on_the_go_test
```

Create a new file `models/on_the_go_test.py` containing all four model/table definitions from §2.

---

## 5. Ephemeral (Save/Discard) Mode — Data Layer Contract

| Scenario | `student_on_the_go_test` row | `OnTheGoResult` row | `OnTheGoTestSession` row |
|---|---|---|---|
| `save_after_completion=True` | Written (score, completed_at, time_taken) | Written (full answers + scores) | Marked completed |
| `save_after_completion=False` | Written (score, completed_at, time_taken) **only** | **NOT written** | Marked completed |
| Student never submits (abandoned) | Not written | Not written | Sessions cleaned via TTL / admin |

**Why always write `student_on_the_go_test`?**
The association table is the **lock** that prevents retakes. Without it, a student could retake the same test infinitely, regenerating ephemeral results each time. The `score` column captures the grade so that even ephemeral tests record *that* the student attempted it and what they scored, without storing the full answer key.

**Results retrieval when `save_after_completion=False`:**
- `GET /student/on-the-go-tests/<id>/feedback` will return **only** the summary fields from the `student_on_the_go_test` row (score, time_taken, completed_at) — no per-question breakdown.
- The frontend should inform the user: *"Your results were not saved to the database. This summary was shown once."*

**Ephemeral data lifetime:** The full results exist only in the HTTP response of the submit endpoint. After that, only `student_on_the_go_test` metadata persists.

---

## 6. Student Dashboard Integration

### Dashboard query (modify `dashboard.py` `student_dashboard`)

Append On-The-Go tests to the existing `available_exams` data:

```python
# --- Existing exam query ---
# ... (unchanged, but remove the is_on_the_go special casing)

# --- New On-The-Go test query ---
available_otg_tests = []
if can_write_exams:
    query = OnTheGoTest.query.filter(
        OnTheGoTest.is_active == True,
        OnTheGoTest.is_finished == False,
    )

    if not is_demo_user:
        # Student must be enrolled in the subject
        if enrolled_subject_ids:
            query = query.filter(OnTheGoTest.subject_id.in_(enrolled_subject_ids))

        # Class filter: NULL class_room_id means "all classes", otherwise match
        query = query.filter(
            db.or_(
                OnTheGoTest.class_room_id.is_(None),
                OnTheGoTest.class_room_id == current_user.class_room_id,
            )
        )

    # Exclude completed
    completed_otg_ids = db.session.execute(
        db.select(student_on_the_go_test.c.on_the_go_test_id)
        .where(student_on_the_go_test.c.student_id == current_user.id)
    ).scalars().all()

    if completed_otg_ids:
        query = query.filter(~OnTheGoTest.id.in_(completed_otg_ids))

    available_otg_tests = query.all()
```

**Template context** — pass `available_otg_tests` alongside `available_exams`. The frontend can render them:
- In a separate **"On-The-Go Tests"** section on the student dashboard
- Or interleaved with regular exams, distinguished by a badge

### Login-time availability (modify `auth_routes.py`)

Add the same On-The-Go test query to the login response so the student sees available tests immediately after login:

```python
# In the login success response for students:
response_data["available_otg_tests"] = [
    {"id": t.id, "title": t.title, "subject_name": t.subject.subject_name, ...}
    for t in available_otg_tests
]
```

---

## 7. Migration Strategy

### Phase 1 — Create new tables (no downtime)
Run a migration script that executes:

```sql
CREATE TABLE on_the_go_tests (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    instructions TEXT,
    subject_id VARCHAR(36) NOT NULL REFERENCES subject(subject_id),
    class_room_id VARCHAR(36) REFERENCES class_room(class_room_id),
    duration INTERVAL NOT NULL,
    max_score FLOAT NOT NULL,
    number_of_questions INTEGER,
    calculator_enabled BOOLEAN DEFAULT FALSE,
    show_feedback BOOLEAN DEFAULT TRUE,
    save_after_completion BOOLEAN DEFAULT TRUE,
    access_code VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    is_finished BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_by_id VARCHAR(36) NOT NULL REFERENCES user(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE on_the_go_results (
    id VARCHAR(36) PRIMARY KEY,
    on_the_go_test_id VARCHAR(36) NOT NULL REFERENCES on_the_go_tests(id) ON DELETE CASCADE,
    student_id VARCHAR(36) NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    answers TEXT NOT NULL,
    correct_answers INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    score_percentage FLOAT NOT NULL,
    raw_score FLOAT NOT NULL,
    max_score FLOAT NOT NULL,
    letter_grade VARCHAR(1) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    submitted_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE on_the_go_test_sessions (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    on_the_go_test_id VARCHAR(36) NOT NULL REFERENCES on_the_go_tests(id) ON DELETE CASCADE,
    current_question_index INTEGER DEFAULT 0,
    time_remaining INTEGER NOT NULL,
    answers TEXT DEFAULT '{}',
    question_order TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE student_on_the_go_test (
    student_id VARCHAR(36) NOT NULL REFERENCES user(id),
    on_the_go_test_id VARCHAR(36) NOT NULL REFERENCES on_the_go_tests(id),
    score FLOAT,
    completed_at TIMESTAMP,
    time_taken INTEGER,
    PRIMARY KEY (student_id, on_the_go_test_id)
);
```

**This phase is safe to run while the application is live** — no existing table is altered.

### Phase 2 — Migrate existing `is_on_the_go=True` exams

Run a one-off data migration script:

```python
def migrate_existing_on_the_go_exams():
    """Move existing On-The-Go exams to the new OnTheGoTest table."""
    old_exams = Exam.query.filter_by(is_on_the_go=True).all()
    for old in old_exams:
        new_test = OnTheGoTest(
            title=old.name,
            description=old.description,
            subject_id=old.subject_id,
            class_room_id=old.class_room_id,
            duration=old.duration,
            max_score=old.max_score,
            number_of_questions=old.number_of_questions,
            calculator_enabled=old.calculator_enabled,
            show_feedback=old.show_feedback,
            save_after_completion=old.save_after_completion,
            is_active=old.is_active,
            is_finished=old.is_finished,
            created_by_id=old.invigilator_id or old.exam_type  # fallback
        )
        db.session.add(new_test)
        db.session.flush()  # Get new_test.id

        # Migrate completion records from student_exam
        completions = db.session.execute(
            db.select(student_exam).where(student_exam.c.exam_id == old.id)
        ).fetchall()
        for comp in completions:
            row = student_on_the_go_test.insert().values(
                student_id=comp.student_id,
                on_the_go_test_id=new_test.id,
                score=comp.score,
                completed_at=comp.completed_at,
                time_taken=comp.time_taken,
            )
            db.session.execute(row)

        # Migrate exam records
        records = ExamRecord.query.filter_by(exam_id=old.id).all()
        for rec in records:
            new_result = OnTheGoResult(
                on_the_go_test_id=new_test.id,
                student_id=rec.student_id,
                answers=rec.answers,
                correct_answers=rec.correct_answers,
                total_questions=rec.total_questions,
                score_percentage=rec.score_percentage,
                raw_score=rec.raw_score,
                max_score=rec.max_score,
                letter_grade=rec.letter_grade,
                started_at=rec.started_at,
                submitted_at=rec.submitted_at,
            )
            db.session.add(new_result)

        # Migrate active sessions
        sessions = ExamSession.query.filter_by(exam_id=old.id).all()
        for ses in sessions:
            new_ses = OnTheGoTestSession(
                student_id=ses.student_id,
                on_the_go_test_id=new_test.id,
                current_question_index=ses.current_question_index,
                time_remaining=ses.time_remaining,
                answers=ses.answers,
                question_order=ses.question_order,
                is_active=ses.is_active,
                is_completed=ses.is_completed,
                started_at=ses.started_at,
                completed_at=ses.completed_at,
            )
            db.session.add(new_ses)

    db.session.commit()
```

### Phase 3 — Deprecate old `is_on_the_go` column (soft)

1. Mark the `is_on_the_go` column on `Exam` as **read-only in the admin UI** (show a warning: *"This exam was created using the old On-The-Go system. Use the new On-The-Go Tests page instead."*)
2. Remove the `is_on_the_go` checkbox from the exam creation form.
3. In `student_routes.py`, remove the `is_on_the_go` bypass checks (they now route through the On-The-Go endpoints instead).
4. Keep the column for backward query compatibility for one release cycle.

### Phase 4 — Remove column (hard, after 1+ releases)

```python
def downgrade_phase4():
    """Remove the deprecated is_on_the_go flag from exams table."""
    db.session.execute(db.text("ALTER TABLE exams DROP COLUMN is_on_the_go"))
    db.session.execute(db.text("ALTER TABLE exams DROP COLUMN save_after_completion"))
    db.session.commit()
```

---

## 8. Authentication & Permission Checks

### Global toggle
```python
from models import is_permission_active

# At the top of every On-The-Go endpoint:
if not is_permission_active("cbt_on_the_go_enabled"):
    return jsonify({"success": False, "message": "On-The-Go tests are disabled by the administrator"}), 403
```

### Access code flow
```
Student clicks test
    │
    ├─ if access_code is NULL → proceed to /start
    │
    └─ if access_code is set:
         POST /verify-access { "access_code": "XXX" }
              │
              ├─ correct → session["otg_access_verified_{id}"] = True → proceed
              │
              └─ wrong   → 403 "Invalid access code"
```

### Admin/staff authorization
- `admin` role: full CRUD on all tests
- `staff` (teacher) role: can create/edit/delete only tests they created (`created_by_id == current_user.id`)
- Teachers can view results for tests they created

---

## 9. Question Selection — Reuse Logic

On-The-Go tests use the **exact same question bank** (`Question` model) as normal exams. The selection query is:

```python
query = Question.query.filter_by(subject_id=test.subject_id)
if test.class_room_id:
    query = query.filter_by(class_room_id=test.class_room_id)
all_questions = query.all()

if test.number_of_questions and test.number_of_questions < len(all_questions):
    questions = random.sample(all_questions, test.number_of_questions)
else:
    questions = all_questions
random.shuffle(questions)
```

No new question model is needed. The `Question.exam_type_id` FK to `exams.id` is irrelevant for On-The-Go tests because On-The-Go tests select questions by subject+class, not by exam. If you later want to pre-select specific questions for an On-The-Go test, you can add a many-to-many association table:

```python
on_the_go_test_questions = db.Table(
    "on_the_go_test_questions",
    db.Column("on_the_go_test_id", db.String(36), db.ForeignKey("on_the_go_tests.id"), primary_key=True),
    db.Column("question_id", db.String(36), db.ForeignKey("questions.id"), primary_key=True),
)
```

This is **optional** and can be added in a future iteration. For now, the dynamic filter (subject + class) is sufficient and consistent with how normal exams work.

---

## 10. Summary of Files to Create / Modify

| File | Action | Description |
|---|---|---|
| `models/on_the_go_test.py` | **CREATE** | `OnTheGoTest`, `OnTheGoResult`, `OnTheGoTestSession`, `student_on_the_go_test` |
| `models/__init__.py` | **MODIFY** | Import the four new models |
| `routes/on_the_go_routes.py` | **CREATE** | Admin/staff CRUD endpoints (§3.1) |
| `routes/student_routes.py` | **MODIFY** | Add student On-The-Go endpoints (§3.2) |
| `routes/dashboard.py` | **MODIFY** | Add available On-The-Go tests to student dashboard |
| `routes/auth_routes.py` | **MODIFY** | Add On-The-Go tests to login response |
| `migrations/001_create_on_the_go_tables.py` | **CREATE** | Phase 1 schema migration |
| `migrations/002_migrate_existing_on_the_go.py` | **CREATE** | Phase 2 data migration |
| `app.py` | **MODIFY** | Register `on_the_go_route(app)` |
| `templates/admin/on_the_go_tests.html` | **CREATE** | Admin UI for On-The-Go management |
| `templates/student/on_the_go_test.html` | **CREATE** | Student test-taking page (can reuse `cbt_test.html`) |
| `static/js/admin/on_the_go_tests.js` | **CREATE** | Frontend logic for admin On-The-Go page |

---

## 11. Edge Cases & Guardrails

| Edge Case | Handling |
|---|---|
| **Student opens test in two tabs** | `OnTheGoTestSession` enforces one active session per (student, test). Second tab detects existing session and resumes it. |
| **Network drop during submission** | Client retries; server checks `student_on_the_go_test` for existing completion; if already submitted, returns 409 with existing results. |
| **Teacher deletes test mid-session** | `ondelete="CASCADE"` cleans up sessions/results. Student sees "Test no longer available" on next interaction. |
| **`save_after_completion` changed after submissions exist** | Prohibit changing this field after the first student has submitted. Return 422 if attempted. |
| **Access code lost** | Teacher can view/reset the code via the admin edit endpoint. |
| **Zero questions available for subject+class** | Return 400 on creation: *"No questions available for this subject. Add questions first."* |
| **Student changes class after starting** | Already locked by `student_on_the_go_test` completion check. Active sessions use the test's `class_room_id` at creation time. |
| **Concurrent submissions (race condition)** | Use `INSERT ... ON CONFLICT DO NOTHING` pattern for `student_on_the_go_test` to prevent double-submission. Wrap scoring + persistence in a transaction. |
