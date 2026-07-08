"""Migration to add section_id column to report_config table for multi-design support"""
from models import db
from app import app


def upgrade():
    """Add section_id column to report_config table"""
    with app.app_context():
        # Check if column exists first
        import sqlalchemy as sa
        from sqlalchemy import inspect

        inspector = inspect(db.engine)
        columns = [col["name"] for col in inspector.get_columns("report_config")]
        
        if "section_id" not in columns:
            # SQLite doesn't support ADD COLUMN + FK in one statement
            # The FK constraint is enforced by the SQLAlchemy ORM model definition
            db.session.execute(
                sa.text(
                    "ALTER TABLE report_config ADD COLUMN section_id VARCHAR(36)"
                )
            )
            db.session.commit()
            print("✓ Added section_id column to report_config table")
        else:
            print("✓ section_id column already exists in report_config table")


def downgrade():
    """Remove section_id column from report_config table"""
    with app.app_context():
        import sqlalchemy as sa
        from sqlalchemy import inspect

        inspector = inspect(db.engine)
        columns = [col["name"] for col in inspector.get_columns("report_config")]
        
        if "section_id" in columns:
            # SQLite doesn't support DROP COLUMN directly, so we need to recreate
            # But for simplicity, we'll just note this limitation
            db.session.execute(
                sa.text("ALTER TABLE report_config DROP COLUMN section_id")
            )
            db.session.commit()
            print("✓ Removed section_id column from report_config table")


if __name__ == "__main__":
    print("Running migration: Add section_id to report_config")
    upgrade()
    print("Migration completed successfully!")
