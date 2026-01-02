#!/usr/bin/env python3
"""
Test cases for report optimization
"""

import unittest
import io
import os
from app import app, db
from services.report_generator import ReportGenerator
from models.user import User
from models.grade import Grade
from models.grade_scale import GradeScale
from models.subject import Subject
from models.class_room import ClassRoom
from models.school_term import SchoolTerm
from models.assessment_type import AssessmentType

class TestReportOptimization(unittest.TestCase):
    """Test cases for report optimization"""

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
        """Create test data for report optimization tests"""
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

        # Create test assessment types
        self.assessment_types = []
        for code, name, max_score in [
            ('TEST1', 'Test 1', 20.0),
            ('TEST2', 'Test 2', 20.0),
            ('EXAM', 'Exam', 60.0)
        ]:
            assessment_type = AssessmentType(
                code=code,
                name=name,
                max_score=max_score
            )
            self.assessment_types.append(assessment_type)
            db.session.add(assessment_type)

        # Create grade scales
        grade_scales = [
            ('A', 70.0, 100.0, 'Excellent'),
            ('B', 60.0, 69.99, 'Good'),
            ('C', 50.0, 59.99, 'Average'),
            ('D', 45.0, 49.99, 'Below Average'),
            ('E', 40.0, 44.99, 'Poor'),
            ('F', 0.0, 39.99, 'Fail')
        ]

        for grade_name, min_score, max_score, remarks in grade_scales:
            grade_scale = GradeScale(
                grade_name=grade_name,
                min_score=min_score,
                max_score=max_score,
                remarks=remarks
            )
            db.session.add(grade_scale)

        db.session.commit()

        # Create test grades
        self.create_test_grades()

    def create_test_grades(self):
        """Create test grades for the student"""
        for assessment_type in self.assessment_types:
            score = assessment_type.max_score * 0.85  # 85% score

            grade = Grade()

            grade.student_id = self.student.id
            grade.subject_id = self.subject.subject_id
            grade.class_room_id = self.class_room.class_room_id
            grade.term_id = self.term.term_id
            grade.assessment_type = assessment_type.code
            grade.assessment_name = assessment_type.name
            grade.max_score = assessment_type.max_score
            grade.score = score
            grade.academic_session = self.term.academic_session

            # Calculate percentage and grade letter
            grade.calculate_percentage()
            grade.assign_grade_letter()

            db.session.add(grade)

        db.session.commit()

    def test_report_generation_performance(self):
        """Test report generation performance"""
        # Create report generator
        report_generator = ReportGenerator()

        # Generate report
        with self.app.app_context():
            report_data = report_generator.generate_report_data(
                student_id=self.student.id,
                term_id=self.term.term_id
            )

            # Verify report data
            self.assertIsNotNone(report_data)
            self.assertIn('student', report_data)
            self.assertIn('grades', report_data)
            self.assertIn('summary', report_data)

            # Verify student data
            student_data = report_data['student']
            self.assertEqual(student_data['id'], self.student.id)
            self.assertEqual(student_data['first_name'], self.student.first_name)
            self.assertEqual(student_data['last_name'], self.student.last_name)

            # Verify grades data
            grades_data = report_data['grades']
            self.assertEqual(len(grades_data), len(self.assessment_types))

            # Verify summary data
            summary_data = report_data['summary']
            self.assertIn('total_score', summary_data)
            self.assertIn('total_max_score', summary_data)
            self.assertIn('average_percentage', summary_data)
            self.assertIn('overall_grade', summary_data)

    def test_report_pdf_generation(self):
        """Test PDF generation performance"""
        # Create report generator
        report_generator = ReportGenerator()

        # Generate report data
        with self.app.app_context():
            report_data = report_generator.generate_report_data(
                student_id=self.student.id,
                term_id=self.term.term_id
            )

            # Generate PDF
            pdf_buffer = report_generator.generate_pdf_report(report_data)

            # Verify PDF
            self.assertIsNotNone(pdf_buffer)
            self.assertIsInstance(pdf_buffer, io.BytesIO)

            # Verify PDF size (should be reasonable)
            pdf_buffer.seek(0, os.SEEK_END)
            pdf_size = pdf_buffer.tell()
            self.assertGreater(pdf_size, 1000)  # Should be at least 1KB
            self.assertLess(pdf_size, 1024 * 1024)  # Should be less than 1MB

    def test_report_caching(self):
        """Test report caching functionality"""
        # Create report generator
        report_generator = ReportGenerator()

        # Generate report twice
        with self.app.app_context():
            # First generation
            report_data_1 = report_generator.generate_report_data(
                student_id=self.student.id,
                term_id=self.term.term_id
            )

            # Second generation (should use cache)
            report_data_2 = report_generator.generate_report_data(
                student_id=self.student.id,
                term_id=self.term.term_id
            )

            # Verify data is the same
            self.assertEqual(report_data_1, report_data_2)

    def test_report_optimization_for_large_datasets(self):
        """Test report optimization for large datasets"""
        # Create additional grades to simulate a larger dataset
        for i in range(50):  # Add 50 more grades
            for assessment_type in self.assessment_types:
                score = assessment_type.max_score * (0.5 + (i % 5) * 0.1)  # Varying scores

                grade = Grade(
                    student_id=self.student.id,
                    subject_id=self.subject.subject_id,
                    class_room_id=self.class_room.class_room_id,
                    term_id=self.term.term_id,
                    assessment_type=assessment_type.code,
                    assessment_name=f"{assessment_type.name} {i+1}",
                    max_score=assessment_type.max_score,
                    score=score,
                    academic_session=self.term.academic_session
                )

                # Calculate percentage and grade letter
                grade.calculate_percentage()
                grade.assign_grade_letter()

                db.session.add(grade)

        db.session.commit()

        # Create report generator
        report_generator = ReportGenerator()

        # Generate report with large dataset
        with self.app.app_context():
            import time
            start_time = time.time()

            report_data = report_generator.generate_report_data(
                student_id=self.student.id,
                term_id=self.term.term_id
            )

            end_time = time.time()
            generation_time = end_time - start_time

            # Verify report generation is reasonably fast (less than 2 seconds)
            self.assertLess(generation_time, 2.0)

            # Verify report data
            self.assertIsNotNone(report_data)
            self.assertIn('student', report_data)
            self.assertIn('grades', report_data)

            # Verify grades data includes all grades
            grades_data = report_data['grades']
            self.assertEqual(len(grades_data), len(self.assessment_types) * 51)  # 51 sets of grades

if __name__ == '__main__':
    unittest.main()
