"""
Migration: Add mathematical notation and image support to questions and options
Date: 2025-11-17

Run this script to update your database:
    python migrations/add_math_and_image_support.py
"""

import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app
from models import db
from sqlalchemy import text


def upgrade():
    """Add columns for mathematical notation and image support"""
    with app.app_context():
        try:
            # Add columns to questions table
            with db.engine.connect() as conn:
                # Add question_image column
                conn.execute(text("""
                    ALTER TABLE questions 
                    ADD COLUMN question_image TEXT NULL
                """))
                
                # Add has_math column to questions
                conn.execute(text("""
                    ALTER TABLE questions 
                    ADD COLUMN has_math BOOLEAN DEFAULT 0
                """))
                
                # Add option_image column to options
                conn.execute(text("""
                    ALTER TABLE options 
                    ADD COLUMN option_image TEXT NULL
                """))
                
                # Add has_math column to options
                conn.execute(text("""
                    ALTER TABLE options 
                    ADD COLUMN has_math BOOLEAN DEFAULT 0
                """))
                
                conn.commit()
            
            # print("✓ Successfully added math and image support columns")
            return True
            
        except Exception as e:
            # print(f"✗ Error during migration: {str(e)}")
            db.session.rollback()
            return False


def downgrade():
    """Remove math and image support columns"""
    with app.app_context():
        try:
            with db.engine.connect() as conn:
                # Remove columns from questions table
                conn.execute(text("ALTER TABLE questions DROP COLUMN question_image"))
                conn.execute(text("ALTER TABLE questions DROP COLUMN has_math"))
                
                # Remove columns from options table
                conn.execute(text("ALTER TABLE options DROP COLUMN option_image"))
                conn.execute(text("ALTER TABLE options DROP COLUMN has_math"))
                
                conn.commit()
            
            # print("✓ Successfully removed math and image support columns")
            return True
            
        except Exception as e:
            # print(f"✗ Error during downgrade: {str(e)}")
            db.session.rollback()
            return False


if __name__ == '__main__':
    # print("Adding mathematical notation and image support to database...")
    # print("-" * 50)
    success = upgrade()
    # print("-" * 50)
    if success:
        # print("Migration complete!")
        # print("\nYour CBT system now supports:")
        # print("- Mathematical equations (LaTeX)")
        # print("- Scientific notation")
        # print("- Images in questions and options")
        # print("- Unicode symbols (√, ∑, ∫, π, etc.)")
        # print("\nNext steps:")
        # print("1. Update routes/student_routes.py (see MANUAL_UPDATE_REQUIRED.md)")
        # print("2. Restart your application")
        # print("3. Test with sample questions")
    else:
        # print("Migration failed. Please check the error messages above.")
