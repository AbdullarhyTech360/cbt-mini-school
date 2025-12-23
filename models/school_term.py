from . import db
from services.generate_uuid import generate_uuid
from datetime import datetime


class SchoolTerm(db.Model):
    __tablename__ = "school_term"

    term_id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    term_name = db.Column(
        db.String(50), nullable=False
    )  # e.g., "First Term", "Second Term"
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    academic_session = db.Column(db.String(20), nullable=False)  # e.g., "2024-2025"

    # Foreign Keys
    school_id = db.Column(
        db.String(36), db.ForeignKey("school.school_id"), nullable=False
    )

    # Status
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_current = db.Column(db.Boolean, nullable=False, default=False)

    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    school = db.relationship("School", backref="terms")

    def to_dict(self):
        """Convert SchoolTerm object to a serializable dictionary."""
        return {
            "term_id": self.term_id,
            "term_name": self.term_name,
            "start_date": self.start_date.strftime("%Y-%m-%d"),
            "end_date": self.end_date.strftime("%Y-%m-%d"),
            "academic_session": self.academic_session,
            "is_active": self.is_active,
            "is_current": self.is_current,
            "school_id": self.school_id,
        }
    def __repr__(self):
        return f"<SchoolTerm {self.term_name} - {self.academic_session}>"
