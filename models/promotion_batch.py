from . import db
from services.generate_uuid import generate_uuid
from datetime import datetime


class PromotionBatch(db.Model):
    """Tracks each promotion event (e.g., 'End of 2024-2025 session promotion')."""

    __tablename__ = "promotion_batch"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)

    # Identity
    name = db.Column(db.String(100), nullable=False)  # e.g., "2024-2025 End of Session"
    description = db.Column(db.Text, nullable=True)

    # Session scope
    source_session = db.Column(db.String(20), nullable=False)  # "2024-2025"
    dest_session = db.Column(db.String(20), nullable=False)  # "2025-2026"

    # School scoping
    school_id = db.Column(
        db.String(36), db.ForeignKey("school.school_id"), nullable=False
    )

    # Status
    status = db.Column(
        db.String(20), nullable=False, default="draft"
    )  # draft, completed, reversed

    # Summary stats
    total_students = db.Column(db.Integer, nullable=False, default=0)
    promoted_count = db.Column(db.Integer, nullable=False, default=0)
    repeated_count = db.Column(db.Integer, nullable=False, default=0)
    withdrawn_count = db.Column(db.Integer, nullable=False, default=0)

    # Execution tracking
    executed_by = db.Column(
        db.String(36), db.ForeignKey("user.id"), nullable=True
    )
    executed_at = db.Column(db.DateTime, nullable=True)
    reversed_at = db.Column(db.DateTime, nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    school = db.relationship("School", backref="promotion_batches")
    executor = db.relationship("User", foreign_keys=[executed_by])

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "source_session": self.source_session,
            "dest_session": self.dest_session,
            "school_id": self.school_id,
            "status": self.status,
            "total_students": self.total_students,
            "promoted_count": self.promoted_count,
            "repeated_count": self.repeated_count,
            "withdrawn_count": self.withdrawn_count,
            "executed_by": self.executed_by,
            "executor_name": self.executor.full_name() if self.executor else None,
            "executed_at": self.executed_at.isoformat() if self.executed_at else None,
            "reversed_at": self.reversed_at.isoformat() if self.reversed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<PromotionBatch {self.name} ({self.status})>"
