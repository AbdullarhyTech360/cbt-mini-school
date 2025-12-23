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
**Table Name**: `user`

The base model for all users in the system (students, teachers, staff, admin).

#### Fields:
| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | String(36) | PK, Unique | UUID primary key |
| username | String(20) | NOT NULL, Unique | Login username |
| email | String(120) | Unique, Nullable | Email address (nullable for students) |
| register_number | String(20) | Nullable | Registration number |
| first_name | String(100) | NOT NULL | User's first name |
| last_name | String(100) | NOT NULL | User's last name |
| gender | String(20) | NOT NULL | Gender (Male/Female) |
| dob | Date | NOT NULL | Date of birth |
| image | String(200) | Nullable | Profile image path |
| class_room_id | String(36) | FK, Nullable | Reference to ClassRoom |
| role | String(20) | NOT NULL | Role (student/teacher/staff/admin) |
| password | String(100) | NOT NULL | Hashed password (bcrypt) |
| is_active | Boolean | NOT NULL, Default: True | Account status |
| created_at | DateTime | NOT NULL | Record creation timestamp |
| updated_at | DateTime | NOT NULL | Last update timestamp |

#### Relationships:
- **class_room**: Many-to-One with ClassRoom
- **attendance_records**: One-to-Many with Attendance (as student)
- **grades**: One-to-Many with Grade (as student)
- **form_teacher_classes**: One-to-Many with ClassRoom (as form teacher)
- **class_rep_classes**: One-to-Many with ClassRoom (as class representative)
- **primary_subjects**: One-to-Many with Subject (as primary teacher)

#### Methods:
- `full_name()`: Returns full name (first + last)
- `set_password(password)`: Hashes and sets password
- `check_password(password)`: Verifies password
- `generate_username(last_class_number, role)`: Generates username based on role

---

### 2. Student Model
**Table Name**: `student`

Extends User model with student-specific information using joined table inheritance.

#### Fields:
| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | String(36) | PK, FK(user.id) | References User.id |
| admission_number | String(20) | Unique, Nullable | Student admission number |
| admission_date | Date | Nullable | Date of admission |
| parent_name | String(200) | Nullable | Parent/Guardian name |
| parent_phone | String(20) | Nullable | Parent contact number |
| parent_email | String(120) | Nullable | Parent email address |
| blood_group | String(5) | Nullable | Blood group (A+, B+, O-, etc.) |
| address | Text | Nullable | Residential address |

#### Inherited from User:
All User model fields and relationships are available.

---

### 3. Teacher Model
**Table Name**: `teacher`

Extends User model with teacher-specific information using joined table inheritance.

#### Fields:
| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | String(36) | PK, FK(user.id) | References User.id |
| employee_id | String(20) | Unique, Nullable | Employee ID number |
| joining_date | Date | Nullable | Date of joining |
| qualification | String(200) | Nullable | Academic qualifications |
| specialization | String(200) | Nullable | Subject specialization |
| salary | Float | Nullable | Monthly salary |
| experience_years | Integer | Nullable | Years of experience |
| phone | String(20) | Nullable | Contact number |
| address | Text | Nullable | Residential address |

#### Inherited from User:
All User model fields and relationships are available.

---

### 4. ClassRoom Model
**Table Name**: `class_room`

Represents a class/classroom in the school.

#### Fields:
| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| class_room_id | String(36) | PK | UUID primary key |
| class_room_name | String(100) | NOT NULL, Unique | Name of the classroom |
| level | Integer | Nullable | Grade level (1, 2, 3, etc.) |
| section | String(50) | Nullable | Section (A, B, C, etc.) |
| number_of_students | Integer | NOT NULL, Default: 0 | Current student count |
| class_capacity | Integer | NOT NULL, Default: 40 | Maximum capacity |
| form_teacher_id | String(36) | FK(user.id), Nullable | Reference to Teacher |
| class_rep_id | String(36) | FK(user.id), Nullable | Reference to Student |
| is_active | Boolean | NOT NULL, Default: True | Classroom status |
| academic_year | String(20) | Nullable | Academic year (e.g., "2024-2025") |
| created_at | DateTime | NOT NULL | Record creation timestamp |
| updated_at | DateTime | NOT NULL | Last update timestamp |

#### Relationships:
- **users**: One-to-Many with User (students in this class)
- **form_teacher**: Many-to-One with User (teacher)
- **class_rep**: Many-to-One with User (student)
- **subjects**: One-to-Many with Subject
- **attendance_records**: One-to-Many with Attendance
- **grades**: One-to-Many with Grade

