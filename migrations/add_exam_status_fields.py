"""
Migration: Add status fields to Exam model
- is_active: Boolean to control if exam is visible to students
- is_finished: Boolean to mark exam as completed/finished
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import db
from models.exam import Exam

def upgrade():
    """Add is_active and is_finished columns to exams table"""
    for col, default in [("is_active", "TRUE"), ("is_finished", "FALSE")]:
        try:
            db.session.execute(db.text(
                f"ALTER TABLE exams ADD COLUMN {col} BOOLEAN DEFAULT {default}"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()
            # Column already exists — ignore

def downgrade():
    """Remove is_active and is_finished columns from exams table"""
    try:
        db.session.execute(db.text("ALTER TABLE exams DROP COLUMN is_active"))
        db.session.execute(db.text("ALTER TABLE exams DROP COLUMN is_finished"))
        db.session.commit()
        # print("✅ Successfully removed is_active and is_finished columns from exams table")
        
    except Exception as e:
        db.session.rollback()
        # print(f"❌ Error removing columns: {str(e)}")
        raise

if __name__ == "__main__":
    from flask import Flask
    import os
    
    app = Flask(__name__)
    BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///" + os.path.join(BASE_DIR, "instance", "users.db")
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    
    with app.app_context():
        # print("Running migration: Add exam status fields")
        upgrade()
