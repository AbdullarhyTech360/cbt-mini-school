from . import db
from services.generate_uuid import generate_uuid
from datetime import datetime


class Exam(db.Model):
    """Exam model"""
    __tablename__ = "exams"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    name = db.Column(
        db.String(80), nullable=False
    )  # For example: Mathematics 2025 First Term
    exam_type = db.Column(db.String(80), nullable=False)  # Either CA or Term Exam
    description = db.Column(db.String(255))
    instructions = db.Column(db.Text, nullable=True)  # Custom instructions for this exam
    have_taken_place = db.Column(db.Boolean, nullable=False, default=False)
    date = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow
    )  # Current UTC date and time
    time_started = db.Column(db.DateTime)  # The moment exam started
    time_ended = db.Column(db.DateTime)  # The moment exam ended
    duration = db.Column(
        db.Interval, nullable=False
    )  # Duration of the exam in hours and minutes, e.g., 1 hour 30 minutes

    # Foreign Keys - using consistent 36-character UUIDs
    invigilator_id = db.Column(db.String(36), db.ForeignKey("user.id"))
    subject_id = db.Column(
        db.String(36), db.ForeignKey("subject.subject_id"), nullable=False
    )
    school_term_id = db.Column(
        db.String(36), db.ForeignKey("school_term.term_id"), nullable=False
    )
    class_room_id = db.Column(
        db.String(36), db.ForeignKey("class_room.class_room_id"), nullable=False
    )  # Link to specific class

    # Timestamps - following the standard pattern
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Maximum score for the exam or assessment
    max_score = db.Column(db.Float, nullable=False)
    
    # Number of questions to display in the exam (if None, all questions will be shown)
    number_of_questions = db.Column(db.Integer, nullable=True)
    
    # Status fields
    is_active = db.Column(db.Boolean, nullable=False, default=True)  # Controls visibility to students
    is_finished = db.Column(db.Boolean, nullable=False, default=False)  # Marks exam as completed

    # Feature flags
    calculator_enabled = db.Column(db.Boolean, nullable=False, default=False)  # Allow calculator during exam
    is_on_the_go = db.Column(db.Boolean, nullable=False, default=False)  # On-The-Go test (ad-hoc, outside schedule)
    save_after_completion = db.Column(db.Boolean, nullable=False, default=True)  # Save On-The-Go results to DB
    show_feedback = db.Column(db.Boolean, nullable=False, default=True)  # Show detailed feedback after submission

    # Relationships
    subject = db.relationship("Subject", backref=db.backref("exams", lazy=True))
    school_term = db.relationship("SchoolTerm", backref=db.backref("exams", lazy=True))
    invigilator = db.relationship("User", backref=db.backref("exams", lazy=True))
    class_room = db.relationship("ClassRoom", backref=db.backref("exams", lazy=True))

    # Function to generate exam name based on class, subject, and exam type
    def generate_name(self):
        """Auto-generate exam name: {Class Name}-{Subject Name}-{Exam Type}"""
        return f"{self.class_room.class_room_name}-{self.subject.subject_name}-{self.exam_type}"

    def to_dict(self):
        """Convert Exam object to a serializable dictionary."""
        hours = self.duration.seconds // 3600 if self.duration else 0
        minutes = (self.duration.seconds % 3600) // 60 if self.duration else 0
        return {
            "id": self.id,
            "name": self.name,
            "exam_type": self.exam_type,
            "description": self.description,
            "date": self.date.strftime("%Y-%m-%d") if self.date else None,
            "duration": self.duration.seconds,
            "duration_hours": hours,
            "duration_minutes": minutes,
            "subject_id": self.subject_id,
            "class_room_id": self.class_room_id,
            "school_term_id": self.school_term_id,
            "invigilator_id": self.invigilator_id,
            "max_score": self.max_score,
            "number_of_questions": self.number_of_questions,
            "calculator_enabled": self.calculator_enabled,
            "is_on_the_go": self.is_on_the_go,
            "save_after_completion": self.save_after_completion,
            "show_feedback": self.show_feedback,
            "is_active": self.is_active,
            "is_finished": self.is_finished,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": self.updated_at.strftime("%Y-%m-%d %H:%M:%S"),
        }
    def __repr__(self):
        return f"<Exam {self.name}>"  # Returns exam name
