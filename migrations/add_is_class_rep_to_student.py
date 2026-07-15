"""Migration to add is_class_rep column to student table"""

from models import db


def upgrade():
    """Add is_class_rep boolean column to student table"""
    try:
        db.session.execute(
            db.text("ALTER TABLE student ADD COLUMN is_class_rep BOOLEAN DEFAULT 0")
        )
        db.session.commit()
    except Exception:
        db.session.rollback()
        # Column already exists


if __name__ == "__main__":
    upgrade()
