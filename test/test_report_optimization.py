#!/usr/bin/env python3
"""
Test script to verify report card optimization improvements
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.report_generator import ReportGenerator
from models import db
from models.user import User
from models.student import Student
from models.school import School
from models.school_term import SchoolTerm
from models.class_room import ClassRoom
from models.subject import Subject
from models.grade import Grade
from models.assessment_type import AssessmentType
import json

def create_test_data():
    """Create minimal test data for report generation"""
    # Create a school
    school = School(
        school_name="Test School",
        address="123 Test Street",
        phone="123-456-7890"
    )
    db.session.add(school)
    
    # Create a term
    term = SchoolTerm(
        term_name="First Term",
        academic_session="2023/2024"
    )
    db.session.add(term)
    
    # Create a class
    class_room = ClassRoom(
        class_room_name="Primary 1"
    )
    db.session.add(class_room)
    
    # Create subjects
    math = Subject(subject_name="Mathematics")
    english = Subject(subject_name="English Language")
    science = Subject(subject_name="Basic Science")
    db.session.add_all([math, english, science])
    
    # Create assessment types
    ca1 = AssessmentType(
        name="First CA",
        code="ca1",
        max_score=20,
        order=1
    )
    ca2 = AssessmentType(
        name="Second CA",
        code="ca2",
        max_score=20,
        order=2
    )
    exam = AssessmentType(
        name="Examination",
        code="exam",
        max_score=60,
        order=3
    )
    db.session.add_all([ca1, ca2, exam])
    
    # Create a student
    user = User(
        first_name="John",
        last_name="Doe",
        email="john.doe@test.com",
        role="student"
    )
    db.session.add(user)
    db.session.flush()  # Get the user ID
    
    student = Student(
        user_id=user.id,
        admission_number="STU001"
    )
    db.session.add(student)
    
    # Create grades
    grades = [
        Grade(
            student_id=user.id,
            subject_id=math.subject_id,
            term_id=term.term_id,
            class_room_id=class_room.class_room_id,
            assessment_type="ca1",
            score=18,
            max_score=20,
            is_published=True
        ),
        Grade(
            student_id=user.id,
            subject_id=math.subject_id,
            term_id=term.term_id,
            class_room_id=class_room.class_room_id,
            assessment_type="ca2",
            score=19,
            max_score=20,
            is_published=True
        ),
        Grade(
            student_id=user.id,
            subject_id=math.subject_id,
            term_id=term.term_id,
            class_room_id=class_room.class_room_id,
            assessment_type="exam",
            score=55,
            max_score=60,
            is_published=True
        ),
        Grade(
            student_id=user.id,
            subject_id=english.subject_id,
            term_id=term.term_id,
            class_room_id=class_room.class_room_id,
            assessment_type="ca1",
            score=17,
            max_score=20,
            is_published=True
        ),
        Grade(
            student_id=user.id,
            subject_id=english.subject_id,
            term_id=term.term_id,
            class_room_id=class_room.class_room_id,
            assessment_type="ca2",
            score=18,
            max_score=20,
            is_published=True
        ),
        Grade(
            student_id=user.id,
            subject_id=english.subject_id,
            term_id=term.term_id,
            class_room_id=class_room.class_room_id,
            assessment_type="exam",
            score=52,
            max_score=60,
            is_published=True
        )
    ]
    db.session.add_all(grades)
    
    db.session.commit()
    
    return {
        'student_id': user.id,
        'term_id': term.term_id,
        'class_room_id': class_room.class_room_id
    }

def test_report_generation():
    """Test the optimized report generation"""
    # print("Testing optimized report generation...")
    
    # Create test data
    test_ids = create_test_data()
    
    # Generate report data
    report_data = ReportGenerator.get_student_scores(
        test_ids['student_id'],
        test_ids['term_id'],
        test_ids['class_room_id']
    )
    
    if not report_data:
        # print("❌ Failed to generate report data")
        return False
    
    # Generate HTML report
    html_report = ReportGenerator.generate_report_html(report_data)
    
    if not html_report:
        # print("❌ Failed to generate HTML report")
        return False
    
    # Check that the HTML contains improved font sizes
    if 'font-size: 9pt' not in html_report and 'font-size: 8pt' not in html_report:
        # print("❌ Report does not contain improved font sizes")
        return False
    
    # Check that the HTML contains improved padding
    if 'padding: 4px' not in html_report and 'padding: 5px' not in html_report:
        # print("❌ Report does not contain improved padding")
        return False
    
    # print("✅ Report generation test passed")
    return True

def main():
    """Main test function"""
    # print("Running Report Card Optimization Tests...\n")
    
    try:
        success = test_report_generation()
        
        if success:
            # print("\n🎉 All tests passed! Report card optimization improvements are working correctly.")
            return 0
        else:
            # print("\n❌ Some tests failed. Please check the implementation.")
            return 1
            
    except Exception as e:
        # print(f"\n💥 Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit(main())