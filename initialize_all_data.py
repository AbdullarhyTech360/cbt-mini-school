#!/usr/bin/env python3
"""
Comprehensive Initialization Script for CBT Minischool Platform

This script initializes all default data for the school system including:
- School information
- Academic terms
- Assessment types
- Sections and classrooms
- Default users (admin, teachers, students)
- Subjects
- Permissions
- Subject-class associations

Run this script ONCE after setting up the database to populate default data.
"""

import sys
import os

# Add the project directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app import app, db
    from models.school import School
    from models.school_term import SchoolTerm
    from models.assessment_type import AssessmentType
    from models.section import Section
    from models.class_room import ClassRoom
    from models.user import User
    from models.teacher import Teacher
    from models.student import Student
    from models.subject import Subject
    from models.permissions import Permission
    from models.associations import class_subject
    from datetime import date
    from services.generate_uuid import generate_uuid
except ImportError as e:
    # print(f"Error importing modules: {e}")
    # print("Make sure you have installed the required dependencies:")
    # print("pip install flask flask-sqlalchemy sqlalchemy python-dotenv flask-login flask-bcrypt flask-wtf uuid flask-session python-docx weasyprint docx xhtml2pdf")
    sys.exit(1)

def create_school():
    """Create default school if it doesn't exist"""
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
        # print("✓ Default school created")
        return school
    else:
        # print("✓ School already exists")
        return school

def create_school_terms(school):
    """Create default school terms"""
    # Only create terms if none exist for this session
    existing_terms = SchoolTerm.query.filter_by(academic_session="2024-2025").count()
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
            # print(f"✓ Created term: {term_data['name']} {current_status}")
        
        # Update school current_term to "First Term"
        school.current_term = "First Term"
        db.session.commit()
        return True
    else:
        # print("✓ School terms already exist")
        return False

def create_assessment_types(school):
    """Create default assessment types"""
    existing_assessments = AssessmentType.query.filter_by(school_id=school.school_id).count()
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
            # print(f"✓ Created assessment type: {assessment_data['name']} ({assessment_data['max_score']} marks)")
        return True
    else:
        # print("✓ Assessment types already exist")
        return False

def create_sections(school):
    """Create default sections"""
    existing_sections = Section.query.filter_by(school_id=school.school_id).count()
    if existing_sections == 0:
        sections_data = [
            {"name": "Primary", "abbreviation": "Primary", "level": 1, "description": "Primary education level"},
            {"name": "Junior Secondary", "abbreviation": "J.S.S", "level": 2, "description": "Junior secondary education level"},
            {"name": "Senior Secondary", "abbreviation": "S.S.S", "level": 3, "description": "Senior secondary education level"},
        ]
        
        sections = {}
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
            # print(f"✓ Created section: {section_data['name']}")
            sections[section_data["abbreviation"]] = section
        return sections
    else:
        # print("✓ Sections already exist")
        # Load existing sections
        sections = {}
        for section in Section.query.filter_by(school_id=school.school_id).all():
            sections[section.abbreviation] = section
        return sections

def create_classrooms(sections):
    """Create default classrooms for each section"""
    # Check if any classrooms exist
    existing_classrooms = ClassRoom.query.count()
    if existing_classrooms == 0:
        classrooms_data = [
            # Primary classes
            {"name": "Primary 1", "level": 1, "section_id": sections["Primary"].section_id},
            {"name": "Primary 2", "level": 2, "section_id": sections["Primary"].section_id},
            {"name": "Primary 3", "level": 3, "section_id": sections["Primary"].section_id},
            # Junior Secondary classes
            {"name": "J.S.S 1", "level": 1, "section_id": sections["J.S.S"].section_id},
            {"name": "J.S.S 2", "level": 2, "section_id": sections["J.S.S"].section_id},
            {"name": "J.S.S 3", "level": 3, "section_id": sections["J.S.S"].section_id},
            # Senior Secondary classes
            {"name": "S.S.S 1", "level": 1, "section_id": sections["S.S.S"].section_id},
            {"name": "S.S.S 2", "level": 2, "section_id": sections["S.S.S"].section_id},
            {"name": "S.S.S 3", "level": 3, "section_id": sections["S.S.S"].section_id},
        ]
        
        classrooms = {}
        for classroom_data in classrooms_data:
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
            # print(f"✓ Created classroom: {classroom_data['name']}")
            classrooms[classroom_data["name"]] = classroom
        return classrooms
    else:
        # print("✓ Classrooms already exist")
        # Load existing classrooms
        classrooms = {}
        for classroom in ClassRoom.query.all():
            classrooms[classroom.class_room_name] = classroom
        return classrooms

