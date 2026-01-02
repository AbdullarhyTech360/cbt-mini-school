# Database Schema Documentation

## Overview

This document describes the complete database schema for the CBT Mini School Management System. The schema has been designed to support a comprehensive school management system with proper relationships and data integrity.

## Schema Design Principles

- **UUID Primary Keys**: All tables use UUID (String(36)) for primary keys to ensure uniqueness across distributed systems
- **Joined Table Inheritance**: Student and Teacher models inherit from User model using joined table inheritance
- **Soft Deletes**: Most models include `is_active` field for soft deletion
- **Timestamps**: All models include `created_at` and `updated_at` for audit trails
- **Foreign Key Constraints**: Proper foreign key relationships ensure referential integrity

---

## Core Models

### 1. User Model

The base user model that stores authentication and profile information.

```python
class User(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'admin', 'staff', 'student'
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Relationships:**
- One-to-one with Student and Teacher models (polymorphic)
- One-to-many with Grade model
- One-to-many with ExamRecord model

### 2. Student Model

Extends the User model with student-specific information.

```python
class Student(User):
    __tablename__ = 'students'
    id = db.Column(db.String(36), db.ForeignKey('users.id'), primary_key=True)
    admission_number = db.Column(db.String(20), unique=True, nullable=False)
    date_of_birth = db.Column(db.Date)
    gender = db.Column(db.String(10))
    address = db.Column(db.Text)
    parent_name = db.Column(db.String(100))
    parent_contact = db.Column(db.String(20))
    emergency_contact = db.Column(db.String(20))
    class_room_id = db.Column(db.String(36), db.ForeignKey('class_rooms.id'))
    admission_date = db.Column(db.Date, default=datetime.utcnow)
```

**Relationships:**
- Many-to-one with ClassRoom model
- One-to-many with Grade model
- One-to-many with ExamRecord model

### 3. Teacher Model

Extends the User model with teacher-specific information.

```python
class Teacher(User):
    __tablename__ = 'teachers'
    id = db.Column(db.String(36), db.ForeignKey('users.id'), primary_key=True)
    employee_number = db.Column(db.String(20), unique=True, nullable=False)
    qualification = db.Column(db.String(100))
    specialization = db.Column(db.String(100))
    date_joined = db.Column(db.Date, default=datetime.utcnow)
```

**Relationships:**
- One-to-many with Grade model
- One-to-many with Subject model

---

## Academic Models

### 4. School Model

Stores information about the school.

```python
class School(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.Text)
    phone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    logo = db.Column(db.String(255))  # Path to logo image
    motto = db.Column(db.String(100))
    established_year = db.Column(db.Integer)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### 5. SchoolTerm Model

Represents academic terms/semesters.

