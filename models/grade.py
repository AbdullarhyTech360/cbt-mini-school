from . import db
from services.generate_uuid import generate_uuid
from datetime import datetime


class Grade(db.Model):
    """Model for tracking student grades and results"""

    __tablename__ = "grade"

    grade_id = db.Column(db.String(36), primary_key=True, default=generate_uuid)

    # Foreign Keys
    student_id = db.Column(
        db.String(36), db.ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )  # References User with role='student'
    subject_id = db.Column(
        db.String(36), db.ForeignKey("subject.subject_id"), nullable=False
    )
    class_room_id = db.Column(
        db.String(36), db.ForeignKey("class_room.class_room_id"), nullable=False
    )
    teacher_id = db.Column(
        db.String(36), db.ForeignKey("user.id"), nullable=True
    )  # Teacher who graded
    term_id = db.Column(
        db.String(36), db.ForeignKey("school_term.term_id"), nullable=False
    )

    # Grade Information
    assessment_type = db.Column(
        db.String(50), nullable=False
    )  # test, exam, assignment, quiz, project, mid-term, final
    assessment_name = db.Column(db.String(200), nullable=True)  # Name of the assessment
    max_score = db.Column(db.Float, nullable=False, default=100.0)
    score = db.Column(db.Float, nullable=False)
    percentage = db.Column(db.Float, nullable=True)  # Calculated percentage
    grade_letter = db.Column(db.String(5), nullable=True)  # A, B, C, D, F
    remarks = db.Column(db.Text, nullable=True)

    # Academic session tracking
    academic_session = db.Column(db.String(20), nullable=False)  # e.g., "2024-2025"

    # Assessment date
    assessment_date = db.Column(db.Date, nullable=True, default=datetime.utcnow)

    # CBT tracking
    exam_record_id = db.Column(
        db.String(36), db.ForeignKey("exam_records.id"), nullable=True
    )  # Link to original CBT exam if applicable
    is_from_cbt = db.Column(
        db.Boolean, nullable=False, default=False
    )  # Whether this grade originated from CBT

    # Status
    is_published = db.Column(
        db.Boolean, nullable=False, default=False
    )  # Whether grade is visible to students

    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    student = db.relationship("User", foreign_keys=[student_id], backref=db.backref("grades", cascade="all, delete-orphan"))
    subject = db.relationship("Subject", backref="grades")
    class_room = db.relationship("ClassRoom", backref="grades")
    teacher = db.relationship(
        "User", foreign_keys=[teacher_id], backref="graded_assessments"
    )
    term = db.relationship("SchoolTerm", backref="grades")
    exam_record = db.relationship("ExamRecord", backref="grade", foreign_keys=[exam_record_id])

    def calculate_percentage(self):
        """Calculate percentage based on score and max_score"""
        if self.max_score and self.max_score > 0:
            self.percentage = (self.score / self.max_score) * 100
        else:
            self.percentage = 0.0

    def assign_grade_letter(self, grade_scale=None):
        """Assign letter grade based on percentage using configurable grading scale"""
        if self.percentage is None:
            self.calculate_percentage()
        
        # If a grade scale is provided, use it
        if grade_scale:
            grade_letter, remark = grade_scale.get_grade_for_percentage(self.percentage)
            self.grade_letter = grade_letter
            if not self.remarks:  # Only set remark if not already set
                self.remarks = remark
        else:
            # Fall back to default grading system
            if self.percentage >= 70:
                self.grade_letter = "A"
            elif self.percentage >= 59:
                self.grade_letter = "B"
            elif self.percentage >= 49:
                self.grade_letter = "C"
            elif self.percentage >= 40:
                self.grade_letter = "D"
            else:
                self.grade_letter = "F"

    def __repr__(self):
        return f"<Grade {self.student_id} - {self.subject_id} - {self.score}/{self.max_score}>"

    def to_dict(self):
        """Convert grade object to dictionary"""
        return {
            "grade_id": self.grade_id,
            "student_id": self.student_id,
            "subject_id": self.subject_id,
            "class_room_id": self.class_room_id,
            "teacher_id": self.teacher_id,
            "term_id": self.term_id,
            "assessment_type": self.assessment_type,
            "assessment_name": self.assessment_name,
            "max_score": self.max_score,
            "score": self.score,
            "percentage": self.percentage,
            "grade_letter": self.grade_letter,
            "remarks": self.remarks,
            "academic_session": self.academic_session,
            "assessment_date": self.assessment_date.isoformat()
            if self.assessment_date
            else None,
            "is_published": self.is_published,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
