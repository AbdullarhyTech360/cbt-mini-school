"""Migration to add report_config table for flexible report generation"""
from models import db
from app import app


def upgrade():
    """Add report_config table"""
    with app.app_context():
        # Create the table using SQLAlchemy
        db.create_all()
        # print("✓ Report config table created successfully")


def downgrade():
    """Remove report_config table"""
    with app.app_context():
        db.session.execute(db.text("DROP TABLE IF EXISTS report_config"))
        db.session.commit()
        # print("✓ Report config table removed")


if __name__ == "__main__":
    # print("Running migration: Add report_config table")
    upgrade()
    # print("Migration completed successfully!")