```python
class SchoolTerm(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    term_name = db.Column(db.String(50), nullable=False)
    academic_session = db.Column(db.String(20), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### 6. ClassRoom Model

Represents classes or grades in the school.

```python
class ClassRoom(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    class_room_name = db.Column(db.String(50), nullable=False)
    class_room_code = db.Column(db.String(10), unique=True, nullable=False)
    description = db.Column(db.Text)
    capacity = db.Column(db.Integer)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Relationships:**
- One-to-many with Student model
- One-to-many with Grade model

### 7. Section Model

Represents sections or divisions within a class.

```python
class Section(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(50), nullable=False)
    class_room_id = db.Column(db.String(36), db.ForeignKey('class_rooms.id'), nullable=False)
    teacher_id = db.Column(db.String(36), db.ForeignKey('teachers.id'))
    capacity = db.Column(db.Integer)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Relationships:**
- Many-to-one with ClassRoom model
- Many-to-one with Teacher model

---

## Subject and Assessment Models

### 8. Subject Model

Represents academic subjects.

```python
class Subject(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subject_name = db.Column(db.String(100), nullable=False)
    subject_code = db.Column(db.String(10), unique=True, nullable=False)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### 9. AssessmentType Model

Represents types of assessments (tests, exams, etc.).

```python
class AssessmentType(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = db.Column(db.String(10), unique=True, nullable=False)
    name = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text)
    max_score = db.Column(db.Float, nullable=False)
    weight = db.Column(db.Float, default=1.0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

---

## CBT and Exam Models

### 10. Exam Model

Represents examinations or tests.

```python
class Exam(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    subject_id = db.Column(db.String(36), db.ForeignKey('subjects.id'), nullable=False)
    class_room_id = db.Column(db.String(36), db.ForeignKey('class_rooms.id'), nullable=False)
    term_id = db.Column(db.String(36), db.ForeignKey('school_terms.id'), nullable=False)
    teacher_id = db.Column(db.String(36), db.ForeignKey('teachers.id'))
    exam_date = db.Column(db.DateTime, nullable=False)
    duration = db.Column(db.Integer, nullable=False)  # Duration in minutes
    total_questions = db.Column(db.Integer, default=0)
    total_marks = db.Column(db.Float, default=0)
    instructions = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    shuffle_questions = db.Column(db.Boolean, default=False)
    show_results = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Relationships:**
- Many-to-one with Subject model
- Many-to-one with ClassRoom model
- Many-to-one with SchoolTerm model
- Many-to-one with Teacher model
- One-to-many with Question model
- One-to-many with ExamRecord model

### 11. Question Model

Represents questions in an exam.

```python
class Question(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_id = db.Column(db.String(36), db.ForeignKey('exams.id'), nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    question_type = db.Column(db.String(20), nullable=False)  # 'mcq', 'true_false', 'short_answer'
    options = db.Column(db.JSON)  # For MCQ questions
    correct_answer = db.Column(db.Text)
    marks = db.Column(db.Float, default=1.0)
    order = db.Column(db.Integer)
    explanation = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Relationships:**
- Many-to-one with Exam model

### 12. ExamRecord Model

Records student exam attempts and results.

```python
class ExamRecord(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_id = db.Column(db.String(36), db.ForeignKey('exams.id'), nullable=False)
    student_id = db.Column(db.String(36), db.ForeignKey('students.id'), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime)
    submitted = db.Column(db.Boolean, default=False)
    score = db.Column(db.Float)
    percentage = db.Column(db.Float)
    grade = db.Column(db.String(5))
    answers = db.Column(db.JSON)  # Student's answers
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Relationships:**
- Many-to-one with Exam model
- Many-to-one with Student model

### 13. ExamSession Model

Tracks active exam sessions for persistence and recovery.

```python
class ExamSession(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_record_id = db.Column(db.String(36), db.ForeignKey('exam_records.id'), nullable=False)
    current_question = db.Column(db.Integer, default=1)
    marked_questions = db.Column(db.JSON)  # Array of marked question numbers
    last_saved = db.Column(db.DateTime, default=datetime.utcnow)
    session_data = db.Column(db.JSON)  # Additional session data
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Relationships:**
- Many-to-one with ExamRecord model

---

## Grading and Report Models

### 14. Grade Model

Stores student grades for various assessments.

```python
class Grade(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.String(36), db.ForeignKey('students.id'), nullable=False)
    subject_id = db.Column(db.String(36), db.ForeignKey('subjects.id'), nullable=False)
    class_room_id = db.Column(db.String(36), db.ForeignKey('class_rooms.id'), nullable=False)
    teacher_id = db.Column(db.String(36), db.ForeignKey('teachers.id'))
    term_id = db.Column(db.String(36), db.ForeignKey('school_terms.id'), nullable=False)
    assessment_type = db.Column(db.String(20), nullable=False)
    assessment_name = db.Column(db.String(100), nullable=False)
    max_score = db.Column(db.Float, nullable=False)
    score = db.Column(db.Float, nullable=False)
    percentage = db.Column(db.Float)
    grade_letter = db.Column(db.String(5))
    comments = db.Column(db.Text)
    academic_session = db.Column(db.String(20))
    assessment_date = db.Column(db.Date)
    is_from_cbt = db.Column(db.Boolean, default=False)
    is_published = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Relationships:**
- Many-to-one with Student model
- Many-to-one with Subject model
- Many-to-one with ClassRoom model
- Many-to-one with Teacher model
- Many-to-one with SchoolTerm model

### 15. GradeScale Model

Defines the grading scale used for converting percentages to letter grades.

```python
class GradeScale(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    min_score = db.Column(db.Float, nullable=False)
    max_score = db.Column(db.Float, nullable=False)
    grade_letter = db.Column(db.String(5), nullable=False)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### 16. ReportConfig Model

Stores configuration for report generation.

```python
class ReportConfig(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    config_type = db.Column(db.String(50), nullable=False)  # 'student_report', 'class_report', etc.
    config_data = db.Column(db.JSON, nullable=False)
    is_default = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

---

## Demo Questions Model

### 17. DemoQuestion Model

Stores demo questions for student practice.

```python
class DemoQuestion(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    question_text = db.Column(db.Text, nullable=False)
    question_type = db.Column(db.String(20), nullable=False)  # 'mcq', 'true_false', 'short_answer'
    subject = db.Column(db.String(50), nullable=False)
    difficulty = db.Column(db.String(20), nullable=False)  # 'easy', 'medium', 'hard'
    correct_answer = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Relationships:**
- One-to-many with DemoOption model

### 18. DemoOption Model

Stores options for demo multiple-choice questions.

```python
class DemoOption(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    question_id = db.Column(db.String(36), db.ForeignKey('demo_questions.id'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    is_correct = db.Column(db.Boolean, default=False)
    order = db.Column(db.Integer)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Relationships:**
- Many-to-one with DemoQuestion model

---

## Attendance Model

### 19. Attendance Model

Tracks student attendance.

```python
class Attendance(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = db.Column(db.String(36), db.ForeignKey('students.id'), nullable=False)
    class_room_id = db.Column(db.String(36), db.ForeignKey('class_rooms.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), nullable=False)  # 'present', 'absent', 'late'
    remarks = db.Column(db.Text)
    recorded_by = db.Column(db.String(36), db.ForeignKey('teachers.id'))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Relationships:**
- Many-to-one with Student model
- Many-to-one with ClassRoom model
- Many-to-one with Teacher model

---

## Permission Model

### 20. Permission Model

Stores system permissions.

```python
class Permission(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

---

## Association Tables

### 21. User-Permission Association

Many-to-many relationship between users and permissions.

```python
user_permissions = db.Table('user_permissions',
    db.Column('user_id', db.String(36), db.ForeignKey('users.id'), primary_key=True),
    db.Column('permission_id', db.String(36), db.ForeignKey('permissions.id'), primary_key=True)
)
```

### 22. Teacher-Subject Association

Many-to-many relationship between teachers and subjects.

```python
teacher_subjects = db.Table('teacher_subjects',
    db.Column('teacher_id', db.String(36), db.ForeignKey('teachers.id'), primary_key=True),
    db.Column('subject_id', db.String(36), db.ForeignKey('subjects.id'), primary_key=True)
)
```

---

## Database Indexes

For optimal performance, the following indexes are recommended:

```sql
-- User indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Student indexes
CREATE INDEX idx_students_admission_number ON students(admission_number);
CREATE INDEX idx_students_class_room_id ON students(class_room_id);

-- Grade indexes
CREATE INDEX idx_grades_student_id ON grades(student_id);
CREATE INDEX idx_grades_subject_id ON grades(subject_id);
CREATE INDEX idx_grades_term_id ON grades(term_id);

-- Exam indexes
CREATE INDEX idx_exams_subject_id ON exams(subject_id);
CREATE INDEX idx_exams_class_room_id ON exams(class_room_id);
CREATE INDEX idx_exams_term_id ON exams(term_id);

-- ExamRecord indexes
CREATE INDEX idx_exam_records_exam_id ON exam_records(exam_id);
CREATE INDEX idx_exam_records_student_id ON exam_records(student_id);
```

---

## Data Integrity Constraints

The following constraints ensure data integrity:

```sql
-- Ensure exam date is within term dates
ALTER TABLE exams ADD CONSTRAINT chk_exam_date_in_term 
CHECK (exam_date >= (SELECT start_date FROM school_terms WHERE id = term_id) 
AND exam_date <= (SELECT end_date FROM school_terms WHERE id = term_id));

-- Ensure grade score is within valid range
ALTER TABLE grades ADD CONSTRAINT chk_grade_score_range 
CHECK (score >= 0 AND score <= max_score);

-- Ensure grade percentage is within valid range
ALTER TABLE grades ADD CONSTRAINT chk_grade_percentage_range 
CHECK (percentage >= 0 AND percentage <= 100);
```

---

## Migration Strategy

When modifying the database schema:

1. Create migration scripts in the `migrations/` directory
2. Follow the naming convention: `add_<feature>.py`
3. Include both upgrade and downgrade functions
4. Test migrations on a copy of production data
5. Document breaking changes in the migration file

Example migration script:

```python
"""
Add new field to exams table
"""
from app import app, db
from models import db

def upgrade():
    with app.app_context():
        # Add new column
        db.engine.execute('ALTER TABLE exams ADD COLUMN new_field VARCHAR(100)')

def downgrade():
    with app.app_context():
        # Remove column
        db.engine.execute('ALTER TABLE exams DROP COLUMN new_field')
```

---

## Performance Optimization

To optimize database performance:

1. Use appropriate indexes for frequently queried columns
2. Implement connection pooling
3. Use read replicas for reporting queries
4. Cache frequently accessed data
5. Optimize slow queries with EXPLAIN ANALYZE
6. Consider database partitioning for large tables

---

## Backup and Recovery

For data protection:

1. Implement regular automated backups
2. Store backups in multiple locations
3. Test restore procedures regularly
4. Document recovery procedures
5. Consider point-in-time recovery for critical data