#### Methods:
- `update_student_count()`: Updates number_of_students from database
- `get_students()`: Returns list of active students
- `get_available_spaces()`: Returns available capacity
- `is_full()`: Checks if classroom is at capacity

---

### 5. Subject Model
**Table Name**: `subject`

Represents academic subjects taught in the school.

#### Fields:
| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| subject_id | String(36) | PK | UUID primary key |
| subject_name | String(100) | NOT NULL | Name of subject |
| subject_code | String(20) | NOT NULL, Unique | Subject code (e.g., MATH101) |
| description | Text | Nullable | Subject description |
| class_room_id | String(36) | FK, Nullable | Reference to ClassRoom |
| primary_teacher_id | String(36) | FK(user.id), Nullable | Primary teacher for subject |
| is_active | Boolean | NOT NULL, Default: True | Subject status |
| credit_hours | Integer | Nullable, Default: 3 | Credit hours |
| created_at | DateTime | NOT NULL | Record creation timestamp |
| updated_at | DateTime | NOT NULL | Last update timestamp |

#### Relationships:
- **class_room**: Many-to-One with ClassRoom
- **primary_teacher**: Many-to-One with User
- **grades**: One-to-Many with Grade

---

## Academic Management Models

### 6. Grade Model
**Table Name**: `grade`

Tracks student grades, assessments, and results.

#### Fields:
| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| grade_id | String(36) | PK | UUID primary key |
| student_id | String(36) | FK(user.id), NOT NULL | Reference to Student |
| subject_id | String(36) | FK, NOT NULL | Reference to Subject |
| class_room_id | String(36) | FK, NOT NULL | Reference to ClassRoom |
| teacher_id | String(36) | FK(user.id), Nullable | Teacher who graded |
| term_id | String(36) | FK, NOT NULL | Reference to SchoolTerm |
| assessment_type | String(50) | NOT NULL | Type (test/exam/assignment/quiz/project) |
| assessment_name | String(200) | Nullable | Name of assessment |
| max_score | Float | NOT NULL, Default: 100.0 | Maximum possible score |
| score | Float | NOT NULL | Student's score |
| percentage | Float | Nullable | Calculated percentage |
| grade_letter | String(5) | Nullable | Letter grade (A, B, C, D, F) |
| remarks | Text | Nullable | Teacher's remarks |
| academic_session | String(20) | NOT NULL | Academic session |
| assessment_date | Date | Nullable | Date of assessment |
| is_published | Boolean | NOT NULL, Default: False | Visibility to students |
| created_at | DateTime | NOT NULL | Record creation timestamp |
| updated_at | DateTime | NOT NULL | Last update timestamp |

#### Relationships:
- **student**: Many-to-One with User
- **subject**: Many-to-One with Subject
- **class_room**: Many-to-One with ClassRoom
- **teacher**: Many-to-One with User
- **term**: Many-to-One with SchoolTerm

#### Methods:
- `calculate_percentage()`: Calculates percentage from score
- `assign_grade_letter()`: Assigns letter grade based on percentage
- `to_dict()`: Converts to dictionary format

---

### 7. Attendance Model
**Table Name**: `attendance`

Tracks daily student attendance.

#### Fields:
| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| attendance_id | String(36) | PK | UUID primary key |
| student_id | String(36) | FK(user.id), NOT NULL | Reference to Student |
| class_room_id | String(36) | FK, NOT NULL | Reference to ClassRoom |
| marked_by_id | String(36) | FK(user.id), Nullable | Teacher who marked |
| attendance_date | Date | NOT NULL | Date of attendance |
| status | String(20) | NOT NULL, Default: "present" | Status (present/absent/late/excused) |
| remarks | Text | Nullable | Additional remarks |
| term_id | String(36) | FK, Nullable | Reference to SchoolTerm |
| academic_session | String(20) | Nullable | Academic session |
| created_at | DateTime | NOT NULL | Record creation timestamp |
| updated_at | DateTime | NOT NULL | Last update timestamp |

#### Relationships:
- **student**: Many-to-One with User
- **class_room**: Many-to-One with ClassRoom
- **marked_by**: Many-to-One with User (teacher)
- **term**: Many-to-One with SchoolTerm

#### Methods:
- `to_dict()`: Converts to dictionary format

---

## School Administration Models

### 8. School Model
**Table Name**: `school`

Represents the school entity with basic information.