def create_admin_user(classrooms):
    """Create default admin user if one doesn't exist"""
    admin = User.query.filter_by(role="admin").first()
    if not admin:
        # print("Creating admin user...")
        # Get a default class for the admin user
        default_class = classrooms.get("Primary 1")
        if not default_class:
            default_class = ClassRoom.query.first()
        
        # Create admin user
        admin = User(
            id=generate_uuid(),
            username="admin",
            first_name="System",
            last_name="Administrator",
            email="admin@demoschool.com",
            gender="Male",
            dob=date(1990, 1, 1),
            class_room_id=default_class.class_room_id if default_class else None,
            role="admin",
            is_active=True
        )
        admin.set_password("aaaa")  # Default password
        db.session.add(admin)
        db.session.commit()
        # print("✓ Default admin created: username=admin, password=aaaa")
        return admin
    else:
        # print("✓ Admin user already exists")
        return admin

def create_teachers(classrooms):
    """Create default teacher accounts"""
    # Count existing teachers
    existing_teachers = User.query.filter_by(role="staff").count()
    if existing_teachers == 0:
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
            teacher = User(
                id=generate_uuid(),
                username=teacher_data["username"],
                first_name=teacher_data["first_name"],
                last_name=teacher_data["last_name"],
                email=teacher_data["email"],
                gender=teacher_data["gender"],
                dob=date(1985, 5, 15),
                class_room_id=classrooms["Primary 1"].class_room_id,
                role="staff",
                is_active=True
            )
            teacher.set_password(teacher_data["password"])
            db.session.add(teacher)
            db.session.flush()  # Get the user ID without committing
            
            # Create corresponding Teacher record
            teacher_record = Teacher(
                id=teacher.id,
                user_id=teacher.id,
                employee_id=f"EMP{len(teachers)+1:03d}",
                specialization="General Studies"
            )
            db.session.add(teacher_record)
            db.session.commit()
            # print(f"✓ Created teacher: {teacher_data['first_name']} {teacher_data['last_name']} (username: {teacher_data['username']})")
            teachers.append(teacher)
        return teachers
    else:
        # print("✓ Teachers already exist")
        return User.query.filter_by(role="staff").all()

def create_students(classrooms):
    """Create default student accounts"""
    # Count existing students
    existing_students = User.query.filter_by(role="student").count()
    if existing_students == 0:
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
        
        students = []
        for student_data in students_data:
            student_class = classrooms.get(student_data["class"])
            student = User(
                id=generate_uuid(),
                username=student_data["username"],
                first_name=student_data["first_name"],
                last_name=student_data["last_name"],
                email=student_data["email"],
                gender=student_data["gender"],
                dob=date(2010, 3, 20),
                class_room_id=student_class.class_room_id if student_class else classrooms["Primary 1"].class_room_id,
                role="student",
                is_active=True
            )
            student.set_password(student_data["password"])
            db.session.add(student)
            db.session.flush()  # Get the user ID without committing
            
            # Create corresponding Student record
            student_record = Student(
                id=student.id,
                user_id=student.id,
                admission_number=f"STU{student.id[:8].upper()}",
                admission_date=date.today()
            )
            db.session.add(student_record)
            db.session.commit()
            # print(f"✓ Created student: {student_data['first_name']} {student_data['last_name']} (username: {student_data['username']})")
            students.append(student)
        return students
    else:
        # print("✓ Students already exist")
        return User.query.filter_by(role="student").all()

def create_subjects():
    """Create default subjects"""
    # Check if subjects already exist by checking a few key ones
    math_subject = Subject.query.filter_by(subject_code="MATH").first()
    english_subject = Subject.query.filter_by(subject_code="ENG").first()
    
    if not math_subject and not english_subject:
        subjects_data = [
            {"name": "Mathematics", "code": "MATH", "category": "science", "icon": "calculate"},
            {"name": "English Language", "code": "ENG", "category": "language", "icon": "menu_book"},
            {"name": "Science", "code": "SCI", "category": "science", "icon": "science"},
            {"name": "Social Studies", "code": "SST", "category": "humanities", "icon": "public"},
            {"name": "Computer Science", "code": "CS", "category": "technology", "icon": "computer"},
        ]
        
        created_subjects = []
        for subject_data in subjects_data:
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
            # print(f"✓ Created subject: {subject_data['name']}")
            created_subjects.append(subject)
        db.session.commit()
        return created_subjects
    else:
        # print("✓ Subjects already exist")
        return Subject.query.all()

