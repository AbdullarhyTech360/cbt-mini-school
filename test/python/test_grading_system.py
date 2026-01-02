#!/usr/bin/env python3
"""
Test cases for the grading system
"""

import unittest
from app import app, db
from models.grade import Grade
from models.grade_scale import GradeScale
from models.user import User
from models.subject import Subject
from models.class_room import ClassRoom
from models.school_term import SchoolTerm
from models.assessment_type import AssessmentType

class TestGradingSystem(unittest.TestCase):
    """Test cases for the grading system"""

    def setUp(self):
        """Set up test fixtures"""
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app = app.test_client()
        self.app_context = app.app_context()
        self.app_context.push()
        db.create_all()

        # Create test data
        self.create_test_data()

    def tearDown(self):
        """Clean up after tests"""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def create_test_data(self):
        """Create test data for grading tests"""
        # Create test student
        self.student = User(
            username='test_student',
            email='student@test.com',
            first_name='Test',
            last_name='Student',
            role='student'
        )
        self.student.set_password('password')
        db.session.add(self.student)

        # Create test subject
        self.subject = Subject(
            subject_name='Test Subject',
            subject_code='TSUB'
        )
        db.session.add(self.subject)

        # Create test class room
        self.class_room = ClassRoom(
            class_room_name='Test Class',
            class_room_code='TCLASS'
        )
        db.session.add(self.class_room)

        # Create test term
        self.term = SchoolTerm(
            term_name='Test Term',
            academic_session='2023/2024'
        )
        db.session.add(self.term)

        # Create test assessment type
        self.assessment_type = AssessmentType(
            code='TEST',
            name='Test Assessment',
            max_score=100.0
        )
        db.session.add(self.assessment_type)

        # Create grade scale
        self.grade_scale = GradeScale(
            grade_name='A',
            min_score=70.0,
            max_score=100.0,
            remarks='Excellent'
        )
        db.session.add(self.grade_scale)

        db.session.commit()

    def test_grade_calculation(self):
        """Test grade calculation functionality"""
        # Create a grade with score 85
        grade = Grade(
            student_id=self.student.id,
            subject_id=self.subject.subject_id,
            class_room_id=self.class_room.class_room_id,
            term_id=self.term.term_id,
            assessment_type=self.assessment_type.code,
            assessment_name=self.assessment_type.name,
            max_score=self.assessment_type.max_score,
            score=85.0,
            academic_session=self.term.academic_session
        )

        # Calculate percentage and grade
        grade.calculate_percentage()
        grade.assign_grade_letter()

        # Verify calculations
        self.assertEqual(grade.percentage, 85.0)
        self.assertEqual(grade.grade, 'A')

        # Save to database
        db.session.add(grade)
        db.session.commit()

        # Retrieve from database
        saved_grade = Grade.query.filter_by(id=grade.id).first()

        # Verify saved values
        self.assertEqual(saved_grade.percentage, 85.0)
        self.assertEqual(saved_grade.grade, 'A')

    def test_grade_scale_lookup(self):
        """Test grade scale lookup functionality"""
        # Create a grade with score 65
        grade = Grade(
            student_id=self.student.id,
            subject_id=self.subject.subject_id,
            class_room_id=self.class_room.class_room_id,
            term_id=self.term.term_id,
            assessment_type=self.assessment_type.code,
            assessment_name=self.assessment_type.name,
            max_score=self.assessment_type.max_score,
            score=65.0,
            academic_session=self.term.academic_session
        )

        # Calculate percentage and grade
        grade.calculate_percentage()
        grade.assign_grade_letter()

        # Verify grade assignment
        self.assertEqual(grade.percentage, 65.0)
        self.assertIsNone(grade.grade)  # Should be None as no grade scale matches 65%

    def test_edge_cases(self):
        """Test edge cases in grading system"""
        # Test with zero score
        grade_zero = Grade(
            student_id=self.student.id,
            subject_id=self.subject.subject_id,
            class_room_id=self.class_room.class_room_id,
            term_id=self.term.term_id,
            assessment_type=self.assessment_type.code,
            assessment_name=self.assessment_type.name,
            max_score=self.assessment_type.max_score,
            score=0.0,
            academic_session=self.term.academic_session
        )
        grade_zero.calculate_percentage()
        self.assertEqual(grade_zero.percentage, 0.0)

        # Test with maximum score
        grade_max = Grade(
            student_id=self.student.id,
            subject_id=self.subject.subject_id,
            class_room_id=self.class_room.class_room_id,
            term_id=self.term.term_id,
            assessment_type=self.assessment_type.code,
            assessment_name=self.assessment_type.name,
            max_score=self.assessment_type.max_score,
            score=100.0,
            academic_session=self.term.academic_session
        )
        grade_max.calculate_percentage()
        self.assertEqual(grade_max.percentage, 100.0)

        # Test with negative score (should be handled gracefully)
        grade_negative = Grade(
            student_id=self.student.id,
            subject_id=self.subject.subject_id,
            class_room_id=self.class_room.class_room_id,
            term_id=self.term.term_id,
            assessment_type=self.assessment_type.code,
            assessment_name=self.assessment_type.name,
            max_score=self.assessment_type.max_score,
            score=-5.0,
            academic_session=self.term.academic_session
        )
        grade_negative.calculate_percentage()
        self.assertEqual(grade_negative.percentage, 0.0)  # Should be clamped to 0

if __name__ == '__main__':
    unittest.main()
