from . import db
from services.generate_uuid import generate_uuid


class Student(db.Model):

    __tablename__ = "student"
    id = db.Column(db.String(36), primary_key=True, unique=True, nullable=False, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    # Student-specific fields
    admission_number = db.Column(db.String(20), unique=True, nullable=True)
    admission_date = db.Column(db.Date, nullable=True)
    parent_name = db.Column(db.String(200), nullable=True)
    parent_phone = db.Column(db.String(20), nullable=True)
    parent_email = db.Column(db.String(120), nullable=True)
    blood_group = db.Column(db.String(5), nullable=True)
    address = db.Column(db.Text, nullable=True)
    performance = db.Column(db.Float, nullable=True)
    

    def full_name(self):
        if self.user:
            return f"{self.user.first_name.title()} {self.user.last_name.title()}"
        return "Student name not available"
    def __repr__(self):
        if self.user:
            return f"<Student {self.user.first_name.title()} {self.user.last_name.title()} - {self.admission_number}>"
        return f"<Student ID: {self.id} - {self.admission_number}>"
