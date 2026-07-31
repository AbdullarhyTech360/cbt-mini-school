from functools import wraps
from time import time
from collections import defaultdict
import re
import threading
import uuid

from flask import render_template, request, jsonify, session, redirect, url_for
from models.student import Student
from models.teacher import Teacher
from models.user import User, generate_uuid
from models.class_room import ClassRoom
from models import db
from datetime import datetime
from models import Permission


ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


def allowed_image(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


_rate_limit_store = defaultdict(list)
_rate_limit_lock = threading.Lock()


def rate_limit(max_requests=5, window=60, methods=None):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if methods is None or request.method in methods:
                ip = request.remote_addr or "127.0.0.1"
                now = time()
                with _rate_limit_lock:
                    timestamps = _rate_limit_store[ip]
                    timestamps = [t for t in timestamps if now - t < window]
                    _rate_limit_store[ip] = timestamps
                    if len(timestamps) >= max_requests:
                        return jsonify({"error": "Too many requests. Please try again later."}), 429
                    timestamps.append(now)
            return f(*args, **kwargs)
        return wrapper
    return decorator


def auth_routes(app):
    @app.route("/favicon.ico")
    def favicon():
        """Favicon route - return 204 No Content"""
        from flask import Response
        return Response(status=204)

    @app.route("/register", methods=["GET", "POST"])
    @rate_limit(max_requests=5, window=60, methods=["POST"])
    def register():
        if request.method == "POST":
            try:
                # Check content type to determine how to get data
                if request.is_json:
                    data = request.get_json(silent=True)
                else:
                    # Handle multipart/form-data
                    data = request.form.to_dict()

                if not data:
                    return jsonify({"error": "Invalid input data"}), 400

                first_name = data.get("first_name")
                last_name = data.get("last_name")
                email = data.get("email")
                gender = data.get("gender") or "Not specified"
                dob_str = data.get("dob")
                # Image handling is done separately below
                register_number = data.get("register_number")
                class_room_name = data.get("class_room")
                role = data.get("role")
                password = data.get("password")
                confirm_password = data.get("confirm_password")

                # ✅ Validate required fields based on role
                required_fields = [first_name, last_name, dob_str, role, password]
                if role in ["staff", "admin"]:
                    required_fields.append(email)
                elif role == "student":
                    # For students, class_room and register_number are required
                    required_fields.append(class_room_name)
                    required_fields.append(register_number)
                else:
                    return jsonify({"error": "Invalid role selected"}), 400

                if not all(required_fields):
                    return jsonify({"error": "All required fields must be filled"}), 400

                # Validate email format for staff/admin
                if role in ["staff", "admin"]:
                    email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
                    if not re.match(email_regex, email):
                        return jsonify({"error": "Please enter a valid email address"}), 400
                    # Check duplicate email
                    existing_email = User.query.filter_by(email=email.lower()).first()
                    if existing_email:
                        return jsonify({"error": "An account with this email already exists"}), 409

                # ✅ Validate password strength
                if len(password) < 4:
                    return jsonify({"error": "Password must be at least 4 characters long"}), 400

                # ✅ Validate password match
                if password != confirm_password:
                    return jsonify({"error": "Passwords do not match"}), 400

                    # ✅ Parse DOB
                try:
                    dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
                except Exception as e:
                    return jsonify({"message": "Invalid date format. Use YYYY-MM-DD"}), 400

                # Handle Image Upload
                image_path = None
                if 'image' in request.files:
                    file = request.files['image']
                    if file and file.filename:
                        from werkzeug.utils import secure_filename
                        import os

                        original = secure_filename(file.filename)
                        if not original:
                            return jsonify({"error": "Invalid filename"}), 400

                        if not allowed_image(original):
                            return jsonify({"error": "Invalid file type. Only PNG, JPG, JPEG, GIF, and WEBP are allowed"}), 400

                        ext = original.rsplit('.', 1)[1].lower()
                        unique_name = f"{uuid.uuid4().hex}.{ext}"

                        from utils.paths import get_profile_images_dir
                        upload_folder = get_profile_images_dir()

                        file_path = os.path.join(upload_folder, unique_name)
                        file.save(file_path)

                        image_path = f"/uploads/profile_images/{unique_name}"

                # Student-specific: resolve class_room and enforce scoped register_number uniqueness
                if role == "student":
                    class_room = ClassRoom.query.filter_by(
                        class_room_name=class_room_name
                    ).first()
                    if not class_room:
                        return jsonify({"error": "Class room not found"}), 400

                    # Check duplicate register_number within this class only
                    existing = (
                        User.query.filter_by(
                            register_number=str(register_number),
                            class_room_id=class_room.class_room_id,
                            role="student",
                        ).first()
                    )
                    if existing:
                        return jsonify({"error": "Register number already used in this class"}), 409

                    # Generate unique username before creating the user
                    username = User.generate_username(role=role)

                    # Ensure username is unique by adding a suffix if needed
                    base_username = username
                    counter = 1
                    while User.query.filter_by(username=username).first():
                        username = f"{base_username}{counter}"
                        counter += 1

                    # Create new user
                    user = User(
                        id=generate_uuid(),
                        username=username,
                        first_name=first_name,
                        last_name=last_name,
                        email=email,
                        gender=gender,
                        dob=dob,
                        image=image_path,
                        register_number=str(register_number),
                        class_room_id=class_room.class_room_id,
                        role=role,
                    )

                    user.set_password(password)
                    db.session.add(user)
                    db.session.flush()

                    student = Student(id=user.id, user_id=user.id)
                    db.session.add(student)
                    db.session.flush()
                    student.admission_number = username
                    student.admission_date = dob
                    student.parent_name = "Not specified"
                    student.parent_phone = "Not specified"
                    student.parent_email = "Not specified"
                    student.blood_group = "Not specified"
                    student.address = "Not specified"

                    from models.associations import class_subject, student_subject
                    class_subjects = db.session.execute(
                        db.select(class_subject.c.subject_id).where(
                            class_subject.c.class_room_id == user.class_room_id
                        )
                    ).scalars().all()

                    for subject_id in class_subjects:
                        enrollment = student_subject.insert().values(
                            student_id=user.id,
                            subject_id=subject_id
                        )
                        db.session.execute(enrollment)

                    db.session.commit()
                    return jsonify({"success": True, "username": user.username}), 200
                elif role == "staff" or role == "admin":
                    class_room = ClassRoom.query.filter_by(
                        class_room_name="Primary 1"
                    ).first()

                    if not class_room:
                        class_room = ClassRoom.query.first()

                    class_room_id = class_room.class_room_id if class_room else None

                    total_staff = User.query.filter_by(role="staff").count()
                    register_number = total_staff + 1

                    username = User.generate_username(role=role)

                    base_username = username
                    counter = 1
                    while User.query.filter_by(username=username).first():
                        username = f"{base_username}{counter}"
                        counter += 1

                    user = User(
                        id=generate_uuid(),
                        username=username,
                        first_name=first_name,
                        last_name=last_name,
                        email=email,
                        gender=gender,
                        dob=dob,
                        image=image_path,
                        register_number=register_number,
                        class_room_id=class_room_id,
                        role=role,
                    )
                    user.set_password(password)
                    db.session.add(user)
                    db.session.flush()

                    teacher = Teacher(id=user.id, user_id=user.id)
                    db.session.add(teacher)
                    db.session.commit()

                    return jsonify({"success": True, "username": user.username}), 200
            except Exception as e:
                db.session.rollback()
                app.logger.error(f"Registration error: {e}")
                return jsonify({"error": "An unexpected error occurred. Please try again."}), 500

        # check admin permission
        permissions = Permission.query.filter_by(
            permission_name="users_can_register"
        ).first()
        if not permissions:
            return jsonify({"error": "No permission for such action"}), 403
        elif permissions.is_active:
            # print(permissions)
            class_rooms = ClassRoom.query.all()

            # Get school info for the register page
            from models.school import School
            school_info = School.query.first()

            return render_template("auth/register.html", class_rooms=class_rooms, school_info=school_info)
        return jsonify({"error": "Permission is not active"}), 403

    @app.route("/login", methods=["GET", "POST"])
    @rate_limit(max_requests=10, window=60, methods=["POST"])
    def login():
        if request.method == "POST":
            # print("Login POST request received")
            data = request.get_json(silent=True)
            if not data:
                # print("No JSON data received")
                return jsonify({"error": "Invalid JSON input"}), 400

            username = data.get("username")
            password = data.get("password")
            # print(f"Login attempt: username={username}")

            # Validate required fields
            if not all([username, password]):
                # print("Missing required fields")
                return jsonify({"error": "Username and password are required"}), 400

            # Check existing user
            user = User.query.filter_by(username=username).first()
            # print(user)
            if not user:
                # print(f"User not found: {username}")
                return jsonify({"error": "Invalid username or password"}), 401

            # Check password
            if not user.check_password(password):
                # print("Password check failed")
                return jsonify({"error": "Invalid username or password"}), 401

            # Create session for successful login
            # Prevent session fixation: invalidate any existing session first
            remember = data.get("remember", False)
            session.clear()
            session.permanent = bool(remember)
            session["user_id"] = user.id
            session["username"] = user.username
            session["role"] = user.role

            # For students, also return available exams
            # Check if this is a demo user
            is_demo_user = "demo" in user.username.lower()

            response_data = {
                "success": True,
                "role": user.role,
                "user_id": user.id,
                "is_demo": is_demo_user
            }

            if user.role == "student":
                # Check if students can write exams permission is active
                from models import is_permission_active
                from models.associations import student_subject, student_exam
                from models.exam import Exam
                from datetime import datetime
                from sqlalchemy import and_

                can_write_exams = is_permission_active(
                    "students_can_write_exam")

                can_view_dashboard = is_permission_active(
                    "students_can_view_dashboard")

                # Fetch available exams
                available_exams = []
                if can_write_exams:
                    if is_demo_user:
                        # Demo users get ALL exams, no restrictions
                        available_exams = Exam.query.order_by(
                            Exam.date.desc()).all()
                    else:
                        # Regular students - apply normal filters
                        # Fetch student's enrolled subjects
                        enrolled_subject_ids = []
                        completed_exam_ids = set()
                        if user:
                            result = db.session.execute(
                                db.select(student_subject.c.subject_id).where(
                                    student_subject.c.student_id == user.id
                                )
                            ).scalars().all()
                            enrolled_subject_ids = list(result)

                            # Get all completed exams for this student
                            completed_result = db.session.execute(
                                db.select(student_exam.c.exam_id).where(
                                    student_exam.c.student_id == user.id
                                )
                            ).scalars().all()
                            completed_exam_ids = set(completed_result)

                        # Get exams that:
                        # 1. Are for subjects the student is enrolled in (or all exams if no enrollments)
                        # 2. Have not ended yet (time_ended is None or in the future)
                        # 3. Are scheduled for today or future dates
                        # 4. Have not been completed by the student
                        available_exams_query = Exam.query

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

                        available_exams = available_exams_query.order_by(
                            Exam.date.desc()).all()

                # Convert to serializable format
                exams_data = []
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
                        "subject_icon_name": exam.subject.icon_name if exam.subject else "book",
                        "is_on_the_go": exam.is_on_the_go if hasattr(exam, 'is_on_the_go') else False
                    }
                    exams_data.append(exam_data)

                # Also add OnTheGoTest records
                from models.on_the_go_test import OnTheGoTest, student_on_the_go_test
                otg_query = OnTheGoTest.query.filter(
                    OnTheGoTest.is_active == True,
                    OnTheGoTest.is_finished == False,
                )
                if not is_demo_user and user.class_room_id:
                    otg_query = otg_query.filter(
                        db.or_(
                            OnTheGoTest.class_room_id == user.class_room_id,
                            OnTheGoTest.class_room_id.is_(None),
                        )
                    )
                available_otg = otg_query.all()

                completed_otg_ids = set()
                if not is_demo_user:
                    comp_result = db.session.execute(
                        db.select(student_on_the_go_test.c.on_the_go_test_id).where(
                            student_on_the_go_test.c.student_id == user.id
                        )
                    ).scalars().all()
                    completed_otg_ids = set(comp_result)

                for test in available_otg:
                    if test.id not in completed_otg_ids:
                        otg_data = {
                            "id": test.id,
                            "name": test.title,
                            "exam_type": "On-The-Go",
                            "date": None,
                            "date_formatted": "Quick Test",
                            "class_room_id": test.class_room_id,
                            "class_room_name": test.class_room.class_room_name if test.class_room else "All Classes",
                            "subject_name": test.subject.subject_name if test.subject else "N/A",
                            "subject_icon_name": test.subject.icon_name if test.subject else "book",
                            "is_on_the_go": True
                        }
                        exams_data.append(otg_data)

                response_data["available_exams"] = exams_data

                response_data["can_view_dashboard"] = can_view_dashboard

            # print(f"Login successful: user={user.username}, role={user.role}")
            return jsonify(response_data), 200

        # GET request - show login form
        # Get school info for the login page
        from models.school import School
        school_info = School.query.first()

        # Pass empty list for upcoming_exams on GET (populated after login via JavaScript)
        return render_template("auth/login.html", school_info=school_info, upcoming_exams=[])

    @app.route("/logout", methods=["POST"])
    def logout():
        session.clear()
        response = redirect(url_for("index"))
        response.delete_cookie("session_type")
        return response

    # Route check if user exist by reg number or email for staff or admin
    @app.route("/check_user", methods=["POST"])
    @rate_limit(max_requests=15, window=60)
    def check_user():
        data = request.get_json(silent=True)
        # print(f"Data: {data}")
        if not data:
            return jsonify({"error": "Invalid JSON input"}), 400

        role = data.get("role")
        try:
            user = None
            # the register number or username typed
            message = data.get("message")

            # If role is specified, search by that role
            if role == "student":
                # Scope to selected class only
                class_room_id = data.get("class_room_id")
                class_room_name = data.get("class_room")

                # First try to find user by username
                user = User.query.filter_by(
                    username=message, role="student").first()

                # If not found by username, try by register number
                if not user:
                    resolved_class_room_id = None
                    if class_room_id:
                        resolved_class_room_id = class_room_id
                    elif class_room_name:
                        cr = ClassRoom.query.filter_by(
                            class_room_name=class_room_name).first()
                        resolved_class_room_id = cr.class_room_id if cr else None

                    if not resolved_class_room_id:
                        # If no class provided, treat as not existing (cannot validate without context)
                        return jsonify({"exists": False}), 200

                    user = (
                        User.query.filter_by(
                            register_number=str(message),
                            class_room_id=resolved_class_room_id,
                            role="student",
                        ).first()
                    )
            elif role == "staff" or role == "admin":
                user = User.query.filter_by(username=message).first()
            else:
                # If no role specified or role is unknown, try to find user by username or email regardless of role
                user = User.query.filter_by(username=message).first()

                # If still not found, try by email (for staff/admin)
                if not user:
                    user = User.query.filter_by(email=message.lower()).first()

            if user:
                # Check if this is a demo user
                is_demo_user = "demo" in user.username.lower()

                # Return user's actual role
                response_data = {
                    "exists": True,
                    "role": user.role,
                    "is_demo": is_demo_user
                }

                if user.role == "student":
                    # Get upcoming exams
                    from datetime import datetime
                    from models.associations import student_exam
                    from models.exam import Exam
                    from models import is_permission_active

                    # Check if student can view dashboard
                    can_view_dashboard = is_permission_active(
                        "students_can_view_dashboard")
                    response_data["can_view_dashboard"] = can_view_dashboard

                    if is_demo_user:
                        # Demo users get active, non-finished, non-past exams
                        upcoming_exams = Exam.query.filter(
                            Exam.is_active == True,
                            Exam.is_finished == False,
                            db.or_(
                                Exam.is_on_the_go == True,
                                Exam.date >= datetime.utcnow().date(),
                            )
                        ).order_by(Exam.date.desc()).all()
                    else:
                        # Regular students get only their class exams that are upcoming, active, and not finished
                        upcoming_exams = Exam.query.filter(
                            Exam.date >= datetime.utcnow().date(),
                            Exam.class_room_id == user.class_room_id,
                            Exam.is_active == True,
                            Exam.is_finished == False
                        ).all()

                    # Convert to serializable format
                    exams_data = []
                    for exam in upcoming_exams:
                        exam_data = {
                            "id": exam.id,
                            "name": exam.name,
                            "exam_type": exam.exam_type,
                            "date": exam.date.strftime("%Y-%m-%d") if exam.date else None,
                            "date_formatted": exam.date.strftime("%B %d, %Y") if exam.date else None,
                            "class_room_id": exam.class_room.class_room_id if exam.class_room else None,
                            "class_room_name": exam.class_room.class_room_name if exam.class_room else "N/A",
                            "subject_name": exam.subject.subject_name if exam.subject else "N/A",
                            "subject_icon_name": exam.subject.icon_name if exam.subject else "book",
                            "is_on_the_go": exam.is_on_the_go if hasattr(exam, 'is_on_the_go') else False
                        }
                        exams_data.append(exam_data)

                    # Fetch available OnTheGoTest records
                    from models.on_the_go_test import OnTheGoTest, student_on_the_go_test
                    otg_query = OnTheGoTest.query.filter(
                        OnTheGoTest.is_active == True,
                        OnTheGoTest.is_finished == False,
                    )
                    if not is_demo_user and user.class_room_id:
                        otg_query = otg_query.filter(
                            db.or_(
                                OnTheGoTest.class_room_id == user.class_room_id,
                                OnTheGoTest.class_room_id.is_(None),
                            )
                        )
                    available_otg = otg_query.all()

                    # Exclude already-completed ones
                    completed_otg_ids = set()
                    if not is_demo_user:
                        comp_result = db.session.execute(
                            db.select(student_on_the_go_test.c.on_the_go_test_id).where(
                                student_on_the_go_test.c.student_id == user.id
                            )
                        ).scalars().all()
                        completed_otg_ids = set(comp_result)

                    for test in available_otg:
                        if test.id not in completed_otg_ids:
                            otg_data = {
                                "id": test.id,
                                "name": test.title,
                                "exam_type": "On-The-Go",
                                "date": None,
                                "date_formatted": "Quick Test",
                                "class_room_id": test.class_room_id,
                                "class_room_name": test.class_room.class_room_name if test.class_room else "All Classes",
                                "subject_name": test.subject.subject_name if test.subject else "N/A",
                                "subject_icon_name": test.subject.icon_name if test.subject else "book",
                                "is_on_the_go": True
                            }
                            exams_data.append(otg_data)

                    response_data["upcoming_exams"] = exams_data

                    # Check if student has completed a specific exam/test (if requested)
                    check_exam_completion = data.get("check_exam_completion")
                    if check_exam_completion:
                        if is_demo_user:
                            response_data["exam_completed"] = False
                        else:
                            # Check regular exam completion first
                            from models.on_the_go_test import student_on_the_go_test
                            completion = db.session.execute(
                                db.select(student_exam).where(
                                    student_exam.c.student_id == user.id,
                                    student_exam.c.exam_id == check_exam_completion
                                )
                            ).fetchone()

                            if completion:
                                response_data["exam_completed"] = True
                                response_data["message"] = "You have already completed this exam"
                            else:
                                # Check OTG test completion
                                otg_completion = db.session.execute(
                                    db.select(student_on_the_go_test).where(
                                        student_on_the_go_test.c.student_id == user.id,
                                        student_on_the_go_test.c.on_the_go_test_id == check_exam_completion
                                    )
                                ).fetchone()

                                if otg_completion:
                                    response_data["exam_completed"] = True
                                    response_data["message"] = "You have already completed this test"
                                else:
                                    response_data["exam_completed"] = False

                return jsonify(response_data), 200

            return jsonify({"exists": False}), 200
        except Exception:
            return jsonify({"error": "An unexpected error occurred"}), 500

    @app.route("/forgot_password", methods=["GET", "POST"])
    @rate_limit(max_requests=5, window=60, methods=["POST"])
    def forgot_password():
        if request.method == "GET":
            # Get school info for the forgot password page
            from models.school import School
            school_info = School.query.first()

            return render_template("auth/forgot_password.html", school_info=school_info)

        if request.method == "POST":
            try:
                data = request.get_json()
                username_or_email = data.get("usernameOrEmail")
                new_password = data.get("newPassword")
                confirm_password = data.get("confirmPassword")

                # Validate required fields
                if not username_or_email or not new_password or not confirm_password:
                    return jsonify({"error": "Username/Email, new password, and confirm password are required"}), 400

                # Validate password strength
                if len(new_password) < 4:
                    return jsonify({"error": "Password must be at least 4 characters long"}), 400

                # Validate password match
                if new_password != confirm_password:
                    return jsonify({"error": "New password and confirm password do not match"}), 400

                # Find user by username or email
                user = User.query.filter(
                    db.or_(
                        User.username == username_or_email,
                        User.email == username_or_email.lower()
                    )
                ).first()

                if not user:
                    return jsonify({"error": "User not found"}), 404

                # Update password
                user.set_password(new_password)
                db.session.commit()

                # print(f"Password reset successful for user: {user.username}")
                return jsonify({"success": True, "message": "Password reset successfully"}), 200

            except Exception as e:
                db.session.rollback()
                # print("Error resetting password:", e)
                return jsonify({"error": "Failed to reset password"}), 500
