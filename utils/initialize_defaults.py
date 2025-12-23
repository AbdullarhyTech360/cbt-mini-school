from models import db
from models.assessment_type import AssessmentType
from models.school_term import SchoolTerm
from models.subject import Subject
from models.section import Section
from models import Permission
from models.school import School
from models.class_room import ClassRoom
from models.user import User
from datetime import date
import json


def initialize_default_data():
    """
    Initialize default data for the application.
    This creates a default school, terms, assessment types, sections, 
    classrooms, admin user, teachers, and students.
    """
    # Create default school first
    school = School.query.first()
    if not school:
        school = School(
            school_name="Demo School",
            address="123 Education Street, Learning City",
            phone="0800-123-4567",
            email="info@demoschool.com",
            current_session="2024-2025",
            current_term="First Term"
        )
        db.session.add(school)
        db.session.commit()
        print("Default school created.")
    else:
        print("School information already exists.")

    # Create default school terms
    # Only create terms if none exist for this session
    existing_terms = SchoolTerm.query.filter_by(
        academic_session="2024-2025").count()
    if existing_terms == 0:
        terms_data = [
            {
                "name": "First Term",
                "start_date": date(2024, 9, 1),
                "end_date": date(2024, 11, 15),
                "is_current": True,
            },
            {
                "name": "Second Term",
                "start_date": date(2024, 11, 25),
                "end_date": date(2025, 2, 28),
                "is_current": False,
            },
            {
                "name": "Third Term",
                "start_date": date(2025, 3, 10),
                "end_date": date(2025, 6, 30),
                "is_current": False,
            },
        ]

        for term_data in terms_data:
            term = SchoolTerm(
                term_name=term_data["name"],
                start_date=term_data["start_date"],
                end_date=term_data["end_date"],
                academic_session="2024-2025",
                school_id=school.school_id,
                is_active=True,
                is_current=term_data["is_current"]
            )
            db.session.add(term)
            db.session.commit()
            current_status = "(Current Term)" if term_data["is_current"] else ""
            print(f"Created term: {term_data['name']} {current_status}")

    # Update school current_term to "First Term"
    if school:
        school.current_term = "First Term"
        db.session.commit()

    # Create default assessment types (only if none exist)
    existing_assessments = AssessmentType.query.filter_by(
        school_id=school.school_id).count()
    if existing_assessments == 0:
        default_assessments = [
            {
                "name": "First CA",
                "code": "first_ca",
                "max_score": 20.0,
                "order": 1,
                "is_cbt_enabled": True,
                "description": "First Continuous Assessment"
            },
            {
                "name": "Second CA",
                "code": "second_ca",
                "max_score": 20.0,
                "order": 2,
                "is_cbt_enabled": False,
                "description": "Second Continuous Assessment"
            },
            {
                "name": "Exam",
                "code": "exam",
                "max_score": 60.0,
                "order": 3,
                "is_cbt_enabled": True,
                "description": "End of term examination"
            },
        ]

        for assessment_data in default_assessments:
            assessment = AssessmentType(
                name=assessment_data["name"],
                code=assessment_data["code"],
                max_score=assessment_data["max_score"],
                order=assessment_data["order"],
                is_cbt_enabled=assessment_data["is_cbt_enabled"],
                description=assessment_data["description"],
                school_id=school.school_id,
                is_active=True
            )
            db.session.add(assessment)
            db.session.commit()
            print(
                f"Created assessment type: {assessment_data['name']} ({assessment_data['max_score']} marks)")

    # Create sections (only if none exist)
    sections = {}
    existing_sections = Section.query.filter_by(
        school_id=school.school_id).count()
    if existing_sections == 0:
        sections_data = [
            {"name": "Primary", "abbreviation": "Primary",
                "level": 1, "description": "Primary education level"},
            {"name": "Junior Secondary", "abbreviation": "J.S.S",
                "level": 2, "description": "Junior secondary education level"},
            {"name": "Senior Secondary", "abbreviation": "S.S.S",
                "level": 3, "description": "Senior secondary education level"},
        ]

        for section_data in sections_data:
            section = Section(
                name=section_data["name"],
                abbreviation=section_data["abbreviation"],
                level=section_data["level"],
                description=section_data["description"],
                school_id=school.school_id,
                is_active=True
            )
            db.session.add(section)
            db.session.commit()
            print(f"Created section: {section_data['name']}")
            sections[section_data["abbreviation"]] = section
    else:
        # Load existing sections
        for section in Section.query.filter_by(school_id=school.school_id).all():
            sections[section.abbreviation] = section

    # Create default classrooms for each section
    classrooms_data = [
        # Primary classes
        {"name": "Primary 1", "level": 1,
            "section_id": sections["Primary"].section_id},
        {"name": "Primary 2", "level": 2,
            "section_id": sections["Primary"].section_id},
        {"name": "Primary 3", "level": 3,
            "section_id": sections["Primary"].section_id},
        # Junior Secondary classes
        {"name": "J.S.S 1", "level": 1,
            "section_id": sections["J.S.S"].section_id},
        {"name": "J.S.S 2", "level": 2,
            "section_id": sections["J.S.S"].section_id},
        {"name": "J.S.S 3", "level": 3,
            "section_id": sections["J.S.S"].section_id},
        # Senior Secondary classes
        {"name": "S.S.S 1", "level": 1,
            "section_id": sections["S.S.S"].section_id},
        {"name": "S.S.S 2", "level": 2,
            "section_id": sections["S.S.S"].section_id},
        {"name": "S.S.S 3", "level": 3,
            "section_id": sections["S.S.S"].section_id},
    ]

    classrooms = {}
    for classroom_data in classrooms_data:
        classroom = ClassRoom.query.filter_by(
            class_room_name=classroom_data["name"]).first()
        if not classroom:
            classroom = ClassRoom(
                class_room_name=classroom_data["name"],
                level=classroom_data["level"],
                section_id=classroom_data["section_id"],
                class_capacity=40,
                academic_year="2024-2025",
                is_active=True
            )
            db.session.add(classroom)
            db.session.commit()
            print(f"Created classroom: {classroom_data['name']}")
        classrooms[classroom_data["name"]] = classroom

    # Get or create default class for admin and teachers
    default_class = classrooms.get("Primary 1")

    # Create default admin user
    admin = User.query.filter_by(role="admin").first()
    if not admin:
        admin = User(
            username="admin",
            first_name="System",
            last_name="Administrator",
            email="admin@demoschool.com",
            gender="Male",
            dob=date(1990, 1, 1),
            class_room_id=default_class.class_room_id,
            role="admin",
            is_active=True
        )
        admin.set_password("aaaa")
        db.session.add(admin)
        db.session.commit()
        print("Default admin created: username=admin, password=aaaa")
    else:
        print("Admin already exists.")

    # Create default teacher accounts
    teachers_data = [
        {
            "username": "teacher1",
            "first_name": "John",
            "last_name": "Smith",
            "email": "john.smith@demoschool.com",
            "gender": "Male",
            "password": "teacher123"
        },
        {
            "username": "teacher2",
            "first_name": "Sarah",
            "last_name": "Johnson",
            "email": "sarah.johnson@demoschool.com",
            "gender": "Female",
            "password": "teacher123"
        },
    ]

    teachers = []
    for teacher_data in teachers_data:
        teacher = User.query.filter_by(
            username=teacher_data["username"]).first()
        if not teacher:
            teacher = User(
                username=teacher_data["username"],
                first_name=teacher_data["first_name"],
                last_name=teacher_data["last_name"],
                email=teacher_data["email"],
                gender=teacher_data["gender"],
                dob=date(1985, 5, 15),
                class_room_id=default_class.class_room_id,
                role="staff",
                is_active=True
            )
            teacher.set_password(teacher_data["password"])
            db.session.add(teacher)
            db.session.flush()  # Get the user ID without committing

            # Create corresponding Teacher record
            from models.teacher import Teacher
            teacher_record = Teacher(
                id=teacher.id,
                user_id=teacher.id,
                employee_id=f"EMP{len(teachers)+1:03d}",
                specialization="General Studies"
            )
            db.session.add(teacher_record)
            db.session.commit()
        else:
            # Check if Teacher record exists, create if not
            from models.teacher import Teacher
            teacher_record = Teacher.query.filter_by(
                user_id=teacher.id).first()
            if not teacher_record:
                teacher_record = Teacher(
                    id=teacher.id,
                    user_id=teacher.id,
                    employee_id=f"EMP{len(teachers)+1:03d}",
                    specialization="General Studies"
                )
                db.session.add(teacher_record)
                db.session.commit()
        teachers.append(teacher)

    # Create default student accounts
    students_data = [
        {
            "username": "student1",
            "first_name": "Michael",
            "last_name": "Williams",
            "email": "michael.williams@student.demoschool.com",
            "gender": "Male",
            "class": "Primary 1",
            "password": "student123"
        },
        {
            "username": "student2",
            "first_name": "Emily",
            "last_name": "Brown",
            "email": "emily.brown@student.demoschool.com",
            "gender": "Female",
            "class": "Primary 1",
            "password": "student123"
        },
        {
            "username": "student3",
            "first_name": "David",
            "last_name": "Davis",
            "email": "david.davis@student.demoschool.com",
            "gender": "Male",
            "class": "J.S.S 1",
            "password": "student123"
        },
    ]

    for student_data in students_data:
        student = User.query.filter_by(
            username=student_data["username"]).first()
        if not student:
            student_class = classrooms.get(student_data["class"])
            student = User(
                username=student_data["username"],
                first_name=student_data["first_name"],
                last_name=student_data["last_name"],
                email=student_data["email"],
                gender=student_data["gender"],
                dob=date(2010, 3, 20),
                class_room_id=student_class.class_room_id if student_class else default_class.class_room_id,
                role="student",
                is_active=True
            )
            student.set_password(student_data["password"])
            db.session.add(student)
            db.session.flush()  # Get the user ID without committing

            # Create corresponding Student record
            from models.student import Student
            student_record = Student(
                id=student.id,
                user_id=student.id,
                admission_number=f"STU{student.id[:8].upper()}",
                admission_date=date.today()
            )
            db.session.add(student_record)
            db.session.commit()
        else:
            # Check if Student record exists, create if not
            from models.student import Student
            student_record = Student.query.filter_by(
                user_id=student.id).first()
            if not student_record:
                student_record = Student(
                    id=student.id,
                    user_id=student.id,
                    admission_number=f"STU{student.id[:8].upper()}",
                    admission_date=date.today()
                )
                db.session.add(student_record)
                db.session.commit()

    # Create default subjects
    subjects_data = [
        {"name": "Mathematics", "code": "MATH",
            "category": "science", "icon": "calculate"},
        {"name": "English Language", "code": "ENG",
            "category": "language", "icon": "menu_book"},
        {"name": "Science", "code": "SCI",
            "category": "science", "icon": "science"},
        {"name": "Social Studies", "code": "SST",
            "category": "humanities", "icon": "public"},
        {"name": "Computer Science", "code": "CS",
            "category": "technology", "icon": "computer"},
    ]

    created_subjects = []
    for subject_data in subjects_data:
        # Check by both code AND name to prevent duplicates
        subject = Subject.query.filter(
            db.or_(
                Subject.subject_code == subject_data["code"],
                Subject.subject_name == subject_data["name"]
            )
        ).first()

        if not subject:
            subject = Subject(
                subject_name=subject_data["name"],
                subject_code=subject_data["code"],
                subject_category=subject_data["category"],
                icon_name=subject_data["icon"],
                academic_year="2024-2025",
                is_active=True
            )
            db.session.add(subject)
            db.session.flush()  # Get the subject ID without committing
            print(f"Created subject: {subject_data['name']}")
        else:
            print(
                f"Subject already exists: {subject_data['name']} (using existing)")
        created_subjects.append(subject)

    # Link subjects to appropriate classes
    math_subject = next(
        (s for s in created_subjects if s.subject_code == "MATH"), None)
    english_subject = next(
        (s for s in created_subjects if s.subject_code == "ENG"), None)
    science_subject = next(
        (s for s in created_subjects if s.subject_code == "SCI"), None)
    social_studies_subject = next(
        (s for s in created_subjects if s.subject_code == "SST"), None)
    computer_science_subject = next(
        (s for s in created_subjects if s.subject_code == "CS"), None)

    from models.associations import class_subject

    # Link subjects to classes
    for classroom_name, classroom in classrooms.items():
        if math_subject:
            existing_link = db.session.execute(
                db.select(class_subject).where(
                    class_subject.c.class_room_id == classroom.class_room_id,
                    class_subject.c.subject_id == math_subject.subject_id,
                )
            ).fetchone()

            if not existing_link:
                db.session.execute(
                    class_subject.insert().values(
                        class_room_id=classroom.class_room_id,
                        subject_id=math_subject.subject_id,
                    )
                )

        if english_subject:
            existing_link = db.session.execute(
                db.select(class_subject).where(
                    class_subject.c.class_room_id == classroom.class_room_id,
                    class_subject.c.subject_id == english_subject.subject_id,
                )
            ).fetchone()

            if not existing_link:
                db.session.execute(
                    class_subject.insert().values(
                        class_room_id=classroom.class_room_id,
                        subject_id=english_subject.subject_id,
                    )
                )

        if "Primary" in classroom_name:
            subjects_to_link = [
                science_subject, social_studies_subject, computer_science_subject]
            for subject in subjects_to_link:
                if subject:
                    existing_link = db.session.execute(
                        db.select(class_subject).where(
                            class_subject.c.class_room_id == classroom.class_room_id,
                            class_subject.c.subject_id == subject.subject_id,
                        )
                    ).fetchone()

                    if not existing_link:
                        db.session.execute(
                            class_subject.insert().values(
                                class_room_id=classroom.class_room_id,
                                subject_id=subject.subject_id,
                            )
                        )

        elif "J.S.S" in classroom_name:
            subjects_to_link = [
                science_subject, social_studies_subject, computer_science_subject]
            for subject in subjects_to_link:
                if subject:
                    existing_link = db.session.execute(
                        db.select(class_subject).where(
                            class_subject.c.class_room_id == classroom.class_room_id,
                            class_subject.c.subject_id == subject.subject_id,
                        )
                    ).fetchone()

                    if not existing_link:
                        db.session.execute(
                            class_subject.insert().values(
                                class_room_id=classroom.class_room_id,
                                subject_id=subject.subject_id,
                            )
                        )

        elif "S.S.S" in classroom_name:
            subjects_to_link = [
                science_subject, social_studies_subject, computer_science_subject]
            for subject in subjects_to_link:
                if subject:
                    existing_link = db.session.execute(
                        db.select(class_subject).where(
                            class_subject.c.class_room_id == classroom.class_room_id,
                            class_subject.c.subject_id == subject.subject_id,
                        )
                    ).fetchone()

                    if not existing_link:
                        db.session.execute(
                            class_subject.insert().values(
                                class_room_id=classroom.class_room_id,
                                subject_id=subject.subject_id,
                            )
                        )

    db.session.commit()

    # Update student counts for all classrooms
    for classroom in classrooms.values():
        classroom.update_student_count()

    # Ensure default permissions exist
    try:
        default_permissions = [
            ("users_can_register", "Allow users to self-register", "system"),
            ("teachers_create_exams", "Allow teachers to create exams", "staff"),
            ("students_view_results",
             "Allow students to view results immediately", "student"),
            ("students_can_write_exam", "Allow students to write exams", "student"),
            ("demo_question_bank", "Enable demo question bank for practice", "student"),
        ]
        for perm_name, perm_desc, created_for in default_permissions:
            if not Permission.query.filter_by(permission_name=perm_name).first():
                perm = Permission(
                    permission_name=perm_name,
                    permission_description=perm_desc,
                    is_active=True,
                    created_for=created_for,
                )
                db.session.add(perm)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error ensuring default permissions: {e}")

    print("\n" + "="*50)
    print("DEFAULT DATA INITIALIZATION COMPLETE")
    print("="*50)
