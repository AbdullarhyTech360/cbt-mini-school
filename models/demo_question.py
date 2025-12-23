from . import db
from services.generate_uuid import generate_uuid
from datetime import datetime


class DemoQuestion(db.Model):
    __tablename__ = 'demo_questions'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    question_text = db.Column(db.String(500), nullable=False)
    question_type = db.Column(db.String(50), nullable=False)  # mcq, true_false, short_answer
    correct_answer = db.Column(db.Text, nullable=True)  # For short answer questions
    subject = db.Column(db.String(100), nullable=False)  # Subject name for categorization
    difficulty = db.Column(db.String(20), nullable=False, default='medium')  # easy, medium, hard
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    options = db.relationship('DemoOption', backref='question', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<DemoQuestion {self.id}: {self.question_text[:50]}...>'


class DemoOption(db.Model):
    __tablename__ = 'demo_options'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    text = db.Column(db.String(500), nullable=False)
    is_correct = db.Column(db.Boolean, nullable=False, default=False)
    order = db.Column(db.Integer, nullable=False, default=0)  # For ordering options
    
    # Foreign Key
    question_id = db.Column(db.String(36), db.ForeignKey('demo_questions.id'), nullable=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<DemoOption {self.id}: {self.text[:30]}... ({self.is_correct})>'