#### Fields:
| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| school_id | String(36) | PK | UUID primary key |
| school_name | String(200) | NOT NULL | Name of school |
| school_code | String(20) | Unique, Nullable | School code |
| website | String(200) | Nullable | School website URL |
| address | Text | NOT NULL | School address |
| phone | String(20) | NOT NULL | Contact phone |
| email | String(120) | NOT NULL | Contact email |
| current_term | Integer | NOT NULL, Default: 1 | Current term (1, 2, or 3) |
| current_session | String(20) | NOT NULL | Current session (e.g., "2024-2025") |
| motto | String(200) | Nullable | School motto |
| logo | String(200) | Nullable | Path to logo image |
| established_date | Date | Nullable | Date established |
| principal_name | String(200) | Nullable | Principal's name |
| is_active | Boolean | NOT NULL, Default: True | School status |
| created_at | DateTime | NOT NULL | Record creation timestamp |
| updated_at | DateTime | NOT NULL | Last update timestamp |

#### Relationships:
- **terms**: One-to-Many with SchoolTerm
- **sections**: One-to-Many with Section

---

### 9. SchoolTerm Model
**Table Name**: `school_term`

Represents academic terms/semesters.

#### Fields:
| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| term_id | String(36) | PK | UUID primary key |
| term_name | String(50) | NOT NULL | Term name (e.g., "First Term") |
| term_number | Integer | NOT NULL | Term number (1, 2, or 3) |
| start_date | Date | NOT NULL | Term start date |
| end_date | Date | NOT NULL | Term end date |
| academic_session | String(20) | NOT NULL | Academic session (e.g., "2024-2025") |
| school_id | String(36) | FK, NOT NULL | Reference to School |
| is_active | Boolean | NOT NULL, Default: True | Term status |
| is_current | Boolean | NOT NULL, Default: False | Whether this is current term |
| created_at | DateTime | NOT NULL | Record creation timestamp |
| updated_at | DateTime | NOT NULL | Last update timestamp |

#### Relationships:
- **school**: Many-to-One with School
- **attendances**: One-to-Many with Attendance
- **grades**: One-to-Many with Grade

---

### 10. Section Model
**Table Name**: `section`

Represents school sections (e.g., Primary, Secondary).

#### Fields:
| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| section_id | String(36) | PK | UUID primary key |
| name | String(50) | NOT NULL, Unique | Section name |
| description | Text | Nullable | Section description |
| abbreviation | String(10) | NOT NULL, Unique | Short code (e.g., "PRI", "SEC") |
| level | Integer | Nullable | Level (1 for Primary, 2 for Secondary) |
| is_active | Boolean | Default: True | Section status |
| created_at | DateTime | NOT NULL | Record creation timestamp |
| updated_at | DateTime | NOT NULL | Last update timestamp |
| school_id | String(36) | FK, Nullable | Reference to School |

#### Relationships:
- **school**: Many-to-One with School

#### Methods:
- `get_classrooms_count()`: Returns number of classrooms
- `get_active_classrooms()`: Returns active classrooms
- `activate()`: Activates section
- `deactivate()`: Deactivates section
- `to_dict()`: Converts to dictionary format

---

### 11. Permission Model
**Table Name**: `permission`

Manages user permissions and access control.

#### Fields:
| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| permission_id | String(36) | PK | UUID primary key |
| permission_name | String(20) | NOT NULL | Permission name |
| permission_description | String(100) | NOT NULL | Description |
| is_active | Boolean | NOT NULL, Default: True | Permission status |
| created_for | String(20) | NOT NULL | Role this permission is for |
| permission_created_at | DateTime | NOT NULL | Record creation timestamp |
| permission_updated_at | DateTime | NOT NULL | Last update timestamp |

---

## Association Tables (Many-to-Many)

### 12. teacher_subject
Links teachers to subjects they teach.

| Field Name | Type | Constraints |
|------------|------|-------------|
| teacher_id | String(36) | FK(user.id), PK |
| subject_id | String(36) | FK(subject.subject_id), PK |

### 13. student_subject
Links students to subjects they're enrolled in.

| Field Name | Type | Constraints |
|------------|------|-------------|
| student_id | String(36) | FK(user.id), PK |
| subject_id | String(36) | FK(subject.subject_id), PK |

### 14. teacher_classroom
Links teachers to classrooms they teach.

| Field Name | Type | Constraints |
|------------|------|-------------|
| teacher_id | String(36) | FK(user.id), PK |
| classroom_id | String(36) | FK(class_room.class_room_id), PK |

---

## Entity Relationship Diagram (Text)

