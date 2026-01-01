import sys
import os
from unittest.mock import MagicMock

# Add project root to path
sys.path.append('/home/abdullahi/Desktop/dev/projects/cbt-mini-school')

def test_pagination():
    from routes.report_routes import generate_broad_sheet_html
    
    # Mock data
    broad_sheet_data = [
        {
            "student_name": "John Doe",
            "admission_number": "101",
            "subjects": {
                "Math": {
                    "total_score": 80,
                    "max_possible": 100,
                    "percentage": 80,
                    "scores": [
                        {"assessment_type": "CA1", "score": 20, "max_score": 20, "percentage": 100},
                        {"assessment_type": "Exam", "score": 60, "max_score": 80, "percentage": 75}
                    ]
                },
                "English": {
                    "total_score": 70,
                    "max_possible": 100,
                    "percentage": 70,
                    "scores": [
                        {"assessment_type": "Exam", "score": 70, "max_score": 100, "percentage": 70}
                    ]
                }
            }
        }
    ]
    
    metadata = {
        "class_name": "SS1",
        "term_name": "First Term",
        "academic_session": "2023/2024"
    }
    
    school = MagicMock()
    school.school_name = "Test School"
    school.address = "Test Address"
    
    # Test with 1 subject per page
    html = generate_broad_sheet_html(broad_sheet_data, metadata, school, subjects_per_page=1)
    
    print(f"HTML Length: {len(html)}")
    
    # Check for page breaks
    if '<div style="page-break-before: always;"></div>' in html:
        print("SUCCESS: Found page break marker.")
    else:
        print("FAILURE: Page break marker NOT found.")
        
    # Check for multiple tables
    table_count = html.count('<table')
    print(f"Table Count: {table_count}")
    if table_count >= 2:
        print("SUCCESS: Multiple tables found for pagination.")
    else:
        print("FAILURE: Expected at least 2 tables for 2 subjects with 1 sub/page.")

    # Check for student name on each page
    name_count = html.count('John Doe')
    print(f"Name Count: {name_count}")
    if name_count >= 2:
        print("SUCCESS: Student name repeated on each page.")
    else:
        print("FAILURE: Student name not repeated.")

if __name__ == "__main__":
    try:
        test_pagination()
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error during test: {e}")
