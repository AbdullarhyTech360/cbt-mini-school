#!/usr/bin/env python
"""
Test script for the new configurable grading system
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + '/..')

from models import db
from models.grade import Grade
from models.grade_scale import GradeScale
from models.school import School

def test_grading_system():
    """Test the configurable grading system"""
    # print("Testing configurable grading system...")
    
    # Create a test school if it doesn't exist
    school = School.query.first()
    if not school:
        school = School(
            school_name="Test School",
            abbreviation="TS",
            motto="Test Learning",
            address="123 Test Street",
            phone="123-456-7890"
        )
        db.session.add(school)
        db.session.commit()
        # print("Created test school")
    
    # Create a test grade scale
    scale = GradeScale(
        school_id=school.school_id,
        name="Test Grade Scale",
        description="Test grading scale for verification",
        is_active=True,
        is_default=False
    )
    
    # Set custom grade ranges
    grade_ranges = [
        {"grade": "A", "min_score": 80, "max_score": 100, "remark": "Excellent"},
        {"grade": "B", "min_score": 70, "max_score": 79, "remark": "Good"},
        {"grade": "C", "min_score": 60, "max_score": 69, "remark": "Average"},
        {"grade": "D", "min_score": 50, "max_score": 59, "remark": "Below Average"},
        {"grade": "F", "min_score": 0, "max_score": 49, "remark": "Fail"}
    ]
    scale.set_grade_ranges(grade_ranges)
    
    db.session.add(scale)
    db.session.commit()
    # print("Created test grade scale")
    
    # Create a test grade
    grade = Grade(
        score=85,
        max_score=100,
        academic_session="2023-2024"
    )
    
    # Test with the custom scale
    grade.calculate_percentage()
    grade.assign_grade_letter(scale)
    
    # print(f"Score: {grade.score}/{grade.max_score}")
    # print(f"Percentage: {grade.percentage}%")
    # print(f"Grade with custom scale: {grade.grade_letter}")
    # print(f"Remarks: {grade.remarks}")
    
    # Verify the grade is correct
    assert grade.grade_letter == "A", f"Expected A, got {grade.grade_letter}"
    assert grade.remarks == "Excellent", f"Expected 'Excellent', got '{grade.remarks}'"
    # print("✓ Custom scale test passed")
    
    # Test with default grading system (no scale)
    grade2 = Grade(
        score=75,
        max_score=100,
        academic_session="2023-2024"
    )
    grade2.calculate_percentage()
    grade2.assign_grade_letter()  # No scale provided, should use default
    
    # print(f"\nScore: {grade2.score}/{grade2.max_score}")
    # print(f"Percentage: {grade2.percentage}%")
    # print(f"Grade with default system: {grade2.grade_letter}")
    
    # With default system, 75% should be an A (70-100)
    assert grade2.grade_letter == "A", f"Expected A, got {grade2.grade_letter}"
    # print("✓ Default scale test passed")
    
    # Test edge cases
    edge_cases = [
        (100, "A", "Excellent"),
        (70, "A", "Excellent"),
        (69, "B", "Very Good"),
        (59, "B", "Very Good"),
        (58, "C", "Good"),
        (49, "C", "Good"),
        (48, "D", "Pass"),
        (40, "D", "Pass"),
        (39, "F", "Fail"),
        (0, "F", "Fail")
    ]
    
    # print("\nTesting edge cases with custom scale:")
    for score, expected_grade, expected_remark in edge_cases:
        test_grade = Grade(
            score=score,
            max_score=100,
            academic_session="2023-2024"
        )
        test_grade.calculate_percentage()
        test_grade.assign_grade_letter(scale)
        
        assert test_grade.grade_letter == expected_grade, f"For score {score}: expected {expected_grade}, got {test_grade.grade_letter}"
        assert test_grade.remarks == expected_remark, f"For score {score}: expected '{expected_remark}', got '{test_grade.remarks}'"
        # print(f"✓ Score {score}: Grade {test_grade.grade_letter}, Remark '{test_grade.remarks}'")
    
    # Clean up
    db.session.delete(scale)
    db.session.commit()
    # print("\n✓ All tests passed!")
    
    return True

if __name__ == "__main__":
    try:
        test_grading_system()
        # print("\n🎉 All grading system tests passed!")
    except Exception as e:
        # print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)