```
School
  ├── SchoolTerm (1:N)
  ├── Section (1:N)
  └── (manages)

User (Base)
  ├── Student (Inheritance)
  ├── Teacher (Inheritance)
  ├── ClassRoom (1:N as students)
  ├── Attendance (1:N as student)
  ├── Grade (1:N as student)
  └── Subject (1:N as primary teacher)

ClassRoom
  ├── User (N:1 as form_teacher)
  ├── User (N:1 as class_rep)
  ├── User (1:N as students)
  ├── Subject (1:N)
  ├── Attendance (1:N)
  └── Grade (1:N)

Subject
  ├── ClassRoom (N:1)
  ├── User (N:1 as primary_teacher)
  ├── Teacher (N:M via teacher_subject)
  ├── Student (N:M via student_subject)
  └── Grade (1:N)

SchoolTerm
  ├── School (N:1)
  ├── Attendance (1:N)
  └── Grade (1:N)

Grade
  ├── Student (N:1)
  ├── Subject (N:1)
  ├── ClassRoom (N:1)
  ├── Teacher (N:1)
  └── SchoolTerm (N:1)

Attendance
  ├── Student (N:1)
  ├── ClassRoom (N:1)
  ├── Teacher (N:1 as marked_by)
  └── SchoolTerm (N:1)
```

---

## Key Improvements Made

1. **Standardized ID Types**: All models now use UUID (String(36)) for consistency
2. **Fixed Inheritance**: Student and Teacher use proper joined table inheritance
3. **Added Essential Models**: Attendance and Grade models for complete school management
4. **Proper Relationships**: All foreign keys properly reference correct tables
5. **Soft Deletes**: Added is_active field to most models
6. **Audit Trails**: All models have created_at and updated_at timestamps
7. **Data Integrity**: Proper foreign key constraints throughout
8. **Additional Fields**: Added important fields like parent information, qualifications, etc.
9. **Utility Methods**: Added helper methods for common operations
10. **Fixed Association Tables**: Many-to-many relationships properly implemented

---

## Usage Examples

### Creating a Student
```python
from models import db, User, Student
from datetime import date

# Create base user
student = Student()
student.username = "ST2024001"
student.first_name = "John"
student.last_name = "Doe"
student.email = None  # Optional for students
student.gender = "Male"
student.dob = date(2010, 5, 15)
student.role = "student"
student.class_room_id = classroom_id
student.set_password("password123")

# Add student-specific info
student.admission_number = "ADM2024001"
student.admission_date = date.today()
student.parent_name = "Jane Doe"
student.parent_phone = "+1234567890"

db.session.add(student)
db.session.commit()
```

### Recording Attendance
```python
from models import Attendance
from datetime import date

attendance = Attendance()
attendance.student_id = student.id
attendance.class_room_id = classroom_id
attendance.attendance_date = date.today()
attendance.status = "present"
attendance.marked_by_id = teacher.id
attendance.term_id = current_term_id

db.session.add(attendance)
db.session.commit()
```

### Recording Grades
```python
from models import Grade

grade = Grade()
grade.student_id = student.id
grade.subject_id = subject.subject_id
grade.class_room_id = classroom_id
grade.teacher_id = teacher.id
grade.term_id = term_id
grade.assessment_type = "exam"
grade.assessment_name = "Mid-Term Exam"
grade.max_score = 100.0
grade.score = 85.5
grade.academic_session = "2024-2025"
grade.calculate_percentage()
grade.assign_grade_letter()

db.session.add(grade)
db.session.commit()
```

---

## Migration Notes

When updating an existing database:

1. **Backup your database** before applying changes
2. Delete the old database file if using SQLite
3. Run `db.create_all()` to create new schema
4. Migrate data from old schema if needed
5. Update application code to use new model structure

---

## Future Enhancements

Consider adding these models in future versions:

1. **Timetable/Schedule**: Class schedules and periods
2. **Fee Management**: Student fees, payments, and invoices
3. **Library**: Book management and borrowing
4. **Events/Calendar**: School events and calendar
5. **Announcements**: School-wide announcements
6. **Messages**: Internal messaging system
7. **Reports**: Report card generation
8. **Exam Management**: Exam scheduling and management
9. **Homework/Assignments**: Assignment tracking
10. **Parent Portal**: Parent account and communication

---

## Database Maintenance

### Regular Tasks:
- Monitor database size and performance
- Regular backups (daily recommended)
- Index optimization on frequently queried fields
- Clean up old session data
- Archive old academic records

### Security:
- Never store plain text passwords (using bcrypt)
- Use parameterized queries (SQLAlchemy handles this)
- Implement role-based access control
- Regular security audits
- Keep SQLAlchemy updated

---

## Contact & Support

For questions or issues with the database schema, please refer to:
- Project README.md
- SQLAlchemy documentation: https://docs.sqlalchemy.org/
- Flask-SQLAlchemy documentation: https://flask-sqlalchemy.palletsprojects.com/

---

**Last Updated**: January 2025
**Schema Version**: 2.0
**Database**: SQLite (Development) / PostgreSQL (Production Recommended)