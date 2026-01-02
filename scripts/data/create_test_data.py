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

            return



        # Get first term
        term = SchoolTerm.query.first()
        if not term:

            return



        # Get first class room
        class_room = ClassRoom.query.first()
        if not class_room:

            return



        # Get first subject
        subject = Subject.query.first()
        if not subject:

            return



        # Get assessment types
        assessment_types = AssessmentType.query.filter_by(is_active=True).all()
        if not assessment_types:

            return


        for at in assessment_types:

            pass

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


if __name__ == "__main__":
    create_test_grades()
