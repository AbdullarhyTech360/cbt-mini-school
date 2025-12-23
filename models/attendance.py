from . import db
from services.generate_uuid import generate_uuid
from datetime import datetime


class Attendance(db.Model):
    """Model for tracking student attendance"""

    __tablename__ = "attendance"

    attendance_id = db.Column(db.String(36), primary_key=True, default=generate_uuid)

    # Foreign Keys
    student_id = db.Column(
        db.String(36), db.ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )  # References User with role='student'
    class_room_id = db.Column(
        db.String(36), db.ForeignKey("class_room.class_room_id"), nullable=False
    )
    marked_by_id = db.Column(
        db.String(36), db.ForeignKey("user.id"), nullable=True
    )  # Teacher who marked attendance

    # Attendance Information
    attendance_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    status = db.Column(
        db.String(20), nullable=False, default="present"
    )  # present, absent, late, excused
    remarks = db.Column(db.Text, nullable=True)

    # Academic session tracking
    term_id = db.Column(
        db.String(36), db.ForeignKey("school_term.term_id"), nullable=True
    )
    academic_session = db.Column(db.String(20), nullable=True)  # e.g., "2024-2025"

    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    student = db.relationship(
        "User", foreign_keys=[student_id], backref=db.backref("attendance_records", cascade="all, delete-orphan")
    )
    class_room = db.relationship("ClassRoom", backref="attendance_records")
    marked_by = db.relationship(
        "User", foreign_keys=[marked_by_id], backref="marked_attendances"
    )
    term = db.relationship("SchoolTerm", backref="attendances")

    def __repr__(self):
        return (
            f"<Attendance {self.student_id} - {self.attendance_date} - {self.status}>"
        )

    def to_dict(self):
        """Convert attendance object to dictionary"""
        return {
            "attendance_id": self.attendance_id,
            "student_id": self.student_id,
            "class_room_id": self.class_room_id,
            "attendance_date": self.attendance_date.isoformat()
            if self.attendance_date
            else None,
            "status": self.status,
            "remarks": self.remarks,
            "term_id": self.term_id,
            "academic_session": self.academic_session,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
