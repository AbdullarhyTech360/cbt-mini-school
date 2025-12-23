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
        return {
            "id": self.id,
            "name": self.name,
            "exam_type": self.exam_type,
            "description": self.description,
            "date": self.date.strftime("%Y-%m-%d"),
            "duration": self.duration.seconds,
            "subject_id": self.subject_id,
            "class_room_id": self.class_room_id,
            "school_term_id": self.school_term_id,
            "invigilator_id": self.invigilator_id,
            "max_score": self.max_score,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": self.updated_at.strftime("%Y-%m-%d %H:%M:%S"),
        }
    def __repr__(self):
        return f"<Exam {self.name}>"  # Returns exam name
