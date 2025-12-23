from . import db
from datetime import datetime
from services.generate_uuid import generate_uuid


class Question(db.Model):
    __tablename__ = 'questions'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    question_text = db.Column(db.String(500), nullable=False)
    question_type = db.Column(db.String(50), nullable=False)  # mcq, true_false, short_answer, etc.
    correct_answer = db.Column(db.Text, nullable=True)  # For short answer questions
    question_image = db.Column(db.Text, nullable=True)  # Base64 encoded image or image URL
    has_math = db.Column(db.Boolean, default=False)  # Flag to indicate LaTeX/MathJax content
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Keys - corrected to match existing models
    subject_id = db.Column(db.String(36), db.ForeignKey('subject.subject_id'), nullable=False)
    teacher_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)  # Reference User, not Teacher
    class_room_id = db.Column(db.String(36), db.ForeignKey('class_room.class_room_id'), nullable=False)
    term_id = db.Column(db.String(36), db.ForeignKey('school_term.term_id'), nullable=False)
    exam_type_id = db.Column(db.String(36), db.ForeignKey('exams.id'), nullable=False)
    
    # Relationships
    options = db.relationship('Option', backref='question', lazy=True, cascade='all, delete-orphan')
    
    # Relationship to parent models
    subject = db.relationship('Subject', backref='questions')
    teacher = db.relationship('User', backref='questions')  # Teacher is a User with role='staff'
    class_room = db.relationship('ClassRoom', backref='questions')
    
    def __repr__(self):
        return f'<Question {self.id}: {self.question_text[:50]}...>'


class Option(db.Model):
    __tablename__ = 'options'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    text = db.Column(db.String(500), nullable=False)
    is_correct = db.Column(db.Boolean, nullable=False, default=False)
    order = db.Column(db.Integer, nullable=False, default=0)  # For ordering options
    option_image = db.Column(db.Text, nullable=True)  # Base64 encoded image or image URL
    has_math = db.Column(db.Boolean, default=False)  # Flag to indicate LaTeX/MathJax content
    
    # Foreign Key
    question_id = db.Column(db.String(36), db.ForeignKey('questions.id'), nullable=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Option {self.id}: {self.text[:30]}... ({self.is_correct})>'