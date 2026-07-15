"""
Migration to add setup_skipped column to the school table.
This allows admins to skip the first-time setup prompt permanently.
"""
from app import app, db


def add_setup_skipped_column():
    """Add setup_skipped boolean column to school table if it doesn't exist"""
    with app.app_context():
        try:
            db.session.execute(
                db.text(
                    "ALTER TABLE school ADD COLUMN setup_skipped BOOLEAN NOT NULL DEFAULT 0"
                )
            )
            db.session.commit()
            print("✓ Added setup_skipped column to school table")
        except Exception:
            db.session.rollback()
            print("  setup_skipped column already exists")


def upgrade():
    """Run the setup_skipped column migration."""
    add_setup_skipped_column()


if __name__ == "__main__":
    add_setup_skipped_column()
