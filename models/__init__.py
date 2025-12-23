from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
bcrypt = Bcrypt()

# Import models to register them
from .user import User
from .class_room import ClassRoom
from .student import Student
from .teacher import Teacher
from .subject import Subject
from .school import School
from .school_term import SchoolTerm
from .section import Section
from .permissions import Permission
from .attendance import Attendance
from .grade import Grade
from .associations import teacher_subject, student_subject, teacher_classroom, class_subject, student_exam
from .question import Question, Option
from .exam import Exam
from .exam_record import ExamRecord
from .exam_session import ExamSession
from .demo_question import DemoQuestion, DemoOption
from .score_moderation import ScoreModeration
from .report_config import ReportConfig
from .grade_scale import GradeScale
from .assessment_type import AssessmentType

# Helper function to check if a permission is active
def is_permission_active(permission_name):
    """Check if a permission is active"""
    permission = Permission.query.filter_by(permission_name=permission_name).first()
    return permission and permission.is_active