"""On-The-Go test routes — admin CRUD + student endpoints."""

from datetime import datetime, timedelta
from functools import wraps

from flask import jsonify, render_template, request, session
from sqlalchemy import and_

from models import User, db, is_permission_active
from models.on_the_go_test import OnTheGoTest, OnTheGoResult, OnTheGoTestSession, student_on_the_go_test
from models.question import Question, Option
from models.subject import Subject
from models.class_room import ClassRoom
from models.school import School
from models.grade_scale import GradeScale
from models.associations import student_subject


# ─── Decorators ───────────────────────────────────────────────────────

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"success": False, "message": "Not authenticated"}), 401
        user = User.query.get(session["user_id"])
        if not user or user.role != "admin":
            return jsonify({"success": False, "message": "Admin privileges required"}), 403
        return f(*args, **kwargs)
    return decorated_function


def staff_or_admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"success": False, "message": "Not authenticated"}), 401
        user = User.query.get(session["user_id"])
        if not user or user.role not in ("admin", "staff"):
            return jsonify({"success": False, "message": "Staff or admin privileges required"}), 403
        return f(*args, **kwargs)
    return decorated_function


def student_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"success": False, "message": "Not authenticated"}), 401
        user = User.query.get(session["user_id"])
        if not user or user.role != "student":
            return jsonify({"success": False, "message": "Student access required"}), 403
        return f(*args, **kwargs)
    return decorated_function


def check_otg_enabled(f):
    """Global toggle check — On-The-Go must be enabled in settings."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not is_permission_active("cbt_on_the_go_enabled"):
            return jsonify({"success": False, "message": "On-The-Go tests are disabled by the administrator"}), 403
        return f(*args, **kwargs)
    return decorated_function


# ─── Grade helper ─────────────────────────────────────────────────────

def compute_grade(score_percentage):
    """Compute letter grade using school's default scale, with fallback."""
    school = School.query.first()
    if school:
        grade_scale = GradeScale.query.filter_by(
            school_id=school.school_id, is_active=True, is_default=True
        ).first()
        if grade_scale:
            letter_grade, _ = grade_scale.get_grade_for_percentage(score_percentage)
            return letter_grade
    # Fallback
    if score_percentage >= 70:
        return 'A'
    elif score_percentage >= 60:
        return 'B'
    elif score_percentage >= 50:
        return 'C'
    elif score_percentage >= 40:
        return 'D'
    else:
        return 'F'


# ─── Route registration ───────────────────────────────────────────────

