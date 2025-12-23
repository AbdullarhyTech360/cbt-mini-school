"""
Migration script to add exam_sessions table for tracking student progress during exams.
This allows students to resume their exams if they experience network issues or accidentally close their browser.

Run this script to update your database:
    python migrations/add_exam_sessions_table.py
"""

import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app
from models import db
from models.exam_session import ExamSession


def add_exam_sessions_table():
    """Add exam_sessions table to the database"""
    with app.app_context():
        try:
            # Create the exam_sessions table
            db.create_all()
            print("✓ Successfully created exam_sessions table")
            print("\nThe exam_sessions table has been added to your database.")
            print("Students can now resume their exams if they experience network issues.")
            print("\nFeatures:")
            print("- Auto-saves progress every 30 seconds")
            print("- Saves progress when student answers a question")
            print("- Saves progress before page unload")
            print("- Allows students to resume from where they left off")
            print("- Preserves question order and time remaining")
            
        except Exception as e:
            print(f"✗ Error creating exam_sessions table: {str(e)}")
            print("\nIf the table already exists, you can ignore this error.")


if __name__ == "__main__":
    print("Adding exam_sessions table to database...")
    print("-" * 50)
    add_exam_sessions_table()
    print("-" * 50)
    print("Migration complete!")
