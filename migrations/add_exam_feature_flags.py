"""
Migration: Add feature flags to Exam model
- calculator_enabled: Allow calculator during exam
- is_on_the_go: On-The-Go test (ad-hoc, outside schedule)
- save_after_completion: Save On-The-Go results to DB
- show_feedback: Show detailed feedback after submission
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import db

COLUMNS = [
    ("calculator_enabled", "FALSE"),
    ("is_on_the_go", "FALSE"),
    ("save_after_completion", "TRUE"),
    ("show_feedback", "TRUE"),
]

def upgrade():
    for col, default in COLUMNS:
        try:
            db.session.execute(db.text(
                f"ALTER TABLE exams ADD COLUMN {col} BOOLEAN DEFAULT {default}"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()

def downgrade():
    for col, _ in COLUMNS:
        try:
            db.session.execute(db.text(f"ALTER TABLE exams DROP COLUMN {col}"))
            db.session.commit()
        except Exception:
            db.session.rollback()

if __name__ == "__main__":
    from flask import Flask
    BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///" + os.path.join(BASE_DIR, "instance", "users.db")
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)

    with app.app_context():
        upgrade()
