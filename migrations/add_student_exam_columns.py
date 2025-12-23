"""
Migration: Add score, completed_at, and time_taken columns to student_exam table
This migration adds tracking columns to the student_exam association table
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from datetime import datetime

def run_migration():
    """Add columns to student_exam table"""
    with app.app_context():
        try:
            print("Starting migration: Add columns to student_exam table...")
            
            # Check if columns already exist
            inspector = db.inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('student_exam')]
            
            migrations_needed = []
            if 'score' not in columns:
                migrations_needed.append('score')
            if 'completed_at' not in columns:
                migrations_needed.append('completed_at')
            if 'time_taken' not in columns:
                migrations_needed.append('time_taken')
            
            if not migrations_needed:
                print("✓ All columns already exist in student_exam table")
                return True
            
            print(f"Adding columns: {', '.join(migrations_needed)}")
            
            # Add score column if needed
            if 'score' in migrations_needed:
                db.session.execute(db.text("""
                    ALTER TABLE student_exam 
                    ADD COLUMN score REAL
                """))
                print("✓ Added 'score' column")
            
            # Add completed_at column if needed
            if 'completed_at' in migrations_needed:
                db.session.execute(db.text("""
                    ALTER TABLE student_exam 
                    ADD COLUMN completed_at DATETIME
                """))
                print("✓ Added 'completed_at' column")
            
            # Add time_taken column if needed
            if 'time_taken' in migrations_needed:
                db.session.execute(db.text("""
                    ALTER TABLE student_exam 
                    ADD COLUMN time_taken INTEGER
                """))
                print("✓ Added 'time_taken' column")
            
            db.session.commit()
            print("✓ Migration completed successfully!")
            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"✗ Migration failed: {str(e)}")
            return False

if __name__ == "__main__":
    success = run_migration()
    if success:
        print("\n✓ Migration completed successfully!")
    else:
        print("\n✗ Migration failed!")
