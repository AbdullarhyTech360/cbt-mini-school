from flask import g
from . import db
from services.generate_uuid import generate_uuid
from datetime import datetime


class ClassRoom(db.Model):
    __tablename__ = "class_room"

    class_room_id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    class_room_name = db.Column(db.String(100), nullable=False, unique=True)
    level = db.Column(db.Integer, nullable=True)  # Grade level (e.g., 1, 2, 3)
    section = db.Column(
        db.String(50), nullable=True
    )  # Section Nursery, primary, secondary
    group = db.Column(db.String(50), nullable=True)  # Group A, B, C, etc.
    number_of_students = db.Column(db.Integer, nullable=False, default=0)
    class_capacity = db.Column(db.Integer, nullable=False, default=40)

    # Foreign Keys
    form_teacher_id = db.Column(
        db.String(36), db.ForeignKey("user.id"), nullable=True
    )  # Reference to Teacher (who is a User)
    class_rep_id = db.Column(
        db.String(36), db.ForeignKey("user.id"), nullable=True
    )  # Reference to Student (who is a User)
    section_id = db.Column(
        db.String(36), db.ForeignKey("section.section_id"), nullable=True
    )  # Reference to Section
    section = db.relationship(
        "Section",
        foreign_keys=[section_id],
        backref="classes",
        lazy="joined",
    )

    # Status and tracking
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    academic_year = db.Column(db.String(20), nullable=True)  # e.g., "2024-2025"

    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    form_teacher = db.relationship(
        "User",
        foreign_keys=[form_teacher_id],
        backref="form_teacher_classes",
        lazy="joined",
    )
    class_rep = db.relationship(
        "User",
        foreign_keys=[class_rep_id],
        backref="class_rep_classes",
        lazy="joined",
    )

    subjects = db.relationship(
        "Subject",
        secondary="class_subject",
        back_populates="classes",
        lazy="select"
    )

    def update_student_count(self):
        """Update the student count for this classroom."""
        from .user import User

        count = User.query.filter_by(
            class_room_id=self.class_room_id, role="student", is_active=True
        ).count()
        self.number_of_students = count
        db.session.commit()

    def get_students(self):
        """Get all active students in this classroom."""
        from .user import User

        return User.query.filter_by(
            class_room_id=self.class_room_id, role="student", is_active=True
        ).all()

    def get_available_spaces(self):
        """Get the number of available spaces in this classroom."""
        return max(0, self.class_capacity - self.number_of_students)

    def is_full(self):
        """Check if the classroom is at capacity."""
        return self.number_of_students >= self.class_capacity

    def __repr__(self):
        return f"<ClassRoom {self.class_room_name} {self.form_teacher} {self.class_rep} {self.created_at} {self.updated_at}>"
