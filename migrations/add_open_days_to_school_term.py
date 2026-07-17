"""Migration to add open_days column to school_term table"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import db
from app import app

def upgrade():
    """Add open_days column and backfill existing terms"""
    with app.app_context():
        try:
            db.session.execute(
                db.text("ALTER TABLE school_term ADD COLUMN open_days INTEGER")
            )
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                pass
            else:
                raise e

        # Backfill: calculate weekdays between start_date and end_date for terms with NULL open_days
        from datetime import timedelta
        from models.school_term import SchoolTerm
        terms_to_backfill = SchoolTerm.query.filter(SchoolTerm.open_days.is_(None)).all()
        for term in terms_to_backfill:
            if term.start_date and term.end_date:
                days = 0
                current = term.start_date
                while current <= term.end_date:
                    if current.weekday() < 5:
                        days += 1
                    current += timedelta(days=1)
                term.open_days = days
        db.session.commit()
        return True

def downgrade():
    """Remove open_days column from school_term table (SQLite limitation)"""
    with app.app_context():
        return True

if __name__ == "__main__":
    success = upgrade()
