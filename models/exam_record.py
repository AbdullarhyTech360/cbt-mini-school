from . import db
from services.generate_uuid import generate_uuid
from datetime import datetime
import json


class ExamRecord(db.Model):
    """Model to store detailed exam records including student answers and exam metadata"""
    __tablename__ = "exam_records"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)

    # Foreign Keys
    student_id = db.Column(db.String(36), db.ForeignKey(
        "user.id", ondelete="CASCADE"), nullable=False)
    exam_id = db.Column(db.String(36), db.ForeignKey(
        "exams.id", ondelete="CASCADE"), nullable=False)
    subject_id = db.Column(db.String(36), db.ForeignKey(
        "subject.subject_id"), nullable=False)
    class_room_id = db.Column(db.String(36), db.ForeignKey(
        "class_room.class_room_id"), nullable=False)
    school_term_id = db.Column(db.String(36), db.ForeignKey(
        "school_term.term_id"), nullable=False)

    # Exam metadata
    exam_type = db.Column(db.String(80), nullable=False)  # CA, Term Exam, etc.
    academic_year = db.Column(
        db.String(20), nullable=False)  # 2024/2025 format

    # Student answers - stored as JSON
    # Format: { "question_id": "option_id" or "answer_text" }
    answers = db.Column(db.Text, nullable=False)  # JSON string

    # Score information
    correct_answers = db.Column(db.Integer, nullable=False)
    total_questions = db.Column(db.Integer, nullable=False)
    score_percentage = db.Column(db.Float, nullable=False)
    raw_score = db.Column(db.Float, nullable=False)
    max_score = db.Column(db.Float, nullable=False)
    letter_grade = db.Column(db.String(1), nullable=False)

    # Timestamps
    started_at = db.Column(db.DateTime, nullable=False,
                           default=datetime.utcnow)
    submitted_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, nullable=False,
                           default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False,
                           default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    student = db.relationship("User", backref=db.backref(
        "exam_records", cascade="all, delete-orphan", lazy=True))
    exam = db.relationship("Exam", backref=db.backref(
        "records", cascade="all, delete-orphan", lazy=True))
    subject = db.relationship(
        "Subject", backref=db.backref("exam_records", lazy=True))
    class_room = db.relationship(
        "ClassRoom", backref=db.backref("exam_records", lazy=True))
    school_term = db.relationship(
        "SchoolTerm", backref=db.backref("exam_records", lazy=True))

    def set_answers(self, answers_dict):
        """Store answers as JSON string"""
        self.answers = json.dumps(answers_dict)

    def get_answers(self):
        """Retrieve answers from JSON string"""
        return json.loads(self.answers)

    def to_dict(self):
        """Convert ExamRecord object to a serializable dictionary."""
        return {
            "id": self.id,
            "student_id": self.student_id,
            "exam_id": self.exam_id,
            "subject_id": self.subject_id,
            "class_room_id": self.class_room_id,
            "school_term_id": self.school_term_id,
            "exam_type": self.exam_type,
            "academic_year": self.academic_year,
            "answers": self.get_answers(),
            "correct_answers": self.correct_answers,
            "total_questions": self.total_questions,
            "score_percentage": self.score_percentage,
            "raw_score": self.raw_score,
            "max_score": self.max_score,
            "letter_grade": self.letter_grade,
            "started_at": self.started_at.strftime("%Y-%m-%d %H:%M:%S"),
            "submitted_at": self.submitted_at.strftime("%Y-%m-%d %H:%M:%S"),
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": self.updated_at.strftime("%Y-%m-%d %H:%M:%S"),
        }

    def __repr__(self):
        return f"<ExamRecord {self.student_id} - {self.exam_id} ({self.letter_grade})>"
