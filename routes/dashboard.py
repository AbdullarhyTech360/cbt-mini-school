from datetime import datetime
from functools import wraps

from flask import flash, redirect, render_template, session, url_for
from sqlalchemy import and_

from models import User, db
from models.associations import student_exam, student_subject, teacher_subject, teacher_classroom
from models.exam import Exam
from models.exam_record import ExamRecord
from models.on_the_go_test import OnTheGoTest
from models.subject import Subject
from models.school import School
from models.section import Section
from models.school_term import SchoolTerm
from models.class_room import ClassRoom
from models.question import Question


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
        if not user or user.role not in ["staff", "admin"]:
            flash("Access denied. Staff or admin privileges required.", "error")
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
        total_questions = Question.query.count()
        total_exam_records = ExamRecord.query.count()
        total_classes = ClassRoom.query.count()
        total_subjects = Subject.query.count()
        current_date = datetime.now().strftime("%B %d, %Y")
        current_user = User.query.get(session["user_id"])
        school = School.query.first()
        has_sections = Section.query.first() is not None
        has_terms = SchoolTerm.query.first() is not None
        current_term = SchoolTerm.query.filter_by(is_current=True).first()
        needs_setup = school and not school.setup_skipped and not has_sections and not has_terms

        recent_activity = []
        now = datetime.utcnow()

        recent_users = User.query.order_by(User.created_at.desc()).limit(5).all()
        for u in recent_users:
            recent_activity.append({
                "type": "user",
                "title": "New User Registered",
                "description": f"{u.first_name} {u.last_name} joined as {u.role.title()}",
                "time": u.created_at,
                "icon": "person_add",
                "color": "blue",
                "link": "/admin/user_management",
            })

        recent_questions = Question.query.order_by(Question.created_at.desc()).limit(5).all()
        for q in recent_questions:
            subj = Subject.query.get(q.subject_id)
            recent_activity.append({
                "type": "question",
                "title": "Questions Uploaded",
                "description": f"New {subj.subject_name if subj else ''} question added to the database",
                "time": q.created_at,
                "icon": "quiz",
                "color": "purple",
                "link": "/admin/questions",
            })

        recent_exams = Exam.query.order_by(Exam.created_at.desc()).limit(5).all()
        for e in recent_exams:
            recent_activity.append({
                "type": "exam",
                "title": "Exam Created",
                "description": f"{e.name} scheduled for {e.date.strftime('%b %d, %Y') if e.date else 'TBD'}",
                "time": e.created_at,
                "icon": "edit_document",
                "color": "green",
                "link": "/admin/exams",
            })

        recent_activity.sort(key=lambda x: x["time"] if x["time"] else datetime.min, reverse=True)
        recent_activity = recent_activity[:5]

        for activity in recent_activity:
            if activity["time"]:
                diff = now - activity["time"]
                if diff.days > 0:
                    activity["time_ago"] = f"{diff.days} day{'s' if diff.days != 1 else ''} ago"
                elif diff.seconds >= 3600:
                    hours = diff.seconds // 3600
                    activity["time_ago"] = f"{hours} hour{'s' if hours != 1 else ''} ago"
                elif diff.seconds >= 60:
                    minutes = diff.seconds // 60
                    activity["time_ago"] = f"{minutes} minute{'s' if minutes != 1 else ''} ago"
                else:
                    activity["time_ago"] = "Just now"
            else:
                activity["time_ago"] = ""

        return render_template(
            "admin/dashboard.html",
            total_users=total_users,
            total_questions=total_questions,
            total_exam_records=total_exam_records,
            total_classes=total_classes,
            total_subjects=total_subjects,
            current_date=current_date,
            current_user=current_user,
            current_term=current_term,
            needs_setup=needs_setup,
            recent_activity=recent_activity,
        )

    @app.route("/staff/dashboard")
    @staff_required
    def staff_dashboard():
        # Basic session check - add proper authentication later
        if "user_id" not in session:
            return redirect(url_for("login"))
        current_user = User.query.get(session["user_id"])

        from models import is_permission_active

        # Check appropriate dashboard permission based on user role
        if current_user.role == "staff":
            if not is_permission_active("staff_can_view_dashboard"):
                flash("Staff dashboard access has been disabled by the administrator.", "error")
                return redirect(url_for("login"))
        else:
            # Teachers (and admins accessing staff routes)
            if not is_permission_active("teachers_can_view_dashboard"):
                flash("Teacher dashboard access has been disabled by the administrator.", "error")
                return redirect(url_for("login"))
        current_date = datetime.now().strftime("%B %d, %Y")
        current_user = User.query.get(session["user_id"])

        # Get teacher's assigned classes (from all sources)
        assigned_class_ids = set()

        # 1. Form-master classes
        form_master_classes = ClassRoom.query.filter_by(form_teacher_id=current_user.id, is_active=True).all()
        for cls in form_master_classes:
            assigned_class_ids.add(cls.class_room_id)

        # 2. Classes from teacher_subject association
        subject_assignments = db.session.execute(
            db.select(teacher_subject).where(teacher_subject.c.teacher_id == current_user.id)
        ).fetchall()
        for row in subject_assignments:
            assigned_class_ids.add(row[2])  # class_room_id

        # 3. Classes from teacher_classroom association
        classroom_assignments = db.session.execute(
            db.select(teacher_classroom).where(teacher_classroom.c.teacher_id == current_user.id)
        ).fetchall()
        for row in classroom_assignments:
            assigned_class_ids.add(row[1])  # classroom_id

        # Get ClassRoom objects
        assigned_classes = ClassRoom.query.filter(
            ClassRoom.class_room_id.in_(assigned_class_ids)
        ).all() if assigned_class_ids else []

        # Count students across all assigned classes
        my_students_count = 0
        if assigned_class_ids:
            my_students_count = User.query.filter(
                User.class_room_id.in_(assigned_class_ids),
                User.role == "student",
                User.is_active == True
            ).count()

        # Count questions created by this teacher
        questions_count = Question.query.filter_by(teacher_id=current_user.id).count()

        # Compute attendance rate for teacher's classes
        from models.attendance import Attendance
        current_term = SchoolTerm.query.filter_by(is_current=True).first()
        attendance_rate = None
        if assigned_class_ids and current_term:
            total_records = Attendance.query.filter(
                Attendance.class_room_id.in_(assigned_class_ids),
                Attendance.term_id == current_term.term_id
            ).count()
            present_records = Attendance.query.filter(
                Attendance.class_room_id.in_(assigned_class_ids),
                Attendance.term_id == current_term.term_id,
                Attendance.status == "present"
            ).count()
            if total_records > 0:
                attendance_rate = round((present_records / total_records) * 100)

        # Build class list with student counts and subject names for "My Classes Today"
        classes_today = []
        for cls in assigned_classes:
            student_count = User.query.filter_by(
                class_room_id=cls.class_room_id, role="student", is_active=True
            ).count()
            # Get subjects for this class from teacher_subject
            cls_subject_ids = [row[1] for row in subject_assignments if row[2] == cls.class_room_id]
            cls_subjects = Subject.query.filter(Subject.subject_id.in_(cls_subject_ids)).all() if cls_subject_ids else []
            subject_names = ", ".join([s.subject_name for s in cls_subjects]) if cls_subjects else "General"
            classes_today.append({
                "class": cls,
                "student_count": student_count,
                "subject_names": subject_names,
            })

        # Get recent activity (last 3 actions from this teacher)
        recent_activity = []

        # Recent grade updates
        from models.grade import Grade
        recent_grades = Grade.query.filter_by(teacher_id=current_user.id).order_by(Grade.updated_at.desc()).limit(3).all()
        for grade in recent_grades:
            subj = Subject.query.get(grade.subject_id)
            cls = ClassRoom.query.get(grade.class_room_id)
            recent_activity.append({
                "type": "scores",
                "title": "Scores Updated",
                "description": f"Updated {subj.subject_name if subj else 'subject'} scores for {cls.class_room_name if cls else 'class'}",
                "time": grade.updated_at,
                "icon": "edit_note",
                "color": "blue",
            })

        # Recent attendance
        recent_attendance = Attendance.query.filter_by(marked_by_id=current_user.id).order_by(Attendance.created_at.desc()).limit(3).all()
        for att in recent_attendance:
            cls = ClassRoom.query.get(att.class_room_id)
            recent_activity.append({
                "type": "attendance",
                "title": "Attendance Recorded",
                "description": f"Marked attendance for {cls.class_room_name if cls else 'class'}",
                "time": att.created_at,
                "icon": "checklist",
                "color": "purple",
            })

        # Recent question uploads
        recent_questions = Question.query.filter_by(teacher_id=current_user.id).order_by(Question.created_at.desc()).limit(3).all()
        for q in recent_questions:
            subj = Subject.query.get(q.subject_id)
            recent_activity.append({
                "type": "questions",
                "title": "Questions Uploaded",
                "description": f"Added new {subj.subject_name if subj else ''} question",
                "time": q.created_at,
                "icon": "upload_file",
                "color": "green",
            })

        # Sort by time and take top 3
        recent_activity.sort(key=lambda x: x["time"] if x["time"] else datetime.min, reverse=True)
        recent_activity = recent_activity[:3]

        # Compute time ago strings for activity
        from datetime import timedelta
        now = datetime.utcnow()
        for activity in recent_activity:
            if activity["time"]:
                diff = now - activity["time"]
                if diff.days > 0:
                    activity["time_ago"] = f"{diff.days} day{'s' if diff.days != 1 else ''} ago"
                elif diff.seconds >= 3600:
                    hours = diff.seconds // 3600
                    activity["time_ago"] = f"{hours} hour{'s' if hours != 1 else ''} ago"
                elif diff.seconds >= 60:
                    minutes = diff.seconds // 60
                    activity["time_ago"] = f"{minutes} minute{'s' if minutes != 1 else ''} ago"
                else:
                    activity["time_ago"] = "Just now"
            else:
                activity["time_ago"] = ""

        return render_template(
            "staff/dashboard.html",
            current_date=current_date,
            current_user=current_user,
            my_students_count=my_students_count,
            questions_count=questions_count,
            attendance_rate=attendance_rate,
            classes_today=classes_today,
            recent_activity=recent_activity,
        )

    @app.route("/student/dashboard")
    @student_required
    def student_dashboard():
        # Basic session check - add proper authentication later
        if "user_id" not in session:
            return redirect(url_for("login"))
        current_user = User.query.get(session["user_id"])

        from models import is_permission_active

        # Check if students are allowed to view dashboard (bypass for demo users)
        is_demo_user = "demo" in current_user.username.lower()
        if not is_demo_user and not is_permission_active("students_can_view_dashboard"):
            flash("Student dashboard access has been disabled by the administrator.", "error")
            return redirect(url_for("login"))

        # Check if students can write exams permission is active
        can_write_exams = is_permission_active("students_can_write_exam")

        # Fetch student's enrolled subjects
        enrolled_subject_ids = []
        completed_exam_ids = set()
        if current_user:
            result = (
                db.session.execute(
                    db.select(student_subject.c.subject_id).where(
                        student_subject.c.student_id == current_user.id
                    )
                )
                .scalars()
                .all()
            )
            enrolled_subject_ids = list(result)

            # Get all completed exams for this student
            completed_result = (
                db.session.execute(
                    db.select(student_exam.c.exam_id).where(
                        student_exam.c.student_id == current_user.id
                    )
                )
                .scalars()
                .all()
            )
            completed_exam_ids = list(completed_result)

        # Fetch available exams
        available_exams = []
        exams_data = []
        if can_write_exams:
            from datetime import datetime

            if is_demo_user:
                # Demo users get ALL active, non-finished exams
                available_exams = (
                    Exam.query.filter(Exam.is_active == True, Exam.is_finished == False)
                    .order_by(Exam.date.desc())
                    .all()
                )
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
                    Exam.is_active == True, Exam.is_finished == False
                )

                # Only filter by enrolled subjects if student has enrollments
                if enrolled_subject_ids:
                    available_exams_query = available_exams_query.filter(
                        Exam.subject_id.in_(enrolled_subject_ids)
                    )

                # Add time filter - exclude exams that have ended
                available_exams_query = available_exams_query.filter(
                    and_(
                        db.or_(
                            Exam.time_ended.is_(None),
                            Exam.time_ended > datetime.utcnow(),
                        )
                    )
                )

                # Exclude past-date exams (allow On-The-Go which are ad-hoc)
                available_exams_query = available_exams_query.filter(
                    db.or_(
                        Exam.is_on_the_go == True,
                        Exam.date >= datetime.utcnow().date(),
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
                    "date_formatted": exam.date.strftime("%B %d, %Y")
                    if exam.date
                    else None,
                    "class_room_id": exam.class_room.class_room_id
                    if exam.class_room
                    else None,
                    "class_room_name": exam.class_room.class_room_name
                    if exam.class_room
                    else "N/A",
                    "subject_name": exam.subject.subject_name
                    if exam.subject
                    else "N/A",
                    "subject_icon_name": exam.subject.icon_name
                    if exam.subject
                    else "book",
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

        # Fetch exam history (completed exams with scores)
        exam_history = []
        if current_user and completed_exam_ids:
            records = (
                ExamRecord.query.filter(
                    ExamRecord.student_id == current_user.id,
                    ExamRecord.exam_id.in_(completed_exam_ids),
                )
                .order_by(ExamRecord.submitted_at.desc())
                .all()
            )
            if records:
                scores = [r.score_percentage for r in records if r.score_percentage is not None]
                average_score = round(sum(scores) / len(scores), 1) if scores else 0
                best_score = max(scores) if scores else 0
                for rec in records:
                    exam_history.append({
                        "exam_id": rec.exam_id,
                        "exam_name": rec.exam.name if rec.exam else "Unknown Exam",
                        "subject_name": rec.exam.subject.subject_name if rec.exam and rec.exam.subject else "N/A",
                        "subject_icon": rec.exam.subject.icon_name if rec.exam and rec.exam.subject else "quiz",
                        "score_percentage": rec.score_percentage,
                        "letter_grade": rec.letter_grade,
                        "max_score": rec.max_score,
                        "submitted_at": rec.submitted_at.strftime("%b %d, %Y %I:%M %p") if rec.submitted_at else "N/A",
                        "total_questions": rec.total_questions,
                        "correct_answers": rec.correct_answers,
                    })
        else:
            best_score = 0

        # Upcoming exams (available, not completed, with dates)
        upcoming_exams = []
        for exam in available_exams:
            if exam.date:
                now = datetime.utcnow()
                days_until = (exam.date.date() - now.date()).days
                upcoming_exams.append({
                    "id": exam.id,
                    "name": exam.name,
                    "subject_name": exam.subject.subject_name if exam.subject else "N/A",
                    "subject_icon": exam.subject.icon_name if exam.subject else "quiz",
                    "date": exam.date.strftime("%b %d, %Y"),
                    "days_until": days_until,
                })
        upcoming_exams.sort(key=lambda x: x["days_until"])

        # Fetch available On-The-Go tests for Quick Tests section
        available_otg_tests = []
        try:
            from models.on_the_go_test import OnTheGoTest, student_on_the_go_test
            otg_query = OnTheGoTest.query.filter(
                OnTheGoTest.is_active == True,
                OnTheGoTest.is_finished == False,
            )

            if not is_demo_user:
                # Filter by enrolled subjects
                if enrolled_subject_ids:
                    otg_query = otg_query.filter(
                        OnTheGoTest.subject_id.in_(enrolled_subject_ids)
                    )
                # Filter by class (null = all classes)
                otg_query = otg_query.filter(
                    db.or_(
                        OnTheGoTest.class_room_id.is_(None),
                        OnTheGoTest.class_room_id == current_user.class_room_id,
                    )
                )
            else:
                # Demo users see all active OTG tests
                pass

            # Exclude already completed
            if completed_exam_ids:
                # Note: completed_exam_ids is for Exam model — use student_on_the_go_test for OTG
                pass

            otg_completed_ids = list(db.session.execute(
                db.select(student_on_the_go_test.c.on_the_go_test_id)
                .where(student_on_the_go_test.c.student_id == current_user.id)
            ).scalars().all())

            if otg_completed_ids:
                otg_query = otg_query.filter(~OnTheGoTest.id.in_(otg_completed_ids))

            available_otg_tests = otg_query.order_by(OnTheGoTest.created_at.desc()).all()
        except Exception as e:
            print(f"Error fetching On-The-Go tests: {e}")
            available_otg_tests = []

        from datetime import datetime

        return render_template(
            "student/dashboard.html",
            current_user=current_user,
            available_exams=exams_data,
            available_otg_tests=available_otg_tests,
            enrolled_subjects=enrolled_subjects,
            total_subjects=total_subjects,
            total_available_exams=total_available_exams,
            completed_exams=completed_exams,
            average_score=average_score,
            best_score=best_score,
            exam_history=exam_history,
            upcoming_exams=upcoming_exams,
            completed_exam_ids=completed_exam_ids,
            datetime=datetime,
        )
