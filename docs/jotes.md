

## 🧱 **Database Structure**

### **school**

* **id:** unique
* **school_name:** string, required
* **website:** optional
* **address:** optional
* **telephone_number:** optional
* **email:** optional
* **terms:** relation (recommended to separate as a `school_term` table)
* **current_term:** string (e.g. "2nd Term")
* **session:** string (e.g. "2024/2025")
* **created_at:** timestamp (auto-generated)
* **updated_at:** timestamp (auto-updated)

💡 *Purpose:*
Defines the root institution. Every classroom, user, and subject belongs to a school. Supports multiple schools in the future.

---

### **class_room**

* **id:** unique
* **class_room_name:** unique, default = “default class” (for teachers/admins)
* **category:** relation → `school`
* **category_short:** short alias (e.g. “JSS”, “SSS”)
* **level:** integer (e.g. 1, 2, 3, representing class level)
* **group:** optional (e.g. “Science”, “Arts”)
* **form_teacher_id:** relation → `teacher`
* **class_rep_id:** relation → `student`
* **average_performance:** float (auto-calculated)
* **performance:** optional details (could store grade metrics or rating)
* **subjects_offered:** relation → `subject` (many-to-many)
* **school_id:** relation → `school`
* **created_at:** timestamp

💡 *Purpose:*
Represents a specific class grouping. Links to its teacher, class representative, and subjects. Belongs to a school.

---

### **user**

* **id:** unique
* **first_name:** string
* **last_name:** string
* **username:** unique — generated automatically based on role and join date

  * For students: `ST + last 2 digits of joined_at + category_short + unique number`
  * For teachers: `TE + last 2 digits of joined_at + unique number`
* **class_room_id:** relation → `class_room`
* **register_number:** unique, auto-generated (e.g. total users + 1)
* **gender:** string
* **email:** unique, optional
* **photo:** optional (image path)
* **role:** one of [`admin`, `teacher`, `student`]
* **joined_at:** date/time user joined
* **hashed_password:** string (for login security)
* **is_active:** boolean (true/false)

💡 *Purpose:*
Central identity table for all users. Each user can be linked to either a student or teacher profile.

---

### **teacher**

* **id:** unique
* **user_id:** relation → `user`
* **assign_class:** many-to-many relation → `class_room`
* **subject_taken:** many-to-many relation → `subject`
* **phone_number:** optional
* **qualification:** list or relation (can be separate if multiple qualifications)
* **bio:** optional text about the teacher

💡 *Purpose:*
Holds extra details specific to teachers beyond the base user record.
Supports teaching multiple subjects or handling multiple classes.

---

### **student**

* **id:** unique
* **user_id:** relation → `user`
* **subjects_offered:** many-to-many relation → `subject`
* **guardian_name:** optional
* **date_of_birth:** optional
* **school_id:** relation → `school`

💡 *Purpose:*
Stores student-specific information, linked to their main user account.
Tracks what subjects they’re taking and optionally who their guardian is.

---

### **subject**

* **id:** unique
* **name:** unique
* **department:** optional (e.g. “Sciences”, “Humanities”)
* **subject_category:** string, default = “default”
* **subject_head:** relation → `teacher` (optional)
* **subject_code:** unique, optional (e.g. “PHY101”)
* **unique_name:** auto-generated field (e.g. “Mathematics-JSS2A”)
* **class_room_id:** relation → `class_room` (optional, if subject varies by class)
* **school_id:** relation → `school`

💡 *Purpose:*
Represents an academic subject. Can link to the teacher responsible, a department, and specific classes offering it.

---

### **school_term** (optional but recommended)

* **id:** unique
* **term_name:** e.g. “First Term”, “Second Term”, “Third Term”
* **start_date:** date
* **end_date:** date
* **academic_session:** string (e.g. “2024/2025”)
* **school_id:** relation → `school`

💡 *Purpose:*
Tracks school calendar terms and allows reports or performance metrics to be stored by term/session.

---

### **Overall Relationship Flow**

```
School
 ├── ClassRoom
 │    ├── Subject
 │    └── Student
 │
 └── User
      ├── Teacher
      └── Student
```

---

### ✅ **Key Improvements Introduced**

1. Added **timestamps** for record tracking (`created_at`, `updated_at`).
2. Ensured **foreign key relationships** replace plain names.
3. Improved naming clarity (`hashed_password` instead of `harsh_password`).
4. Introduced **Enum roles** for users (admin, teacher, student).
5. Added **multi-school support** through `school_id` fields.
6. Suggested **separate school_term table** for scalability.
7. Added **optional guardian and DOB fields** for better student data.
8. Standardized **many-to-many relationships** for subjects and classes.
