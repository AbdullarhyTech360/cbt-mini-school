from . import db
from services.generate_uuid import generate_uuid
from datetime import datetime


class AssessmentType(db.Model):
    """Model for configurable assessment types (CA, Exam, Quiz, etc.)"""

    __tablename__ = "assessment_type"

    assessment_type_id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    
    # Assessment details
    name = db.Column(db.String(100), nullable=False)  # e.g., "First CA", "Second CA", "Exam"
    code = db.Column(db.String(50), nullable=False)  # e.g., "first_ca", "second_ca", "exam"
    max_score = db.Column(db.Float, nullable=False, default=20.0)  # Maximum score for this assessment
    order = db.Column(db.Integer, nullable=False, default=1)  # Display order
    
    # Configuration
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_cbt_enabled = db.Column(db.Boolean, nullable=False, default=False)  # Can be taken as CBT
    description = db.Column(db.Text, nullable=True)
    
    # School association
    school_id = db.Column(db.String(36), db.ForeignKey("school.school_id"), nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    # Relationships
    school = db.relationship("School", backref="assessment_types")

    def __repr__(self):
        return f"<AssessmentType {self.name} - {self.max_score} marks>"

    def to_dict(self):
        """Convert assessment type to dictionary"""
        return {
            "assessment_type_id": self.assessment_type_id,
            "name": self.name,
            "code": self.code,
            "max_score": self.max_score,
            "order": self.order,
            "is_active": self.is_active,
            "is_cbt_enabled": self.is_cbt_enabled,
            "description": self.description,
            "school_id": self.school_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
