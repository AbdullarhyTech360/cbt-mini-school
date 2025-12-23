from . import db
from services.generate_uuid import generate_uuid
from datetime import datetime


class School(db.Model):
    __tablename__ = "school"

    school_id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    school_name = db.Column(db.String(200), nullable=False)
    school_code = db.Column(db.String(20), unique=True, nullable=True)

    # Contact Information
    website = db.Column(db.String(200), nullable=True)
    address = db.Column(db.Text, nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(120), nullable=False)

    # Additional Information
    current_session = db.Column(db.String(20), nullable=True)
    current_term = db.Column(db.String(20), nullable=True, default="First Term")
    motto = db.Column(db.String(200), nullable=True)
    logo = db.Column(db.String(200), nullable=True)  # Path to logo image
    established_date = db.Column(db.Date, nullable=True)
    principal_name = db.Column(db.String(200), nullable=True)

    # Status
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def __repr__(self):
        return f"<School {self.school_name}>"
