"""On-The-Go Test models for ad-hoc assessments outside normal school schedule."""

import json
from datetime import datetime

from . import db
from services.generate_uuid import generate_uuid


class OnTheGoTest(db.Model):
    """Ad-hoc test not tied to a term, academic session, or scheduled date."""
    __tablename__ = "on_the_go_tests"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    instructions = db.Column(db.Text, nullable=True)

    # Core test parameters
    subject_id = db.Column(db.String(36), db.ForeignKey("subject.subject_id"), nullable=False)
    class_room_id = db.Column(db.String(36), db.ForeignKey("class_room.class_room_id"), nullable=True)
    duration = db.Column(db.Interval, nullable=False)
    max_score = db.Column(db.Float, nullable=False)
    number_of_questions = db.Column(db.Integer, nullable=True)

    # Feature flags
    calculator_enabled = db.Column(db.Boolean, nullable=False, default=False)
    show_feedback = db.Column(db.Boolean, nullable=False, default=True)
    save_after_completion = db.Column(db.Boolean, nullable=False, default=True)

    # Access control
    access_code = db.Column(db.String(10), nullable=True)

    # Lifecycle
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_finished = db.Column(db.Boolean, nullable=False, default=False)
    started_at = db.Column(db.DateTime, nullable=True)
    ended_at = db.Column(db.DateTime, nullable=True)

    # Who created it
    created_by_id = db.Column(db.String(36), db.ForeignKey("user.id"), nullable=False)

    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    subject = db.relationship("Subject")
    class_room = db.relationship("ClassRoom")
    created_by = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "instructions": self.instructions,
            "subject_id": self.subject_id,
            "subject_name": self.subject.subject_name if self.subject else None,
            "class_room_id": self.class_room_id,
            "class_room_name": self.class_room.class_room_name if self.class_room else None,
            "duration": self.duration.seconds if self.duration else 0,
            "max_score": self.max_score,
            "number_of_questions": self.number_of_questions,
            "calculator_enabled": self.calculator_enabled,
            "show_feedback": self.show_feedback,
            "save_after_completion": self.save_after_completion,
            "access_code_required": bool(self.access_code),
            "is_active": self.is_active,
            "is_finished": self.is_finished,
            "started_at": self.started_at.strftime("%Y-%m-%d %H:%M:%S") if self.started_at else None,
            "ended_at": self.ended_at.strftime("%Y-%m-%d %H:%M:%S") if self.ended_at else None,
            "created_by_id": self.created_by_id,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": self.updated_at.strftime("%Y-%m-%d %H:%M:%S"),
        }

    def __repr__(self):
        return f"<OnTheGoTest {self.title}>"


class OnTheGoResult(db.Model):
    """Result for a taken On-The-Go test. Created only when save_after_completion=True."""
    __tablename__ = "on_the_go_results"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)

    on_the_go_test_id = db.Column(
        db.String(36), db.ForeignKey("on_the_go_tests.id", ondelete="CASCADE"), nullable=False
    )
    student_id = db.Column(
        db.String(36), db.ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )

    # Answers JSON — same format as ExamRecord: { question_id: option_id | text }
    answers = db.Column(db.Text, nullable=False)

    # Score information
    correct_answers = db.Column(db.Integer, nullable=False)
    total_questions = db.Column(db.Integer, nullable=False)
    score_percentage = db.Column(db.Float, nullable=False)
    raw_score = db.Column(db.Float, nullable=False)
    max_score = db.Column(db.Float, nullable=False)
    letter_grade = db.Column(db.String(1), nullable=False)

    # Timestamps
    started_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    submitted_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    test = db.relationship("OnTheGoTest", backref=db.backref("results", cascade="all, delete-orphan", lazy=True))
    student = db.relationship("User")

    def set_answers(self, answers_dict):
        self.answers = json.dumps(answers_dict)

    def get_answers(self):
        try:
            return json.loads(self.answers) if self.answers else {}
        except (json.JSONDecodeError, TypeError):
            return {}

    def to_dict(self):
        return {
            "id": self.id,
            "on_the_go_test_id": self.on_the_go_test_id,
            "student_id": self.student_id,
            "student_name": self.student.full_name() if self.student else None,
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
        return f"<OnTheGoResult {self.student_id} - {self.on_the_go_test_id} ({self.letter_grade})>"


# Association table for completion tracking (prevents retakes)
student_on_the_go_test = db.Table(
    "student_on_the_go_test",
    db.Column("student_id", db.String(36), db.ForeignKey("user.id"), primary_key=True),
    db.Column("on_the_go_test_id", db.String(36), db.ForeignKey("on_the_go_tests.id"), primary_key=True),
    db.Column("score", db.Float, nullable=True),
    db.Column("completed_at", db.DateTime, nullable=True),
    db.Column("time_taken", db.Integer, nullable=True),  # seconds
)


class OnTheGoTestSession(db.Model):
    """Track ongoing On-The-Go test sessions for progress save/restore."""
    __tablename__ = "on_the_go_test_sessions"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)

    student_id = db.Column(db.String(36), db.ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    on_the_go_test_id = db.Column(
        db.String(36), db.ForeignKey("on_the_go_tests.id", ondelete="CASCADE"), nullable=False
    )

    current_question_index = db.Column(db.Integer, nullable=False, default=0)
    time_remaining = db.Column(db.Integer, nullable=False)  # seconds
    answers = db.Column(db.Text, nullable=False, default='{}')
    question_order = db.Column(db.Text, nullable=True)

    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_completed = db.Column(db.Boolean, nullable=False, default=False)

    started_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    last_activity = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = db.relationship("User")
    test = db.relationship("OnTheGoTest")

    def set_answers(self, d):
        self.answers = json.dumps(d)

    def get_answers(self):
        try:
            return json.loads(self.answers) if self.answers else {}
        except (json.JSONDecodeError, TypeError):
            return {}

    def set_question_order(self, ids):
        self.question_order = json.dumps(ids)

    def get_question_order(self):
        try:
            return json.loads(self.question_order) if self.question_order else []
        except (json.JSONDecodeError, TypeError):
            return []

    def __repr__(self):
        return f"<OnTheGoTestSession {self.student_id} - {self.on_the_go_test_id}>"
