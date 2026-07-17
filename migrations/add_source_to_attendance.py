"""Migration to add source column to attendance table"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import db
from app import app

def upgrade():
    """Add source column to attendance table"""
    with app.app_context():
        try:
            db.session.execute(
                db.text("ALTER TABLE attendance ADD COLUMN source VARCHAR(10) NOT NULL DEFAULT 'daily'")
            )
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                return True
            else:
                raise e

def downgrade():
    """Remove source column from attendance table (SQLite limitation)"""
    with app.app_context():
        return True

if __name__ == "__main__":
    success = upgrade()
    if success:
        pass
    else:
        pass
