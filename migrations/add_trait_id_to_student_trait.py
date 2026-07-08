"""Migration to add trait_id column to student_trait table"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import db
from app import app


def upgrade():
    """Add trait_id column to student_trait table"""
    with app.app_context():
        try:
            db.session.execute(
                db.text("ALTER TABLE student_trait ADD COLUMN trait_id VARCHAR(36) REFERENCES trait_definition(id)")
            )
            db.session.commit()
            print("✓ Added trait_id column to student_trait table")
            return True
        except Exception as e:
            db.session.rollback()
            if "duplicate" in str(e).lower() or "already exists" in str(e).lower():
                print("✓ trait_id column already exists")
                return True
            else:
                print(f"✗ Failed to add column: {str(e)}")
                return False


def downgrade():
    """Remove trait_id column from student_trait table (SQLite limitation: not supported)"""
    with app.app_context():
        print("⚠ Column removal not supported in SQLite. Table must be recreated to remove columns.")
        return True


if __name__ == "__main__":
    print("Running migration: Add trait_id column to student_trait table")
    success = upgrade()
    if success:
        print("Migration completed successfully!")
    else:
        print("Migration failed!")
