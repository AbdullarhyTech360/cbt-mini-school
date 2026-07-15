"""
Add promotion system tables and ClassRoom archive fields.

- student_class_history
- promotion_rule
- promotion_batch
- student_promotion
- class_room: is_archived, archived_at
"""
from sqlalchemy import text
from models import db


def upgrade():
    # New tables are created by db.create_all() in app.py.
    # This migration handles ALTER on existing tables.

    # Add is_archived and archived_at to class_room if missing
    try:
        db.session.execute(text(
            "ALTER TABLE class_room ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT 0"
        ))
        db.session.commit()
    except Exception:
        pass  # Column already exists

    try:
        db.session.execute(text(
            "ALTER TABLE class_room ADD COLUMN archived_at DATETIME"
        ))
        db.session.commit()
    except Exception:
        pass  # Column already exists
