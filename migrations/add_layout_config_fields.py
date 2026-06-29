"""Migration to add layout_config and custom_data_fields columns to report_config table"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import db
from app import app

def upgrade():
    """Add layout_config and custom_data_fields columns to report_config table"""
    with app.app_context():
        try:
            # Add layout_config column
            try:
                db.session.execute(
                    db.text("ALTER TABLE report_config ADD COLUMN layout_config TEXT")
                )
                db.session.commit()
                print("✓ Added layout_config column to report_config table")
            except Exception as e:
                db.session.rollback()
                if "duplicate" in str(e).lower() or "already exists" in str(e).lower():
                    print("✓ layout_config column already exists")
                else:
                    raise e

            # Add custom_data_fields column
            try:
                db.session.execute(
                    db.text("ALTER TABLE report_config ADD COLUMN custom_data_fields TEXT")
                )
                db.session.commit()
                print("✓ Added custom_data_fields column to report_config table")
            except Exception as e:
                db.session.rollback()
                if "duplicate" in str(e).lower() or "already exists" in str(e).lower():
                    print("✓ custom_data_fields column already exists")
                else:
                    raise e

            print("✓ Migration completed successfully!")
            return True
        except Exception as e:
            db.session.rollback()
            if "duplicate column name" in str(e).lower():
                print("✓ Columns already exist")
                return True
            else:
                print(f"✗ Failed to add columns: {str(e)}")
                return False

def downgrade():
    """Remove columns from report_config table (SQLite limitation: not supported)"""
    with app.app_context():
        print("⚠ Column removal not supported in SQLite. Table must be recreated to remove columns.")
        return True

if __name__ == "__main__":
    print("Running migration: Add layout_config and custom_data_fields columns to report_config table")
    success = upgrade()
    if success:
        print("Migration completed successfully!")
    else:
        print("Migration failed!")
