from services.generate_uuid import generate_uuid
from . import db

class Teacher(db.Model):
    __tablename__ = "teacher"
    id = db.Column(db.String(36), primary_key=True, unique=True, nullable=False, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("user.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Teacher-specific fields
    employee_id = db.Column(db.String(20), unique=True, nullable=True)
    joining_date = db.Column(db.Date, nullable=True)
    qualification = db.Column(db.String(200), nullable=True)
    specialization = db.Column(db.String(200), nullable=True)
    salary = db.Column(db.Float, nullable=True)
    experience_years = db.Column(db.Integer, nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    address = db.Column(db.Text, nullable=True)
    email = db.Column(db.String(120), nullable=True)
    perfmance = db.Column(db.Float, nullable=True)

    def full_name(self):
        if self.user:
            return f"{self.user.first_name.title()} {self.user.last_name.title()}"
        return "Teacher name not available"

    def __repr__(self):
        return f"<Teacher {self.full_name()} - {self.employee_id}>"
