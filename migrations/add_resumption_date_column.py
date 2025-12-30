"""Migration to add resumption_date column to report_config table"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import db
from app import app

def upgrade():
    """Add resumption_date column to report_config table"""
    with app.app_context():
        try:
            # Check if column already exists by trying to add it
            try:
                db.session.execute(
                    db.text("ALTER TABLE report_config ADD COLUMN resumption_date DATE")
                )
                db.session.commit()
                # print("✓ Added resumption_date column to report_config table")
            except Exception as e:
                db.session.rollback()
                # Column might already exist
                if "duplicate" in str(e).lower() or "already exists" in str(e).lower():
                    # print("✓ resumption_date column already exists")
                else:
                    raise e
            # print("✓ Added resumption_date column to report_config table")
            return True
        except Exception as e:
            db.session.rollback()
            # Column might already exist
            if "duplicate column name" in str(e).lower():
                # print("✓ resumption_date column already exists")
                return True
            else:
                # print(f"✗ Failed to add resumption_date column: {str(e)}")
                return False

def downgrade():
    """Remove resumption_date column from report_config table (SQLite limitation: not supported)"""
    with app.app_context():
        # print("⚠ Column removal not supported in SQLite. Table must be recreated to remove column.")
        return True

if __name__ == "__main__":
    # print("Running migration: Add resumption_date column to report_config table")
    success = upgrade()
    if success:
        # print("Migration completed successfully!")
    else:
        # print("Migration failed!")