def on_the_go_route(app):

    # ═══════════════════════════════════════════════════════════════════
    # ADMIN ROUTES
    # ═══════════════════════════════════════════════════════════════════

    @app.route("/admin/on-the-go-tests")
    @admin_required
    def on_the_go_management():
        """Render the admin management page for On-The-Go tests."""
        user = User.query.get(session["user_id"])
        subjects = Subject.query.order_by(Subject.subject_name).all()
        classes = ClassRoom.query.filter_by(is_active=True).order_by(ClassRoom.class_room_name).all()
        return render_template(
            "admin/on_the_go_tests.html",
            current_user=user,
            subjects=subjects,
            classes=classes,
        )

    # ─── API: List tests ─────────────────────────────────────────────

    @app.route("/api/admin/on-the-go-tests")
    @admin_required
    @check_otg_enabled
    def api_list_on_the_go_tests():
        """Return all On-The-Go tests with submission counts."""
        status = request.args.get("status", "all")  # active | finished | all
        query = OnTheGoTest.query.order_by(OnTheGoTest.created_at.desc())

        if status == "active":
            query = query.filter_by(is_active=True, is_finished=False)
        elif status == "finished":
            query = query.filter_by(is_finished=True)

        tests = query.all()
        result = []
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        for t in tests:
            d = t.to_dict()
            from sqlalchemy import func
            # Total submissions across all time
            total_count = db.session.execute(
                db.select(func.count()).select_from(student_on_the_go_test)
                .where(student_on_the_go_test.c.on_the_go_test_id == t.id)
            ).scalar()
            d["total_submissions"] = total_count or 0
            # Submissions completed today
            today_count = db.session.execute(
                db.select(func.count()).select_from(student_on_the_go_test)
                .where(
                    student_on_the_go_test.c.on_the_go_test_id == t.id,
                    student_on_the_go_test.c.completed_at >= today_start,
                )
            ).scalar()
            d["taken_today"] = today_count or 0
            result.append(d)

        return jsonify({"success": True, "tests": result, "total": len(result)})

    # ─── API: Get available subjects/classes with question counts ────

    @app.route("/api/admin/on-the-go-tests/subjects")
    @admin_required
    def api_otg_subjects():
        """Return subjects with class + question count for the creation form."""
        subjects = Subject.query.order_by(Subject.subject_name).all()
        data = []
        for s in subjects:
            q_count = Question.query.filter_by(subject_id=s.subject_id).count()
            data.append({
                "subject_id": s.subject_id,
                "subject_name": s.subject_name,
                "icon_name": s.icon_name or "book",
                "question_count": q_count,
            })
        return jsonify({"success": True, "subjects": data})

    @app.route("/api/admin/on-the-go-tests/classes-by-subject/<subject_id>")
    @admin_required
    def api_otg_classes_by_subject(subject_id):
        """Return classes offering the given subject, with question counts."""
        from models.associations import class_subject
        class_ids = db.session.execute(
            db.select(class_subject.c.class_room_id).where(class_subject.c.subject_id == subject_id)
        ).scalars().all()

        classes = ClassRoom.query.filter(
            ClassRoom.class_room_id.in_(class_ids), ClassRoom.is_active == True
        ).all()

        data = []
        for c in classes:
            q_count = Question.query.filter_by(
                subject_id=subject_id, class_room_id=c.class_room_id
            ).count()
            data.append({
                "class_room_id": c.class_room_id,
                "class_room_name": c.class_room_name,
                "question_count": q_count,
            })
        return jsonify({"success": True, "classes": data})

    @app.route("/api/admin/on-the-go-tests/question-count")
    @admin_required
    def api_otg_question_count():
        """Return available question count for subject + optional class."""
        subject_id = request.args.get("subject_id")
        class_room_id = request.args.get("class_room_id")
        if not subject_id:
            return jsonify({"success": False, "message": "subject_id is required"}), 400

        query = Question.query.filter_by(subject_id=subject_id)
        if class_room_id:
            query = query.filter_by(class_room_id=class_room_id)
        count = query.count()
        return jsonify({"success": True, "question_count": count})

    # ─── API: Create test ────────────────────────────────────────────

    @app.route("/api/admin/on-the-go-tests", methods=["POST"])
    @admin_required
    @check_otg_enabled
    def api_create_on_the_go_test():
        """Create a new On-The-Go test."""
        try:
            data = request.get_json()
            if not data:
                return jsonify({"success": False, "message": "No data provided"}), 400

            # ── Validation ───────────────────────────────────────────
            title = (data.get("title") or "").strip()
            if not title:
                return jsonify({"success": False, "message": "Test title is required"}), 400
            if len(title) > 200:
                return jsonify({"success": False, "message": "Title must be 200 characters or fewer"}), 400

            subject_id = data.get("subject_id")
            if not subject_id:
                return jsonify({"success": False, "message": "Subject is required"}), 400
            subject = Subject.query.get(subject_id)
            if not subject:
                return jsonify({"success": False, "message": "Invalid subject"}), 400

            class_room_id = data.get("class_room_id") or None
            if class_room_id:
                class_room = ClassRoom.query.get(class_room_id)
                if not class_room:
                    return jsonify({"success": False, "message": "Invalid class"}), 400

            # Duration
            hours = int(data.get("duration_hours", 0) or 0)
            minutes = int(data.get("duration_minutes", 0) or 0)
            if hours == 0 and minutes == 0:
                return jsonify({"success": False, "message": "Duration is required"}), 400
            duration = timedelta(hours=hours, minutes=minutes)

            # Question count validation (parse before max_score for auto-compute)
            number_of_questions = data.get("number_of_questions")
            if number_of_questions:
                number_of_questions = int(number_of_questions)
                query = Question.query.filter_by(subject_id=subject_id)
                if class_room_id:
                    query = query.filter_by(class_room_id=class_room_id)
                available = query.count()
                if number_of_questions > available:
                    return jsonify({
                        "success": False,
                        "message": f"Only {available} questions available for this subject" + (f" in {class_room.class_room_name}" if class_room_id else "")
                    }), 400
            else:
                number_of_questions = None

            # Max score — auto-compute if not provided
            max_score = data.get("max_score")
            if not max_score or float(max_score) <= 0:
                if number_of_questions:
                    max_score = float(number_of_questions)
                else:
                    query = Question.query.filter_by(subject_id=subject_id)
                    if class_room_id:
                        query = query.filter_by(class_room_id=class_room_id)
                    max_score = float(query.count())
            else:
                max_score = float(max_score)

            # Access code
            access_code = data.get("access_code") or None
            if access_code and len(access_code) > 10:
                return jsonify({"success": False, "message": "Access code must be 10 characters or fewer"}), 400

            # ── Create test ──────────────────────────────────────────
            test = OnTheGoTest(
                title=title,
                description=data.get("description", ""),
                instructions=data.get("instructions"),
                subject_id=subject_id,
                class_room_id=class_room_id,
                duration=duration,
                max_score=max_score,
                number_of_questions=number_of_questions,
                calculator_enabled=data.get("calculator_enabled", False),
                show_feedback=data.get("show_feedback", True),
                save_after_completion=data.get("save_after_completion", True),
                access_code=access_code,
                is_active=data.get("is_active", True),
                is_finished=False,
                created_by_id=session["user_id"],
            )
            db.session.add(test)
            db.session.commit()

            return jsonify({
                "success": True,
                "message": "On-The-Go test created successfully",
                "test": test.to_dict()
            }), 201

        except Exception as e:
            db.session.rollback()
            return jsonify({"success": False, "message": f"Error creating test: {str(e)}"}), 500

    # ─── API: Get single test ────────────────────────────────────────

    @app.route("/api/admin/on-the-go-tests/<test_id>")
    @admin_required
    def api_get_on_the_go_test(test_id):
        """Return a single On-The-Go test."""
        test = OnTheGoTest.query.get(test_id)
        if not test:
            return jsonify({"success": False, "message": "Test not found"}), 404
        return jsonify({"success": True, "test": test.to_dict()})

    # ─── API: Update test ────────────────────────────────────────────

    @app.route("/api/admin/on-the-go-tests/<test_id>", methods=["PUT"])
    @admin_required
    @check_otg_enabled
    def api_update_on_the_go_test(test_id):
        """Update an On-The-Go test."""
        try:
            test = OnTheGoTest.query.get(test_id)
            if not test:
                return jsonify({"success": False, "message": "Test not found"}), 404

            data = request.get_json()
            if not data:
                return jsonify({"success": False, "message": "No data provided"}), 400

            # Check if any submissions exist — prohibit changing save_after_completion
            from sqlalchemy import func
            submission_count = db.session.execute(
                db.select(func.count()).select_from(student_on_the_go_test)
                .where(student_on_the_go_test.c.on_the_go_test_id == test_id)
            ).scalar()

            if submission_count and submission_count > 0 and "save_after_completion" in data:
                return jsonify({
                    "success": False,
                    "message": "Cannot change 'save_after_completion' after students have submitted"
                }), 422

            # Update fields
            if "title" in data:
                test.title = data["title"]
            if "description" in data:
                test.description = data.get("description", "")
            if "instructions" in data:
                test.instructions = data.get("instructions")
            if "duration_hours" in data or "duration_minutes" in data:
                hours = int(data.get("duration_hours", test.duration.seconds // 3600 if test.duration else 0))
                minutes = int(data.get("duration_minutes", (test.duration.seconds % 3600) // 60 if test.duration else 0))
                test.duration = timedelta(hours=hours, minutes=minutes)
            if "number_of_questions" in data:
                val = data["number_of_questions"]
                test.number_of_questions = int(val) if val else None
            if "max_score" in data:
                val = data["max_score"]
                if val and float(val) > 0:
                    test.max_score = float(val)
                else:
                    # Auto-compute
                    if test.number_of_questions:
                        test.max_score = float(test.number_of_questions)
                    else:
                        from sqlalchemy import func
                        q = Question.query.filter_by(subject_id=test.subject_id)
                        if test.class_room_id:
                            q = q.filter_by(class_room_id=test.class_room_id)
                        test.max_score = float(q.count())
            if "calculator_enabled" in data:
                test.calculator_enabled = data["calculator_enabled"]
            if "show_feedback" in data:
                test.show_feedback = data["show_feedback"]
            if "access_code" in data:
                test.access_code = data["access_code"] or None

            db.session.commit()

            return jsonify({"success": True, "message": "Test updated successfully", "test": test.to_dict()})

        except Exception as e:
            db.session.rollback()
            return jsonify({"success": False, "message": f"Error updating test: {str(e)}"}), 500

    # ─── API: Delete test ────────────────────────────────────────────

    @app.route("/api/admin/on-the-go-tests/<test_id>", methods=["DELETE"])
    @admin_required
    def api_delete_on_the_go_test(test_id):
        """Delete an On-The-Go test and cascade all related data."""
        try:
            data = request.get_json(silent=True) or {}
            delete_questions = data.get("delete_questions", False)

            test = OnTheGoTest.query.get(test_id)
            if not test:
                return jsonify({"success": False, "message": "Test not found"}), 404

            # Count related data for the message
            from sqlalchemy import func
            result_count = OnTheGoResult.query.filter_by(on_the_go_test_id=test_id).count()
            session_count = OnTheGoTestSession.query.filter_by(on_the_go_test_id=test_id).count()

            deleted_questions = 0
            if delete_questions:
                query = Question.query.filter_by(subject_id=test.subject_id)
                if test.class_room_id:
                    query = query.filter_by(class_room_id=test.class_room_id)
                question_ids = [q.id for q in query.all()]

                if question_ids:
                    Option.query.filter(
                        Option.question_id.in_(question_ids)
                    ).delete(synchronize_session='fetch')
                    deleted_questions = Question.query.filter(
                        Question.id.in_(question_ids)
                    ).delete(synchronize_session='fetch')
                    db.session.flush()

            db.session.delete(test)
            db.session.commit()

            msg = "Test deleted"
            parts = []
            if delete_questions:
                parts.append(f"{deleted_questions} question(s) deleted")
            if result_count:
                parts.append(f"{result_count} student record(s) removed")
            if session_count:
                parts.append(f"{session_count} session(s) cleaned up")
            if parts:
                msg += f" ({', '.join(parts)})"

            return jsonify({
                "success": True,
                "message": msg
            })

        except Exception as e:
            db.session.rollback()
            return jsonify({"success": False, "message": f"Error deleting test: {str(e)}"}), 500

    # ─── API: Activate/Pause test ────────────────────────────────────

    @app.route("/api/admin/on-the-go-tests/<test_id>/toggle-active", methods=["POST"])
    @admin_required
    @check_otg_enabled
    def api_toggle_active_on_the_go_test(test_id):
        """Toggle is_active for a test (activate/pause)."""
        test = OnTheGoTest.query.get(test_id)
        if not test:
            return jsonify({"success": False, "message": "Test not found"}), 404
        if test.is_finished:
            return jsonify({"success": False, "message": "Cannot toggle a finished test"}), 422

        test.is_active = not test.is_active
        db.session.commit()

        status = "activated" if test.is_active else "paused"
        return jsonify({"success": True, "message": f"Test {status}", "is_active": test.is_active})

    # ─── API: Finish test ────────────────────────────────────────────

    @app.route("/api/admin/on-the-go-tests/<test_id>/finish", methods=["POST"])
    @admin_required
    @check_otg_enabled
    def api_finish_on_the_go_test(test_id):
        """Mark a test as finished (permanent — no more attempts)."""
        test = OnTheGoTest.query.get(test_id)
        if not test:
            return jsonify({"success": False, "message": "Test not found"}), 404

        test.is_finished = True
        test.is_active = False
        db.session.commit()

        return jsonify({"success": True, "message": "Test finished"})

    # ─── API: Results ─────────────────────────────────────────────────

    @app.route("/api/admin/on-the-go-tests/<test_id>/results")
    @admin_required
    def api_on_the_go_test_results(test_id):
        """Return aggregated results for a test."""
        test = OnTheGoTest.query.get(test_id)
        if not test:
            return jsonify({"success": False, "message": "Test not found"}), 404

        # Get completions
        completions = db.session.execute(
            db.select(
                student_on_the_go_test.c.student_id,
                student_on_the_go_test.c.score,
                student_on_the_go_test.c.completed_at,
                student_on_the_go_test.c.time_taken,
            ).where(student_on_the_go_test.c.on_the_go_test_id == test_id)
        ).fetchall()

        results_data = []
        for comp in completions:
            student = User.query.get(comp.student_id)
            results_data.append({
                "student_id": comp.student_id,
                "student_name": student.full_name() if student else "Unknown",
                "score": comp.score,
                "completed_at": comp.completed_at.strftime("%Y-%m-%d %H:%M:%S") if comp.completed_at else None,
                "time_taken": comp.time_taken,
            })

        # Full result details only if saved
        detailed_results = []
        if test.save_after_completion:
            records = OnTheGoResult.query.filter_by(on_the_go_test_id=test_id).all()
            detailed_results = [r.to_dict() for r in records]

        total_takers = len(results_data)
        scores = [r["score"] for r in results_data if r["score"] is not None]
        average_score = round(sum(scores) / len(scores), 1) if scores else 0

        return jsonify({
            "success": True,
            "test_id": test_id,
            "title": test.title,
            "save_after_completion": test.save_after_completion,
            "total_takers": total_takers,
            "average_score": average_score,
            "results": results_data,
            "detailed_results": detailed_results,
        })

    # ═══════════════════════════════════════════════════════════════════
    # STUDENT ROUTES
    # ═══════════════════════════════════════════════════════════════════

    @app.route("/api/student/on-the-go-tests")
    @student_required
    @check_otg_enabled
    def api_student_list_on_the_go_tests():
        """Return available On-The-Go tests for the current student."""
        current_user = User.query.get(session["user_id"])
        is_demo_user = "demo" in current_user.username.lower()

        query = OnTheGoTest.query.filter(
            OnTheGoTest.is_active == True,
            OnTheGoTest.is_finished == False,
        )

        if not is_demo_user:
            # Filter by enrolled subjects
            enrolled_ids = db.session.execute(
                db.select(student_subject.c.subject_id).where(
                    student_subject.c.student_id == current_user.id
                )
            ).scalars().all()

            if enrolled_ids:
                query = query.filter(OnTheGoTest.subject_id.in_(enrolled_ids))

            # Class filter: null = all classes, otherwise match student's class
            query = query.filter(
                db.or_(
                    OnTheGoTest.class_room_id.is_(None),
                    OnTheGoTest.class_room_id == current_user.class_room_id,
                )
            )

        # Exclude completed
        completed_ids = db.session.execute(
            db.select(student_on_the_go_test.c.on_the_go_test_id)
            .where(student_on_the_go_test.c.student_id == current_user.id)
        ).scalars().all()

        if completed_ids:
            query = query.filter(~OnTheGoTest.id.in_(completed_ids))

        tests = query.order_by(OnTheGoTest.created_at.desc()).all()

        result = []
        for t in tests:
            d = t.to_dict()
            d["subject_icon"] = t.subject.icon_name if t.subject else "bolt"
            result.append(d)

        return jsonify({"success": True, "tests": result, "total": len(result)})

    @app.route("/api/student/on-the-go-tests/<test_id>/verify-access", methods=["POST"])
    @student_required
    @check_otg_enabled
    def api_verify_otg_access(test_id):
        """Verify access code for an On-The-Go test."""
        test = OnTheGoTest.query.get(test_id)
        if not test:
            return jsonify({"success": False, "message": "Test not found"}), 404

        if not test.access_code:
            # No code required — auto-verify
            session[f"otg_access_verified_{test_id}"] = True
            return jsonify({"success": True, "message": "Access granted"})

        data = request.get_json()
        if not data or data.get("access_code") != test.access_code:
            return jsonify({"success": False, "message": "Invalid access code"}), 403

        session[f"otg_access_verified_{test_id}"] = True
        return jsonify({"success": True, "message": "Access granted"})

    @app.route("/student/on-the-go-tests/<test_id>/start")
    @student_required
    @check_otg_enabled
    def student_start_on_the_go_test(test_id):
        """Start an On-The-Go test — renders the CBT test page."""
        current_user = User.query.get(session["user_id"])
        test = OnTheGoTest.query.get(test_id)

        if not test:
            return jsonify({"success": False, "message": "Test not found"}), 404

        if not test.is_active or test.is_finished:
            return jsonify({"success": False, "message": "This test is no longer available"}), 403

        # Check not already completed
        existing = db.session.execute(
            db.select(student_on_the_go_test).where(
                student_on_the_go_test.c.student_id == current_user.id,
                student_on_the_go_test.c.on_the_go_test_id == test_id,
            )
        ).first()
        if existing:
            return jsonify({"success": False, "message": "You have already completed this test"}), 409

        # Check existing active session
        existing_session = OnTheGoTestSession.query.filter_by(
            student_id=current_user.id,
            on_the_go_test_id=test_id,
            is_active=True,
            is_completed=False
        ).first()
        if existing_session:
            session["current_otg_test_id"] = test_id
            return render_template(
                "student/cbt_test.html",
                exam=test,  # Pass as exam for template compatibility
                current_user=current_user,
                is_on_the_go=True,
            )

        # Create new session
        import random
        from models.question import Question

        # Get questions
        query = Question.query.filter_by(subject_id=test.subject_id)
        if test.class_room_id:
            query = query.filter_by(class_room_id=test.class_room_id)
        questions = query.all()

        if test.number_of_questions and test.number_of_questions < len(questions):
            questions = random.sample(questions, test.number_of_questions)
        random.shuffle(questions)

        # Create session with question order
        new_session = OnTheGoTestSession(
            student_id=current_user.id,
            on_the_go_test_id=test_id,
            current_question_index=0,
            time_remaining=test.duration.seconds if test.duration else 0,
            answers='{}',
        )
        new_session.set_question_order([q.id for q in questions])
        db.session.add(new_session)
        db.session.commit()

        session["current_otg_test_id"] = test_id

        return render_template(
            "student/cbt_test.html",
            exam=test,
            current_user=current_user,
            is_on_the_go=True,
        )

    @app.route("/api/student/on-the-go-tests/<test_id>/questions")
    @student_required
    @check_otg_enabled
    def api_otg_test_questions(test_id):
        """Return randomised questions for an On-The-Go test."""
        current_user = User.query.get(session["user_id"])
        test = OnTheGoTest.query.get(test_id)

        if not test:
            return jsonify({"success": False, "message": "Test not found"}), 404

        # Get or create session
        otg_session = OnTheGoTestSession.query.filter_by(
            student_id=current_user.id,
            on_the_go_test_id=test_id,
            is_active=True,
            is_completed=False
        ).first()

        if not otg_session:
            return jsonify({"success": False, "message": "No active session. Please start the test first."}), 404

        # Get questions from session's question_order or fetch fresh
        question_ids = otg_session.get_question_order()
        if question_ids:
            from models.question import Question
            from sqlalchemy import case
            # Preserve order
            order = case({qid: idx for idx, qid in enumerate(question_ids)}, value=Question.id)
            questions = Question.query.filter(Question.id.in_(question_ids)).order_by(order).all()
        else:
            return jsonify({"success": False, "message": "No questions configured for this test"}), 404

        # Format questions (same shape as regular exam questions)
        questions_data = []
        for q in questions:
            options = [{"id": o.id, "text": o.text} for o in q.options] if q.options else []
            questions_data.append({
                "id": q.id,
                "question_text": q.question_text,
                "options": options,
                "question_type": getattr(q, "question_type", "objective"),
            })

        return jsonify({
            "success": True,
            "questions": questions_data,
            "total_questions": len(questions_data),
            "time_remaining": otg_session.time_remaining,
        })

    @app.route("/api/student/on-the-go-tests/<test_id>/submit", methods=["POST"])
    @student_required
    @check_otg_enabled
    def api_submit_otg_test(test_id):
        """Submit answers for an On-The-Go test."""
        try:
            current_user = User.query.get(session["user_id"])
            test = OnTheGoTest.query.get(test_id)

            if not test:
                return jsonify({"success": False, "message": "Test not found"}), 404

            # Check not already completed
            existing = db.session.execute(
                db.select(student_on_the_go_test).where(
                    student_on_the_go_test.c.student_id == current_user.id,
                    student_on_the_go_test.c.on_the_go_test_id == test_id,
                )
            ).first()
            if existing:
                return jsonify({"success": False, "message": "You have already completed this test"}), 409

            data = request.get_json()
            answers = data.get("answers", {}) if data else {}

            # Get session
            otg_session = OnTheGoTestSession.query.filter_by(
                student_id=current_user.id,
                on_the_go_test_id=test_id,
                is_active=True,
                is_completed=False
            ).first()

            if not otg_session:
                return jsonify({"success": False, "message": "No active session"}), 404

            # Get questions
            question_ids = otg_session.get_question_order()
            from models.question import Question
            questions = Question.query.filter(Question.id.in_(question_ids)).all() if question_ids else []
            questions_map = {q.id: q for q in questions}

            # Calculate score
            correct_answers = 0
            total_questions = len(question_ids)
            question_results = []

            for qid in question_ids:
                question = questions_map.get(qid)
                user_answer = answers.get(qid)
                is_correct = False

                if question and user_answer:
                    # Find the correct option
                    correct_option = None
                    if question.options:
                        for opt in question.options:
                            if opt.is_correct:
                                correct_option = opt
                                break
                    is_correct = correct_option and user_answer == correct_option.id

                if is_correct:
                    correct_answers += 1

                if test.show_feedback:
                    correct_option_id = None
                    if question and question.options:
                        for opt in question.options:
                            if opt.is_correct:
                                correct_option_id = opt.id
                                break
                    question_results.append({
                        "question_id": qid,
                        "user_answer": user_answer,
                        "is_correct": is_correct,
                        "correct_answer_id": correct_option_id,
                    })

            score_percentage = round((correct_answers / total_questions * 100), 2) if total_questions > 0 else 0
            raw_score = round((correct_answers / total_questions) * test.max_score, 2) if total_questions > 0 else 0
            letter_grade = compute_grade(score_percentage)
            time_taken = None
            if otg_session.started_at:
                time_taken = int((datetime.utcnow() - otg_session.started_at).total_seconds())

            # Always write completion lock
            import json as json_module
            db.session.execute(
                student_on_the_go_test.insert().values(
                    student_id=current_user.id,
                    on_the_go_test_id=test_id,
                    score=float(raw_score),
                    completed_at=datetime.utcnow(),
                    time_taken=time_taken,
                )
            )

            # Conditionally write full result
            results_saved = False
            if test.save_after_completion:
                result_record = OnTheGoResult(
                    on_the_go_test_id=test_id,
                    student_id=current_user.id,
                    correct_answers=correct_answers,
                    total_questions=total_questions,
                    score_percentage=score_percentage,
                    raw_score=raw_score,
                    max_score=test.max_score,
                    letter_grade=letter_grade,
                    started_at=otg_session.started_at or datetime.utcnow(),
                    submitted_at=datetime.utcnow(),
                )
                result_record.set_answers(answers)
                db.session.add(result_record)
                results_saved = True

            # Mark session as completed
            otg_session.is_active = False
            otg_session.is_completed = True
            otg_session.completed_at = datetime.utcnow()
            otg_session.set_answers(answers)

            db.session.commit()

            return jsonify({
                "success": True,
                "show_results": True,
                "results_saved": results_saved,
                "correct_answers": correct_answers,
                "total_questions": total_questions,
                "score_percentage": score_percentage,
                "raw_score": raw_score,
                "max_score": test.max_score,
                "letter_grade": letter_grade,
                "question_results": question_results if test.show_feedback else [],
                "redirect_url": "/student/dashboard",
            })

        except Exception as e:
            db.session.rollback()
            return jsonify({"success": False, "message": f"Error submitting test: {str(e)}"}), 500

    @app.route("/api/student/on-the-go-tests/<test_id>/session/save", methods=["POST"])
    @student_required
    def api_save_otg_session(test_id):
        """Save current progress for an On-The-Go test."""
        current_user = User.query.get(session["user_id"])
        data = request.get_json()

        otg_session = OnTheGoTestSession.query.filter_by(
            student_id=current_user.id,
            on_the_go_test_id=test_id,
            is_active=True,
            is_completed=False
        ).first()

        if not otg_session:
            return jsonify({"success": False, "message": "No active session"}), 404

        if data:
            otg_session.current_question_index = data.get("current_question_index", otg_session.current_question_index)
            otg_session.time_remaining = data.get("time_remaining", otg_session.time_remaining)
            if "answers" in data:
                otg_session.set_answers(data["answers"])

        db.session.commit()
        return jsonify({"success": True, "message": "Progress saved"})

    @app.route("/api/student/on-the-go-tests/<test_id>/session/restore")
    @student_required
    def api_restore_otg_session(test_id):
        """Restore a saved On-The-Go test session."""
        current_user = User.query.get(session["user_id"])

        otg_session = OnTheGoTestSession.query.filter_by(
            student_id=current_user.id,
            on_the_go_test_id=test_id,
            is_active=True,
            is_completed=False
        ).first()

        if not otg_session:
            return jsonify({"success": False, "message": "No saved session found"}), 404

        return jsonify({
            "success": True,
            "session": {
                "current_question_index": otg_session.current_question_index,
                "time_remaining": otg_session.time_remaining,
                "answers": otg_session.get_answers(),
                "question_order": otg_session.get_question_order(),
            }
        })

    @app.route("/api/student/on-the-go-tests/<test_id>/feedback")
    @student_required
    def api_otg_test_feedback(test_id):
        """Return feedback/results for a completed On-The-Go test."""
        current_user = User.query.get(session["user_id"])
        test = OnTheGoTest.query.get(test_id)

        if not test:
            return jsonify({"success": False, "message": "Test not found"}), 404

        # Get completion row
        completion = db.session.execute(
            db.select(student_on_the_go_test).where(
                student_on_the_go_test.c.student_id == current_user.id,
                student_on_the_go_test.c.on_the_go_test_id == test_id,
            )
        ).first()

        if not completion:
            return jsonify({"success": False, "message": "You have not taken this test"}), 404

        result = {
            "score": completion.score,
            "completed_at": completion.completed_at.strftime("%Y-%m-%d %H:%M:%S") if completion.completed_at else None,
            "time_taken": completion.time_taken,
        }

        # Detailed results only if saved
        if test.save_after_completion:
            record = OnTheGoResult.query.filter_by(
                on_the_go_test_id=test_id,
                student_id=current_user.id,
            ).first()
            if record:
                result["detailed"] = record.to_dict()

        return jsonify({"success": True, "feedback": result})

    @app.route("/api/student/on-the-go-tests/<test_id>/session/reset", methods=["POST"])
    @student_required
    def api_reset_otg_session(test_id):
        """Invalidate old On-The-Go session when user chooses 'Start Fresh'."""
        current_user = User.query.get(session["user_id"])

        try:
            otg_session = OnTheGoTestSession.query.filter_by(
                student_id=current_user.id,
                on_the_go_test_id=test_id,
                is_active=True,
                is_completed=False
            ).first()

            if otg_session:
                otg_session.is_active = False
                otg_session.is_completed = True
                otg_session.completed_at = datetime.utcnow()
                db.session.commit()

            return jsonify({"success": True})
        except Exception as e:
            db.session.rollback()
            return jsonify({"success": False, "message": "Error resetting session"}), 500
