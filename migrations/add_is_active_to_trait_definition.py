"""Migration to add is_active column to trait_definition table"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import db
from app import app

def upgrade():
    """Add is_active column to trait_definition table"""
    with app.app_context():
        try:
            db.session.execute(
                db.text("ALTER TABLE trait_definition ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1")
            )
            db.session.commit()
            print("✓ Added is_active column to trait_definition table")
            return True
        except Exception as e:
            db.session.rollback()
            if "duplicate" in str(e).lower() or "already exists" in str(e).lower():
                print("✓ is_active column already exists")
                return True
            else:
                print(f"✗ Failed to add column: {str(e)}")
                return False

def downgrade():
    """Remove is_active column from trait_definition table (SQLite limitation: not supported)"""
    with app.app_context():
        print("⚠ Column removal not supported in SQLite. Table must be recreated to remove columns.")
        return True

if __name__ == "__main__":
    print("Running migration: Add is_active column to trait_definition table")
    success = upgrade()
    if success:
        print("Migration completed successfully!")
    else:
        print("Migration failed!")
