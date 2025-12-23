from . import db
from services.generate_uuid import generate_uuid
from datetime import datetime

class Subject(db.Model):
    __tablename__ = "subject"

    subject_id: str = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    subject_name: str = db.Column(db.String(100), nullable=False)
    subject_code = db.Column(db.String(20), nullable=True, unique=True)
    description: str = db.Column(db.Text, nullable=True)
    grade: str = db.Column(db.String(20), nullable=True)
    academic_year: str = db.Column(db.String(20), nullable=True)
    academic_term = db.Column(db.String(20), nullable=True)
    icon_name = db.Column(db.String(20), nullable=False, default="menu_book")
    subject_category = db.Column(db.String(20), nullable=False, default="general")
    category_colors: str = db.Column(db.String(200), nullable=False, default="general")

    # Foreign Keys
    subject_head_id = db.Column(
        db.String(36), db.ForeignKey("user.id"), nullable=True
    )  # Primary teacher for this subject

    subject_section_id = db.Column(
        db.String(36), db.ForeignKey("section.section_id"), nullable=True
    )  # Subject link to section (primary or secondary)

    # Status and tracking
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    credit_hours = db.Column(db.Integer, nullable=True, default=3)

    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    subject_head = db.relationship(
        "User", foreign_keys=[subject_head_id], backref="subject_heads"
    )
    classes = db.relationship(
        "ClassRoom",
        secondary="class_subject",
        back_populates="subjects",
        lazy="select"
    )

    def __repr__(self):
        return f"<Subject {self.subject_code} - {self.subject_name}>"
    
    def to_dict(self):
        return {
            "subject_id": self.subject_id,
            "subject_name": self.subject_name,
            "subject_code": self.subject_code,
            "description": self.description,
            "grade": self.grade,
            "academic_year": self.academic_year,
            "academic_term": self.academic_term,
            "icon_name": self.icon_name,
            "subject_category": self.subject_category,
            "category_colors": self.category_colors,
            "subject_head_id": self.subject_head_id,
            "subject_section_id": self.subject_section_id,
            "is_active": self.is_active,
            "credit_hours": self.credit_hours,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
