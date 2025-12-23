from datetime import datetime
from dis import hasarg
from . import db
from services.generate_uuid import generate_uuid


class Section(db.Model):
    __tablename__ = "section"

    section_id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    name = db.Column(db.String(50), nullable=False, unique=True)
    description = db.Column(db.Text)
    abbreviation = db.Column(db.String(10), nullable=False, unique=True)
    level = db.Column(db.Integer)  # e.g., 1 for Primary, 2 for Secondary
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    # Foreign Keys
    school_id = db.Column(
        db.String(36), db.ForeignKey("school.school_id"), nullable=True
    )

    # Relationships
    school = db.relationship("School", backref="sections")

    def get_classrooms_count(self):
        """Get the number of classrooms in this section."""
        return len(self.classes) if hasattr(self, "classes") else 0

    def get_active_classrooms(self):
        """Get all active classrooms in this section."""
        return [classroom for classroom in self.classes if classroom.is_active]

    def activate(self):
        """Activate the section."""
        self.is_active = True
        db.session.commit()

    def deactivate(self):
        """Deactivate the section."""
        self.is_active = False
        db.session.commit()

    def to_dict(self):
        """Convert section object to dictionary."""
        return {
            "section_id": self.section_id,
            "name": self.name,
            "description": self.description,
            "abbreviation": self.abbreviation,
            "level": self.level,
            "is_active": self.is_active,
            "school_id": self.school_id,
            "classrooms_count": self.get_classrooms_count(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<Section {self.name} ({self.abbreviation})>"
