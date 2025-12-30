#!/usr/bin/env python3
"""Create test data for report generation testing"""

from app import app
from models.user import User
from models.grade import Grade
from models.subject import Subject
from models.school_term import SchoolTerm
from models.class_room import ClassRoom
from models.assessment_type import AssessmentType
from datetime import datetime
import random

def create_test_grades():
    """Create test grades for report generation testing"""
    with app.app_context():
        # Get first student
        student = User.query.filter_by(role='student').first()
        if not student:
            # print("No students found in database")
            return
            
        # print(f"Creating test data for student: {student.first_name} {student.last_name}")
        
        # Get first term
        term = SchoolTerm.query.first()
        if not term:
            # print("No terms found in database")
            return
            
        # print(f"Term: {term.term_name}")
        
        # Get first class room
        class_room = ClassRoom.query.first()
        if not class_room:
            # print("No class rooms found in database")
            return
            
        # print(f"Class: {class_room.class_room_name}")
        
        # Get first subject
        subject = Subject.query.first()
        if not subject:
            # print("No subjects found in database")
            return
            
        # print(f"Subject: {subject.subject_name}")
        
        # Get assessment types
        assessment_types = AssessmentType.query.filter_by(is_active=True).all()
        if not assessment_types:
            # print("No assessment types found in database")
            return
            
        # print("Assessment types:")
        for at in assessment_types:
            # print(f"  - {at.code}: {at.name} (max: {at.max_score})")
        
        # Create test grades for this student
        grades_created = 0
        for at in assessment_types:
            # Create a grade for this assessment type
            grade = Grade(
                student_id=student.id,
                subject_id=subject.subject_id,
                class_room_id=class_room.class_room_id,
                teacher_id=None,  # No teacher for now
                term_id=term.term_id,
                assessment_type=at.code,
                assessment_name=at.name,
                max_score=at.max_score,
                score=random.uniform(10, at.max_score),  # Random score between 10 and max
                academic_session=term.academic_session,
                assessment_date=datetime.now().date(),
                is_from_cbt=(at.code == 'cbt'),  # Mark CBT assessments
                is_published=True  # Make it visible
            )
            
            # Calculate percentage and grade letter
            grade.calculate_percentage()
            grade.assign_grade_letter()
            
            # Add to database
            from models import db
            db.session.add(grade)
            grades_created += 1
        
        # Commit changes
        from models import db
        db.session.commit()
        # print(f"Created {grades_created} test grades for student {student.first_name} {student.last_name}")

if __name__ == "__main__":
    create_test_grades()