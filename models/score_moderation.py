from . import db
from services.generate_uuid import generate_uuid
from datetime import datetime


class ScoreModeration(db.Model):
    """Model for tracking score moderation requests and approvals"""

    __tablename__ = "score_moderation"

    moderation_id = db.Column(db.String(36), primary_key=True, default=generate_uuid)

    # Request details
    teacher_id = db.Column(db.String(36), db.ForeignKey("user.id"), nullable=False)
    subject_id = db.Column(db.String(36), db.ForeignKey("subject.subject_id"), nullable=False)
    class_room_id = db.Column(db.String(36), db.ForeignKey("class_room.class_room_id"), nullable=False)
    term_id = db.Column(db.String(36), db.ForeignKey("school_term.term_id"), nullable=False)
    
    # Moderation parameters
    assessment_code = db.Column(db.String(50), nullable=False)
    assessment_name = db.Column(db.String(200), nullable=False)
    bonus_value = db.Column(db.Float, nullable=False)
    apply_to = db.Column(db.String(20), nullable=False)  # 'all', 'range', 'username'
    threshold = db.Column(db.Float, nullable=True)  # For 'range' option
    target_student_id = db.Column(db.String(36), nullable=True)  # For 'username' option
    include_cbt = db.Column(db.Boolean, nullable=False, default=False)
    
    # Justification
    reason = db.Column(db.Text, nullable=False)
    
    # Approval tracking
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending, approved, rejected
    approved_by = db.Column(db.String(36), db.ForeignKey("user.id"), nullable=True)
    approval_date = db.Column(db.DateTime, nullable=True)
    approval_notes = db.Column(db.Text, nullable=True)
    
    # Metadata
    affected_count = db.Column(db.Integer, nullable=True)  # Number of students affected
    academic_session = db.Column(db.String(20), nullable=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    teacher = db.relationship("User", foreign_keys=[teacher_id], backref="moderation_requests")
    approver = db.relationship("User", foreign_keys=[approved_by], backref="approved_moderations")
    subject = db.relationship("Subject", backref="score_moderations")
    class_room = db.relationship("ClassRoom", backref="score_moderations")
    term = db.relationship("SchoolTerm", backref="score_moderations")

    def __repr__(self):
        return f"<ScoreModeration {self.moderation_id} - {self.status}>"

    def to_dict(self):
        """Convert moderation object to dictionary"""
        return {
            "moderation_id": self.moderation_id,
            "teacher_id": self.teacher_id,
            "subject_id": self.subject_id,
            "class_room_id": self.class_room_id,
            "term_id": self.term_id,
            "assessment_code": self.assessment_code,
            "assessment_name": self.assessment_name,
            "bonus_value": self.bonus_value,
            "apply_to": self.apply_to,
            "threshold": self.threshold,
            "target_student_id": self.target_student_id,
            "include_cbt": self.include_cbt,
            "reason": self.reason,
            "status": self.status,
            "approved_by": self.approved_by,
            "approval_date": self.approval_date.isoformat() if self.approval_date else None,
            "approval_notes": self.approval_notes,
            "affected_count": self.affected_count,
            "academic_session": self.academic_session,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
