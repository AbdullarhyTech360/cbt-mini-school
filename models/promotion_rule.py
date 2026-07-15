from . import db
from services.generate_uuid import generate_uuid
from datetime import datetime


class PromotionRule(db.Model):
    """Admin-defined promotion criteria: source section/level -> dest section/level with min average."""

    __tablename__ = "promotion_rule"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)

    # Identity
    name = db.Column(db.String(100), nullable=False)  # e.g., "Primary 1 -> Primary 2"
    description = db.Column(db.Text, nullable=True)

    # Source: which section/level this rule applies FROM
    source_section_id = db.Column(
        db.String(36), db.ForeignKey("section.section_id"), nullable=False
    )
    source_level = db.Column(db.Integer, nullable=False)  # e.g., 1

    # Destination: which section/level this rule promotes TO
    dest_section_id = db.Column(
        db.String(36), db.ForeignKey("section.section_id"), nullable=False
    )
    dest_level = db.Column(db.Integer, nullable=False)  # e.g., 2

    # Criteria
    min_average = db.Column(
        db.Float, nullable=True
    )  # minimum overall % to auto-promote. NULL = all students pass
    fail_action = db.Column(
        db.String(20), nullable=False, default="repeat"
    )  # repeat, withdraw, manual

    # School scoping
    school_id = db.Column(
        db.String(36), db.ForeignKey("school.school_id"), nullable=False
    )

    # Status
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    school = db.relationship("School", backref="promotion_rules")
    source_section = db.relationship("Section", foreign_keys=[source_section_id])
    dest_section = db.relationship("Section", foreign_keys=[dest_section_id])

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "source_section_id": self.source_section_id,
            "source_section_name": self.source_section.name if self.source_section else None,
            "source_level": self.source_level,
            "dest_section_id": self.dest_section_id,
            "dest_section_name": self.dest_section.name if self.dest_section else None,
            "dest_level": self.dest_level,
            "min_average": self.min_average,
            "fail_action": self.fail_action,
            "school_id": self.school_id,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<PromotionRule {self.name}: L{self.source_level} -> L{self.dest_level}>"
