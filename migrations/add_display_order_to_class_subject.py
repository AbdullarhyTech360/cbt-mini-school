"""Migration to add display_order column to class_subject table"""
from models import db


def upgrade():
    """Add display_order column to class_subject"""
    try:
        db.session.execute(
            db.text("ALTER TABLE class_subject ADD COLUMN display_order INTEGER DEFAULT 0")
        )
        db.session.commit()
        print("Added display_order column to class_subject")
    except Exception:
        print("display_order column already exists or error occurred")


def downgrade():
    """Remove display_order column from class_subject"""
    try:
        db.session.execute(
            db.text("ALTER TABLE class_subject DROP COLUMN display_order")
        )
        db.session.commit()
        print("Removed display_order column from class_subject")
    except Exception:
        print("Could not remove display_order column")


if __name__ == "__main__":
    print("Running migration: Add display_order to class_subject")
    upgrade()
    print("Migration completed!")
