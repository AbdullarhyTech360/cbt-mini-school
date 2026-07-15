from . import db
from services.generate_uuid import generate_uuid
from datetime import datetime


class StudentPromotion(db.Model):
    """Individual student promotion outcome within a batch."""

    __tablename__ = "student_promotion"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)

    # Foreign Keys
    batch_id = db.Column(
        db.String(36), db.ForeignKey("promotion_batch.id", ondelete="CASCADE"),
        nullable=False,
    )
    student_id = db.Column(
        db.String(36), db.ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    rule_id = db.Column(
        db.String(36), db.ForeignKey("promotion_rule.id"), nullable=True
    )  # NULL if manual

    # Source
    source_class_id = db.Column(
        db.String(36), db.ForeignKey("class_room.class_room_id"), nullable=False
    )
    source_session = db.Column(db.String(20), nullable=False)

    # Destination
    dest_class_id = db.Column(
        db.String(36), db.ForeignKey("class_room.class_room_id"), nullable=True
    )  # NULL if withdrawn
    dest_session = db.Column(db.String(20), nullable=False)

    # Result
    action = db.Column(
        db.String(20), nullable=False
    )  # promoted, repeated, withdrawn, manual
    average_score = db.Column(db.Float, nullable=True)
    meets_criteria = db.Column(db.Boolean, nullable=True)

    # Override
    is_override = db.Column(db.Boolean, nullable=False, default=False)
    override_reason = db.Column(db.Text, nullable=True)

    # Metadata
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    batch = db.relationship("PromotionBatch", backref="student_promotions")
    student = db.relationship("User", foreign_keys=[student_id], backref="promotions")
    source_class = db.relationship("ClassRoom", foreign_keys=[source_class_id])
    dest_class = db.relationship("ClassRoom", foreign_keys=[dest_class_id])
    rule = db.relationship("PromotionRule", foreign_keys=[rule_id])

    def to_dict(self):
        return {
            "id": self.id,
            "batch_id": self.batch_id,
            "student_id": self.student_id,
            "student_name": self.student.full_name() if self.student else None,
            "admission_number": self.student.student.admission_number if self.student and self.student.student else None,
            "rule_id": self.rule_id,
            "rule_name": self.rule.name if self.rule else None,
            "source_class_id": self.source_class_id,
            "source_class_name": self.source_class.class_room_name if self.source_class else None,
            "source_session": self.source_session,
            "dest_class_id": self.dest_class_id,
            "dest_class_name": self.dest_class.class_room_name if self.dest_class else None,
            "dest_session": self.dest_session,
            "action": self.action,
            "average_score": self.average_score,
            "meets_criteria": self.meets_criteria,
            "is_override": self.is_override,
            "override_reason": self.override_reason,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<StudentPromotion {self.student_id}: {self.action}>"
