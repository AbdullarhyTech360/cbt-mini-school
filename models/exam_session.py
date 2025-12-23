from . import db
from services.generate_uuid import generate_uuid
from datetime import datetime
import json


class ExamSession(db.Model):
    """Model to track ongoing exam sessions and save student progress"""
    __tablename__ = "exam_sessions"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)

    # Foreign Keys
    student_id = db.Column(db.String(36), db.ForeignKey(
        "user.id", ondelete="CASCADE"), nullable=False)
    exam_id = db.Column(db.String(36), db.ForeignKey(
        "exams.id", ondelete="CASCADE"), nullable=False)

    # Session state
    current_question_index = db.Column(db.Integer, nullable=False, default=0)
    time_remaining = db.Column(db.Integer, nullable=False)  # Seconds remaining

    # Student answers - stored as JSON
    # Format: { "question_id": "option_id" or "answer_text" }
    answers = db.Column(db.Text, nullable=False, default='{}')  # JSON string

    # Question order - stored as JSON array of question IDs
    # This ensures the student sees the same question order when resuming
    question_order = db.Column(db.Text, nullable=True)  # JSON array

    # Session status
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_completed = db.Column(db.Boolean, nullable=False, default=False)

    # Timestamps
    started_at = db.Column(db.DateTime, nullable=False,
                           default=datetime.utcnow)
    last_activity = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False,
                           default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False,
                           default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    student = db.relationship("User", backref=db.backref(
        "exam_sessions", cascade="all, delete-orphan", lazy=True))
    exam = db.relationship("Exam", backref=db.backref(
        "sessions", cascade="all, delete-orphan", lazy=True))

    def set_answers(self, answers_dict):
        """Store answers as JSON string"""
        self.answers = json.dumps(answers_dict)

    def get_answers(self):
        """Retrieve answers from JSON string"""
        try:
            return json.loads(self.answers) if self.answers else {}
        except:
            return {}

    def set_question_order(self, question_ids):
        """Store question order as JSON array"""
        self.question_order = json.dumps(question_ids)

    def get_question_order(self):
        """Retrieve question order from JSON array"""
        try:
            return json.loads(self.question_order) if self.question_order else []
        except:
            return []

    def to_dict(self):
        """Convert ExamSession object to a serializable dictionary."""
        return {
            "id": self.id,
            "student_id": self.student_id,
            "exam_id": self.exam_id,
            "current_question_index": self.current_question_index,
            "time_remaining": self.time_remaining,
            "answers": self.get_answers(),
            "question_order": self.get_question_order(),
            "is_active": self.is_active,
            "is_completed": self.is_completed,
            "started_at": self.started_at.strftime("%Y-%m-%d %H:%M:%S"),
            "last_activity": self.last_activity.strftime("%Y-%m-%d %H:%M:%S"),
            "completed_at": self.completed_at.strftime("%Y-%m-%d %H:%M:%S") if self.completed_at else None,
        }

    def __repr__(self):
        return f"<ExamSession {self.student_id} - {self.exam_id} ({'Active' if self.is_active else 'Inactive'})>"