def link_subjects_to_classes(created_subjects, classrooms):
    """Link subjects to appropriate classes"""
    # Get all subjects by name for easier reference
    math_subject = next((s for s in created_subjects if s.subject_code == "MATH"), None)
    english_subject = next((s for s in created_subjects if s.subject_code == "ENG"), None)
    science_subject = next((s for s in created_subjects if s.subject_code == "SCI"), None)
    social_studies_subject = next((s for s in created_subjects if s.subject_code == "SST"), None)
    computer_science_subject = next((s for s in created_subjects if s.subject_code == "CS"), None)
    
    # Check if any links already exist
    existing_links = db.session.execute(db.select(class_subject)).fetchall()
    
    if not existing_links:
        # Link subjects to classes
        for classroom_name, classroom in classrooms.items():
            # All classes get Mathematics and English (general subjects)
            if math_subject:
                db.session.execute(
                    class_subject.insert().values(
                        class_room_id=classroom.class_room_id,
                        subject_id=math_subject.subject_id,
                    )
                )
            
            if english_subject:
                db.session.execute(
                    class_subject.insert().values(
                        class_room_id=classroom.class_room_id,
                        subject_id=english_subject.subject_id,
                    )
                )
            
            # Section-specific subjects
            if "Primary" in classroom_name:
                # Primary classes get all subjects
                subjects_to_link = [science_subject, social_studies_subject, computer_science_subject]
                for subject in subjects_to_link:
                    if subject:
                        db.session.execute(
                            class_subject.insert().values(
                                class_room_id=classroom.class_room_id,
                                subject_id=subject.subject_id,
                            )
                        )
            
            elif "J.S.S" in classroom_name:
                # Junior Secondary classes get all subjects
                subjects_to_link = [science_subject, social_studies_subject, computer_science_subject]
                for subject in subjects_to_link:
                    if subject:
                        db.session.execute(
                            class_subject.insert().values(
                                class_room_id=classroom.class_room_id,
                                subject_id=subject.subject_id,
                            )
                        )
            
            elif "S.S.S" in classroom_name:
                # Senior Secondary classes get all subjects
                subjects_to_link = [science_subject, social_studies_subject, computer_science_subject]
                for subject in subjects_to_link:
                    if subject:
                        db.session.execute(
                            class_subject.insert().values(
                                class_room_id=classroom.class_room_id,
                                subject_id=subject.subject_id,
                            )
                        )
        
        db.session.commit()
        # print("✓ Linked subjects to classrooms")
    else:
        # print("✓ Subject-class links already exist")

def create_permissions():
    """Create default permissions"""
    existing_permissions = Permission.query.count()
    if existing_permissions == 0:
        default_permissions = [
            ("users_can_register", "Allow users to self-register", "system"),
            ("teachers_create_exams", "Allow teachers to create exams", "staff"),
            (
                "students_view_results",
                "Allow students to view results immediately",
                "student",
            ),
            (
                "students_can_write_exam",
                "Allow students to write exams",
                "student",
            ),
            (
                "demo_question_bank",
                "Enable demo question bank for practice",
                "student",
            ),
        ]
        for perm_name, perm_desc, created_for in default_permissions:
            perm = Permission(
                permission_name=perm_name,
                permission_description=perm_desc,
                is_active=True,
                created_for=created_for,
            )
            db.session.add(perm)
        db.session.commit()
        # print("✓ Default permissions created")
        return True
    else:
        # print("✓ Permissions already exist")
        return False

def update_classroom_student_counts(classrooms):
    """Update student counts for all classrooms"""
    for classroom in classrooms.values():
        classroom.update_student_count()
    # print("✓ Updated classroom student counts")

def main():
    """Main initialization function"""
    # print("CBT Minischool Platform - Complete Data Initialization")
    # print("=" * 60)
    
    with app.app_context():
        # Ensure database tables exist
        db.create_all()
        
        # Initialize all data
        school = create_school()
        create_school_terms(school)
        create_assessment_types(school)
        sections = create_sections(school)
        classrooms = create_classrooms(sections)
        create_admin_user(classrooms)
        create_teachers(classrooms)
        create_students(classrooms)
        subjects = create_subjects()
        link_subjects_to_classes(subjects, classrooms)
        create_permissions()
        update_classroom_student_counts(classrooms)
        
        # print("\n" + "=" * 60)
        # print("✅ ALL DEFAULT DATA INITIALIZATION COMPLETE!")
        # print("=" * 60)
        # print("\nDefault Login Credentials:")
        # print("\nAdmin Account:")
        # print("  Username: admin")
        # print("  Password: aaaa")
        # print("\nTeacher Accounts:")
        # print("  Username: teacher1, Password: teacher123")
        # print("  Username: teacher2, Password: teacher123")
        # print("\nStudent Accounts:")
        # print("  Username: student1, Password: student123")
        # print("  Username: student2, Password: student123")
        # print("  Username: student3, Password: student123")
        # print("\n" + "=" * 60)

if __name__ == "__main__":
    main()