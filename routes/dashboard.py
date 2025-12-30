from flask import render_template, session, redirect, url_for, flash
from models import db, User
from models.exam import Exam
from models.subject import Subject
from models.associations import student_subject, student_exam
from datetime import datetime
from functools import wraps
from sqlalchemy import and_


def admin_required(f):
    """Decorator to require admin role for accessing admin routes"""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))

        user = User.query.get(session["user_id"])
        if not user or user.role != "admin":
            flash("Access denied. Admin privileges required.", "error")
            return redirect(url_for("login"))

        return f(*args, **kwargs)

    return decorated_function


def staff_required(f):
    """Decorator to require staff role for accessing staff routes"""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))

        user = User.query.get(session["user_id"])
        if not user or user.role != "staff":
            flash("Access denied. Staff privileges required.", "error")
            return redirect(url_for("login"))

        return f(*args, **kwargs)

    return decorated_function

def student_required(f):
    """Decorator to require student role for accessing student routes"""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))

        user = User.query.get(session["user_id"])
        if not user or user.role != "student":
            flash("Access denied. Student privileges required.", "error")
            return redirect(url_for("login"))

        return f(*args, **kwargs)

    return decorated_function

def dashboard_route(app):
    @app.route("/admin/dashboard")
    @app.route("/admin/dashboard/<user_id>")
    @admin_required
    def admin_dashboard(user_id=None):
        total_users = db.session.query(User).count()
        current_date = datetime.now().strftime("%B %d, %Y")
        current_user = User.query.get(session["user_id"])
        return render_template(
            "admin/dashboard.html",
            total_users=total_users,
            current_date=current_date,
            current_user=current_user,
        )

    @app.route("/staff/dashboard")
    @staff_required
    def staff_dashboard():
        # Basic session check - add proper authentication later
        if "user_id" not in session:
            return redirect(url_for("login"))
        current_date = datetime.now().strftime("%B %d, %Y")
        current_user = User.query.get(session["user_id"])
        # Fetch users with role 'student'
        students = User.query.filter_by(role="student").all()
        # print(students)
        return render_template(
            "staff/dashboard.html",
            current_date=current_date,
            current_user=current_user,
            students=students,
        )

    @app.route("/student/dashboard")
    @student_required
    def student_dashboard():
        # Basic session check - add proper authentication later
        if "user_id" not in session:
            return redirect(url_for("login"))
        current_user = User.query.get(session["user_id"])
        
        # Check if students can write exams permission is active
        from models import is_permission_active
        can_write_exams = is_permission_active("students_can_write_exam")
        
        # Fetch student's enrolled subjects
        enrolled_subject_ids = []
        completed_exam_ids = set()
        if current_user:
            result = db.session.execute(
                db.select(student_subject.c.subject_id).where(
                    student_subject.c.student_id == current_user.id
                )
            ).scalars().all()
            enrolled_subject_ids = list(result)
            
            # Get all completed exams for this student
            completed_result = db.session.execute(
                db.select(student_exam.c.exam_id).where(
                    student_exam.c.student_id == current_user.id
                )
            ).scalars().all()
            completed_exam_ids = list(completed_result)
        
        # Check if this is a demo user
        is_demo_user = "demo" in current_user.username.lower()
        
        # Fetch available exams
        available_exams = []
        exams_data = []
        if can_write_exams:
            from datetime import datetime
            
            if is_demo_user:
                # Demo users get ALL active, non-finished exams
                available_exams = Exam.query.filter(
                    Exam.is_active == True,
                    Exam.is_finished == False
                ).order_by(Exam.date.desc()).all()
                # print(f"DEBUG: Demo user '{current_user.username}' dashboard - showing {len(available_exams)} active exams")
            else:
                # Regular students - apply normal filters
                # Get exams that:
                # 1. Are active and not finished
                # 2. Are for subjects the student is enrolled in (or all exams if no enrollments)
                # 3. Have not ended yet (time_ended is None or in the future)
                # 4. Are scheduled for today or future dates
                # 5. Have not been completed by the student
                available_exams_query = Exam.query.filter(
                    Exam.is_active == True,
                    Exam.is_finished == False
                )
                
                # Only filter by enrolled subjects if student has enrollments
                if enrolled_subject_ids:
                    available_exams_query = available_exams_query.filter(
                        Exam.subject_id.in_(enrolled_subject_ids)
                    )
                
                # Add time filter
                available_exams_query = available_exams_query.filter(
                    and_(
                        db.or_(
                            Exam.time_ended.is_(None),
                            Exam.time_ended > datetime.utcnow(),
                        )
                    )
                )
                
                # Exclude exams that the student has already completed
                if completed_exam_ids:
                    available_exams_query = available_exams_query.filter(
                        ~Exam.id.in_(completed_exam_ids)
                    )
                
                available_exams = available_exams_query.order_by(Exam.date.desc()).all()
        
            # Convert to serializable format
            for exam in available_exams:
                exam_data = {
                    "id": exam.id,
                    "name": exam.name,
                    "exam_type": exam.exam_type,
                    "date": exam.date.strftime("%Y-%m-%d") if exam.date else None,
                    "date_formatted": exam.date.strftime("%B %d, %Y") if exam.date else None,
                    "class_room_id": exam.class_room.class_room_id if exam.class_room else None,
                    "class_room_name": exam.class_room.class_room_name if exam.class_room else "N/A",
                    "subject_name": exam.subject.subject_name if exam.subject else "N/A",
                    "subject_icon_name": exam.subject.icon_name if exam.subject else "book"
                }
                exams_data.append(exam_data)
        
        # Get student's enrolled subjects with details
        enrolled_subjects = []
        if enrolled_subject_ids:
            enrolled_subjects = Subject.query.filter(
                Subject.subject_id.in_(enrolled_subject_ids)
            ).all()
        
        # Calculate stats
        total_subjects = len(enrolled_subjects)
        total_available_exams = len(available_exams)
        completed_exams = len(completed_exam_ids)
        average_score = 0
        
        from datetime import datetime
        return render_template(
            "student/dashboard.html",
            current_user=current_user,
            available_exams=exams_data,
            enrolled_subjects=enrolled_subjects,
            total_subjects=total_subjects,
            total_available_exams=total_available_exams,
            completed_exams=completed_exams,
            average_score=average_score,
            completed_exam_ids=completed_exam_ids,
            datetime=datetime
        )