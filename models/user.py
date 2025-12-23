from . import db, bcrypt
from datetime import datetime
from services.generate_uuid import generate_uuid

"""
User model: A user model that represents a student, teacher, or admin in the system.
            This model doesn't only represent the 3 entities, but also demo users
            that are used for testing and demonstration purposes.
"""

class User(db.Model):
    """
    User model class
    """
    __tablename__ = "user"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid, unique=True)
    username = db.Column(db.String(20), nullable=False, unique=True)
    email = db.Column(
        db.String(120), unique=True, nullable=True
    )  # Nullable for students
    register_number = db.Column(
        db.String(20), nullable=True
    )  # Nullable for staff/admin
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    gender = db.Column(db.String(20), nullable=False)
    dob = db.Column(db.Date, nullable=False)
    image = db.Column(db.String(200), nullable=True)
    class_room_id = db.Column(
        db.String(36), db.ForeignKey("class_room.class_room_id"), nullable=True
    )  # Nullable for staff/admin
    role = db.Column(db.String(20), nullable=False)
    password = db.Column(db.String(100), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationship to ClassRoom
    class_room = db.relationship(
        "ClassRoom", foreign_keys=[class_room_id], backref="users"
    )
    

    # Relationship to Student
    student = db.relationship("Student", foreign_keys="Student.user_id", 
                             backref="user", uselist=False, cascade="all, delete-orphan")

    # Relationship to Teacher
    teacher = db.relationship("Teacher", foreign_keys="Teacher.user_id", 
                            backref="user", uselist=False, cascade="all, delete-orphan")
    def full_name(self):
        return f"{self.first_name.title()} {self.last_name.title()}"

    def set_password(self, password):
        self.password = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password, password)

    def generate_username(role: str) -> str:
        "Register number format for student: ST<registration_year><last_class_number>"
        registration_year = datetime.utcnow().strftime("%Y")
        number_of_users = User.query.filter_by(role=role).count()
        if role == "student":
            return f"ST{registration_year[-2:]}{number_of_users:03d}"
        elif role == "staff":
            return f"TE{registration_year[-2:]}{number_of_users:03d}"
        elif role == "admin":
            return f"AD{registration_year[-2:]}{number_of_users:03d}"
        else:
            # Default case for unknown roles
            return f"US{registration_year[-2:]}{number_of_users:03d}"

    def __repr__(self):
        """Return a string representation of the User object."""
        return f"User('{self.first_name}', '{self.last_name}', '{self.gender}', '{self.dob}', '{self.image}', '{self.class_room_id}', '{self.role}', '{self.password}')"
