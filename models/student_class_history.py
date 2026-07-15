from . import db
from services.generate_uuid import generate_uuid
from datetime import datetime


class StudentClassHistory(db.Model):
    """Tracks every class assignment per session for audit/transcript purposes."""

    __tablename__ = "student_class_history"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)

    # Foreign Keys
    student_id = db.Column(
        db.String(36), db.ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    class_room_id = db.Column(
        db.String(36), db.ForeignKey("class_room.class_room_id"), nullable=False
    )
    term_id = db.Column(
        db.String(36), db.ForeignKey("school_term.term_id"), nullable=True
    )
    promoted_by = db.Column(
        db.String(36), db.ForeignKey("user.id"), nullable=True
    )

    # Session tracking
    academic_session = db.Column(db.String(20), nullable=False)  # e.g., "2024-2025"

    # Status
    status = db.Column(
        db.String(20), nullable=False, default="enrolled"
    )  # enrolled, promoted, repeated, withdrawn, graduated

    # Metadata
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    student = db.relationship("User", foreign_keys=[student_id], backref="class_history")
    class_room = db.relationship("ClassRoom", foreign_keys=[class_room_id], backref="history_records")
    term = db.relationship("SchoolTerm", foreign_keys=[term_id])
    promoter = db.relationship("User", foreign_keys=[promoted_by])

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "student_name": self.student.full_name() if self.student else None,
            "class_room_id": self.class_room_id,
            "class_room_name": self.class_room.class_room_name if self.class_room else None,
            "term_id": self.term_id,
            "academic_session": self.academic_session,
            "status": self.status,
            "notes": self.notes,
            "promoted_by": self.promoted_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<StudentClassHistory {self.student_id} -> {self.class_room_id} ({self.academic_session})>"
