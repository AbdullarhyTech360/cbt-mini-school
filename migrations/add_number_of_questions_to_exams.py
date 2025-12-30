"""
Migration script to add number_of_questions column to exams table
Run this script to update the database schema
"""

import sqlite3
import os

def migrate():
    # Get the database path
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'users.db')
    
    if not os.path.exists(db_path):
        # print(f"Database not found at {db_path}")
        return False
    
    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(exams)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'number_of_questions' in columns:
            # print("Column 'number_of_questions' already exists in exams table")
            conn.close()
            return True
        
        # Add the new column
        # print("Adding 'number_of_questions' column to exams table...")
        cursor.execute("""
            ALTER TABLE exams 
            ADD COLUMN number_of_questions INTEGER
        """)
        
        conn.commit()
        # print("✓ Successfully added 'number_of_questions' column to exams table")
        
        # Verify the column was added
        cursor.execute("PRAGMA table_info(exams)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'number_of_questions' in columns:
            # print("✓ Migration verified successfully")
            conn.close()
            return True
        else:
            # print("✗ Migration verification failed")
            conn.close()
            return False
            
    except Exception as e:
        # print(f"✗ Error during migration: {str(e)}")
        if conn:
            conn.rollback()
            conn.close()
        return False

if __name__ == "__main__":
    # print("=" * 60)
    # print("Database Migration: Add number_of_questions to exams table")
    # print("=" * 60)
    
    success = migrate()
    
    if success:
        # print("\n✓ Migration completed successfully!")
        # print("You can now restart your Flask application.")
    else:
        # print("\n✗ Migration failed!")
        # print("Please check the error messages above.")
    
    # print("=" * 60)
