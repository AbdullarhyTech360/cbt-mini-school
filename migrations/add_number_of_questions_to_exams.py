"""
Migration script to add number_of_questions column to exams table
Run this script to update the database schema
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import db


def upgrade():
    """Add number_of_questions column to exams table."""
    try:
        db.session.execute(db.text(
            "ALTER TABLE exams ADD COLUMN number_of_questions INTEGER"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()


if __name__ == "__main__":
    from flask import Flask

    BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///" + os.path.join(BASE_DIR, "instance", "users.db")
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)

    with app.app_context():
        upgrade()
