"""
Migration: Sync scores from exam_record to student_exam table
This migration populates the score, completed_at, and time_taken columns
in student_exam table using data from exam_record table
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from datetime import datetime

def run_migration():
    """Sync scores from exam_record to student_exam"""
    with app.app_context():
        try:
            print("Starting migration: Sync scores to student_exam table...")
            
            # Get all exam records
            query = db.text("""
                SELECT 
                    student_id,
                    exam_id,
                    raw_score,
                    submitted_at
                FROM exam_records
                WHERE student_id IS NOT NULL 
                AND exam_id IS NOT NULL
            """)
            
            exam_records = db.session.execute(query).fetchall()
            
            if not exam_records:
                print("✓ No exam records found to sync")
                return True
            
            print(f"Found {len(exam_records)} exam records to sync...")
            
            updated_count = 0
            skipped_count = 0
            
            for record in exam_records:
                student_id = record.student_id
                exam_id = record.exam_id
                score = float(record.raw_score) if record.raw_score else 0.0
                completed_at = record.submitted_at
                
                # Check if student_exam record exists
                check_query = db.text("""
                    SELECT student_id, exam_id, score 
                    FROM student_exam 
                    WHERE student_id = :student_id 
                    AND exam_id = :exam_id
                """)
                
                existing = db.session.execute(
                    check_query,
                    {'student_id': student_id, 'exam_id': exam_id}
                ).fetchone()
                
                if existing:
                    # Update existing record
                    update_query = db.text("""
                        UPDATE student_exam 
                        SET score = :score,
                            completed_at = :completed_at
                        WHERE student_id = :student_id 
                        AND exam_id = :exam_id
                    """)
                    
                    db.session.execute(
                        update_query,
                        {
                            'score': score,
                            'completed_at': completed_at,
                            'student_id': student_id,
                            'exam_id': exam_id
                        }
                    )
                    updated_count += 1
                else:
                    # Insert new record
                    insert_query = db.text("""
                        INSERT INTO student_exam (student_id, exam_id, score, completed_at)
                        VALUES (:student_id, :exam_id, :score, :completed_at)
                    """)
                    
                    db.session.execute(
                        insert_query,
                        {
                            'student_id': student_id,
                            'exam_id': exam_id,
                            'score': score,
                            'completed_at': completed_at
                        }
                    )
                    updated_count += 1
            
            db.session.commit()
            
            print(f"✓ Updated {updated_count} student_exam records")
            print(f"✓ Skipped {skipped_count} records")
            print("✓ Migration completed successfully!")
            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"✗ Migration failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    success = run_migration()
    if success:
        print("\n✓ Migration completed successfully!")
        print("\nNext steps:")
        print("1. Restart your server")
        print("2. Test the reset exam feature")
        print("3. Verify scores are showing correctly")
    else:
        print("\n✗ Migration failed!")
        print("Please check the error messages above")
