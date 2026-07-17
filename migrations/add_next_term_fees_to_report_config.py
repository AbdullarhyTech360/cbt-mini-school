"""Migration to add next_term_fees column to report_config table"""
from models import db


def upgrade():
    """Add next_term_fees column to report_config"""
    try:
        db.session.execute(
            db.text("ALTER TABLE report_config ADD COLUMN next_term_fees VARCHAR(300)")
        )
        db.session.commit()
        print("Added next_term_fees column to report_config")
    except Exception:
        print("next_term_fees column already exists or error occurred")


def downgrade():
    """Remove next_term_fees column from report_config"""
    try:
        db.session.execute(
            db.text("ALTER TABLE report_config DROP COLUMN next_term_fees")
        )
        db.session.commit()
        print("Removed next_term_fees column from report_config")
    except Exception:
        print("Could not remove next_term_fees column")


if __name__ == "__main__":
    print("Running migration: Add next_term_fees to report_config")
    upgrade()
    print("Migration completed!")
