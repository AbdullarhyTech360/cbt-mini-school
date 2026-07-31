from flask import render_template, redirect, url_for, session, flash, jsonify, request
from models import db, User
from models.exam import Exam
from models.exam_session import ExamSession
from models.question import Question, Option
from models.subject import Subject
from models.school_term import SchoolTerm
from models.permissions import Permission
from models.grade_scale import GradeScale
from models.associations import student_subject, student_exam, class_subject
from models.student import Student
from models.class_room import ClassRoom
from datetime import datetime
import random
import os


def check_student_exam_access(current_user, exam, exam_id):
    """
    Check if a student has access to an exam (enrollment + completion check).
    Handles auto-enrollment for class subjects.
    
    Returns:
        dict: {
            'success': bool,
            'is_demo_user': bool,
            'enrolled': bool,
            'already_completed': bool,
            'error_message': str or None
        }
    """
    is_demo_user = "demo" in current_user.username.lower()

    if is_demo_user:
        return {
            'success': True,
            'is_demo_user': True,
            'enrolled': True,
            'already_completed': False,
            'error_message': None
        }

    # Check enrollment in the exam's subject
    enrollment = db.session.execute(
        db.select(student_subject).where(
            student_subject.c.student_id == current_user.id,
            student_subject.c.subject_id == exam.subject_id
        )
    ).fetchone()

    if not enrollment:
        # Check if subject is assigned to student's class
        is_class_subject = db.session.execute(
            db.select(class_subject).where(
                class_subject.c.class_room_id == current_user.class_room_id,
                class_subject.c.subject_id == exam.subject_id
            )
        ).fetchone()

        if is_class_subject:
            # Auto-enroll student
            print(f"DEBUG: Auto-enrolling student {current_user.username} in subject {exam.subject_id}")
            stmt = student_subject.insert().values(
                student_id=current_user.id,
                subject_id=exam.subject_id
            )
            db.session.execute(stmt)
            db.session.commit()
        else:
            return {
                'success': False,
                'is_demo_user': False,
                'enrolled': False,
                'already_completed': False,
                'error_message': 'You are not enrolled in this subject'
            }

    # Check if student has already completed this exam
    completion = db.session.execute(
        db.select(student_exam).where(
            student_exam.c.student_id == current_user.id,
            student_exam.c.exam_id == exam_id
        )
    ).fetchone()

    if completion:
        return {
            'success': False,
            'is_demo_user': False,
            'enrolled': True,
            'already_completed': True,
            'error_message': 'You have already completed this exam'
        }

    return {
        'success': True,
        'is_demo_user': False,
        'enrolled': True,
        'already_completed': False,
        'error_message': None
    }


def student_route(app):
    @app.route('/student/profile', methods=['GET', 'POST'])
    def student_profile():
        if 'user_id' not in session:
            return redirect(url_for('login'))

        current_user = User.query.get(session['user_id'])
        if not current_user:
            flash('User not found.', 'error')
            return redirect(url_for('login'))

        # Handle POST - update profile
        if request.method == 'POST':
            try:
                # Handle image upload (multipart form)
                if request.content_type and 'multipart/form-data' in request.content_type:
                    if 'profile_image' in request.files:
                        file = request.files['profile_image']
                        if file and file.filename:
                            from werkzeug.utils import secure_filename
                            import uuid
                            original = secure_filename(file.filename)
                            if original and '.' in original:
                                ext = original.rsplit('.', 1)[1].lower()
                                if ext in ('png', 'jpg', 'jpeg', 'gif', 'webp'):
                                    unique_name = f"{uuid.uuid4().hex}.{ext}"
                                    from utils.paths import get_profile_images_dir
                                    upload_dir = get_profile_images_dir()
                                    file_path = os.path.join(upload_dir, unique_name)
                                    file.save(file_path)
                                    # Delete old image if exists
                                    if current_user.image and current_user.image.startswith('/uploads/'):
                                        old_path = os.path.join(os.path.dirname(upload_dir), current_user.image.lstrip('/'))
                                        if os.path.exists(old_path):
                                            os.remove(old_path)
                                    current_user.image = f"/uploads/profile_images/{unique_name}"
                                    db.session.commit()
                                    return jsonify({"success": True, "message": "Profile image updated", "image_url": current_user.image}), 200
                        return jsonify({"success": False, "message": "No valid image file provided"}), 400

                # Handle JSON (text fields)
                data = request.get_json(silent=True) or {}

                # Update User fields
                if 'first_name' in data and data['first_name']:
                    current_user.first_name = data['first_name'].strip()
                if 'last_name' in data and data['last_name']:
                    current_user.last_name = data['last_name'].strip()
                if 'email' in data:
                    current_user.email = data['email'].strip() if data['email'] else None
                if 'phone' in data:
                    # Update phone on Student model
                    student_profile = current_user.student
                    if student_profile:
                        student_profile.parent_phone = data['phone'].strip() if data['phone'] else None
                    else:
                        student = Student(user_id=current_user.id, parent_phone=data['phone'].strip() if data['phone'] else None)
                        db.session.add(student)
                if 'parent_name' in data:
                    student_profile = current_user.student
                    if student_profile:
                        student_profile.parent_name = data['parent_name'].strip() if data['parent_name'] else None
                if 'address' in data:
                    student_profile = current_user.student
                    if student_profile:
                        student_profile.address = data['address'].strip() if data['address'] else None
                if 'blood_group' in data:
                    student_profile = current_user.student
                    if student_profile:
                        student_profile.blood_group = data['blood_group'].strip() if data['blood_group'] else None

                db.session.commit()
                return jsonify({'success': True, 'message': 'Profile updated successfully'}), 200

            except Exception as e:
                db.session.rollback()
                return jsonify({'success': False, 'message': f'Error updating profile: {str(e)}'}), 500

        # GET - render profile
        student_profile = current_user.student

        # Get enrolled subjects
        enrolled_subject_ids = list(db.session.execute(
            db.select(student_subject.c.subject_id).where(student_subject.c.student_id == current_user.id)
        ).scalars().all())
        enrolled_subjects = Subject.query.filter(Subject.subject_id.in_(enrolled_subject_ids)).all() if enrolled_subject_ids else []

        # Get class info
        class_info = None
        if current_user.class_room_id:
            class_info = ClassRoom.query.get(current_user.class_room_id)

        # Get exam stats
        completed_exam_ids = list(db.session.execute(
            db.select(student_exam.c.exam_id).where(student_exam.c.student_id == current_user.id)
        ).scalars().all())
        completed_exams_count = len(completed_exam_ids)

        # Get average score
        from models.exam_record import ExamRecord
        average_score = 0
        best_score = 0
        if completed_exam_ids:
            records = ExamRecord.query.filter(
                ExamRecord.student_id == current_user.id,
                ExamRecord.exam_id.in_(completed_exam_ids)
            ).all()
            scores = [r.score_percentage for r in records if r.score_percentage is not None]
            if scores:
                average_score = round(sum(scores) / len(scores), 1)
                best_score = max(scores)

        return render_template(
            'student/profile.html',
            current_user=current_user,
            student_profile=student_profile,
            enrolled_subjects=enrolled_subjects,
            class_info=class_info,
            completed_exams_count=completed_exams_count,
            average_score=average_score,
            best_score=best_score,
        )

    @app.route('/student/quiz_instructions')
    def student_instructions():
        # This route is for general quiz instructions without specific exam
        return render_template('student/quiz_instruction.html')

    @app.route('/student/exam/<exam_id>')
    def exam_details(exam_id):
        """Display exam details and instructions before starting"""
        if 'user_id' not in session:
            return redirect(url_for('login'))

        current_user = User.query.get(session['user_id'])
        if not current_user:
            return redirect(url_for('login'))

        exam = Exam.query.get(exam_id)
        if not exam:
            flash('Exam not found', 'error')
            return redirect(url_for('student_dashboard'))

        # Check student exam access (enrollment + completion)
        access = check_student_exam_access(current_user, exam, exam_id)
        if not access['success']:
            flash(access['error_message'], 'error')
            return redirect(url_for('student_dashboard'))

        # Get question count for this exam
        from services.question_service import get_questions_for_exam
        question_count = get_questions_for_exam(
            subject_id=exam.subject_id,
            class_room_id=exam.class_room_id,
            term_id=exam.school_term_id
        ).count()

        # Get additional exam details
        subject = Subject.query.get(exam.subject_id)
        term = SchoolTerm.query.get(
            exam.school_term_id) if exam.school_term_id else None

        return render_template(
            'student/quiz_instruction.html',
            exam=exam,
            question_count=question_count,
            current_user=current_user,
            subject=subject,
            term=term
        )

    @app.route('/student/exam/<exam_id>/feedback')
    def exam_feedback(exam_id):
        """Display exam feedback/results after submission."""
        if 'user_id' not in session:
            return redirect(url_for('login'))

        current_user = User.query.get(session['user_id'])
        if not current_user:
            return redirect(url_for('login'))

        exam = Exam.query.get(exam_id)
        if not exam:
            flash('Exam not found', 'error')
            return redirect(url_for('student_dashboard'))

        # Find the exam record for this student
        from models.exam_record import ExamRecord
        exam_record = ExamRecord.query.filter_by(
            exam_id=exam_id,
            student_id=current_user.id
        ).order_by(ExamRecord.submitted_at.desc()).first()

        if not exam_record:
            flash('No exam record found. Results may not have been saved.', 'error')
            return redirect(url_for('student_dashboard'))

        # Get the questions and build results
        from services.question_service import get_questions_for_exam
        questions = get_questions_for_exam(
            subject_id=exam.subject_id,
            class_room_id=exam.class_room_id,
            term_id=exam.school_term_id
        ).all()

        # Restore question order from exam session so feedback matches quiz order
        completed_session = ExamSession.query.filter_by(
            student_id=current_user.id,
            exam_id=exam_id
        ).order_by(ExamSession.created_at.desc()).first()
        question_order = completed_session.get_question_order() if completed_session else []
        if question_order:
            ordered = {str(q.id): q for q in questions}
            questions = [ordered[qid] for qid in question_order if qid in ordered]
        
        # Parse student answers from exam record
        try:
            student_answers = exam_record.get_answers() if exam_record.answers else {}
        except (ValueError, TypeError):
            student_answers = {}

        question_results = []
        # Batch load selected options
        answer_ids = [
            v for v in student_answers.values()
            if v and isinstance(v, str) and len(v) > 0
        ]
        batch_options = {}
        if answer_ids:
            for opt in Option.query.filter(Option.id.in_(answer_ids)).all():
                batch_options[opt.id] = opt

        correct_count = 0
        incorrect_count = 0
        skipped_count = 0

        for question in questions:
            question_id = question.id
            student_answer = student_answers.get(question_id)
            is_correct = False
            correct_answer_text = ""
            student_answer_text = ""

            if question.question_type in ['mcq', 'multiple_choice', 'true_false']:
                for opt in question.options:
                    if opt.is_correct:
                        correct_answer_text = opt.text
                        break
                if student_answer:
                    selected_option = batch_options.get(student_answer)
                    if selected_option:
                        student_answer_text = selected_option.text
                        if selected_option.is_correct:
                            is_correct = True
            elif question.question_type == 'short_answer':
                correct_answer_text = question.correct_answer or ""
                if student_answer:
                    student_answer_text = student_answer
                    if student_answer.lower().strip() == (question.correct_answer or "").lower().strip():
                        is_correct = True

            if not student_answer:
                skipped_count += 1
            elif is_correct:
                correct_count += 1
            else:
                incorrect_count += 1

            question_results.append({
                "question_id": question_id,
                "question_text": question.question_text,
                "question_type": question.question_type,
                "student_answer_id": student_answer,
                "student_answer_text": student_answer_text,
                "correct_answer_text": correct_answer_text,
                "is_correct": is_correct,
            })

        total_questions = exam_record.total_questions or len(questions)

        # Use scores already computed and stored in the exam record
        raw_score = exam_record.raw_score
        max_score = exam_record.max_score if exam_record.max_score else (exam.max_score or 100)
        score_percentage = exam_record.score_percentage
        letter_grade = exam_record.letter_grade

        # Look up pass mark
        from models.promotion_rule import PromotionRule
        pass_mark = 50
        class_room = current_user.class_room
        if class_room and class_room.section_id and class_room.level is not None:
            from models import School
            school = School.query.first()
            if school:
                rule = PromotionRule.query.filter_by(
                    source_section_id=class_room.section_id,
                    source_level=class_room.level,
                    school_id=school.school_id,
                    is_active=True,
                ).first()
                if rule and rule.min_average is not None:
                    pass_mark = rule.min_average
        passed = score_percentage >= pass_mark if score_percentage is not None else False

        return render_template(
            'student/exam_feedback.html',
            exam=exam,
            question_results=question_results,
            total_questions=total_questions,
            correct_count=correct_count,
            incorrect_count=incorrect_count,
            skipped_count=skipped_count,
            raw_score=raw_score,
            max_score=max_score,
            score_percentage=score_percentage,
            letter_grade=letter_grade,
            pass_mark=pass_mark,
            passed=passed,
            current_user=current_user,
        )

    @app.route('/student/exam/<exam_id>/start')
    def start_exam(exam_id):
        """Start taking the exam"""
        # Check if user is logged in
        if 'user_id' not in session:
            return redirect(url_for('login'))

        # Get current user
        current_user = User.query.get(session['user_id'])
        if not current_user:
            return redirect(url_for('login'))

        # Get exam
        exam = Exam.query.get(exam_id)
        if not exam:
            flash('Exam not found', 'error')
            return redirect(url_for('student_dashboard'))

        # Check if exam has been finished by admin
        if exam.is_finished:
            flash('This exam has been completed and is no longer available', 'error')
            return redirect(url_for('student_dashboard'))

        # Check if exam date is in the future
        if exam.date and exam.date.date() > datetime.utcnow().date():
            flash('This exam is not yet available', 'error')
            return redirect(url_for('student_dashboard'))

        # Block missed exams whose scheduled date has passed (allow On-The-Go)
        if not exam.is_on_the_go and exam.date and exam.date.date() < datetime.utcnow().date():
            flash('This exam was scheduled for ' + exam.date.strftime('%B %d, %Y') + ' and is no longer available. Contact your teacher for assistance.', 'error')
            return redirect(url_for('student_dashboard'))

        # Check student exam access (enrollment + completion)
        access = check_student_exam_access(current_user, exam, exam_id)
        if not access['success']:
            flash(access['error_message'], 'error')
            return redirect(url_for('student_dashboard'))

        # Check if exam has ended
        if exam.time_ended and exam.time_ended < datetime.utcnow():
            flash('This exam has already ended', 'error')
            return redirect(url_for('student_dashboard'))

        # Check for existing active session (prevent multi-session exploit)
        existing_session = ExamSession.query.filter_by(
            student_id=current_user.id,
            exam_id=exam_id,
            is_active=True,
            is_completed=False
        ).first()
        if existing_session:
            session['current_exam_id'] = exam_id
            return render_template(
                'student/cbt_test.html',
                exam=exam,
                current_user=current_user
            )

        # Store exam_id in session for the test page
        session['current_exam_id'] = exam_id

        return render_template(
            'student/cbt_test.html',
            exam=exam,
            current_user=current_user
        )

    @app.route('/student/exam/<exam_id>/questions')
    def get_exam_questions(exam_id):
        """API endpoint to fetch exam questions with randomized option orders"""
        if 'user_id' not in session:
            return jsonify({"success": False, "message": "Authentication required"}), 401

        current_user = User.query.get(session['user_id'])
        if not current_user:
            return jsonify({"success": False, "message": "User not found"}), 404

        exam = Exam.query.get(exam_id)
        if not exam:
            return jsonify({"success": False, "message": "Exam not found"}), 404

        # Check student exam access (enrollment + completion)
        access = check_student_exam_access(current_user, exam, exam_id)
        if not access['success']:
            return jsonify({"success": False, "message": access['error_message']}), 403

        # Get questions for this exam (matching subject, class, and term)
        from services.question_service import get_questions_for_exam
        questions_query = get_questions_for_exam(
            subject_id=exam.subject_id,
            class_room_id=exam.class_room_id,
            term_id=exam.school_term_id
        )

        # Get all available questions first
        all_questions = questions_query.all()

        # If no questions, return helpful message
        if not all_questions:
            return jsonify({
                "success": False,
                "message": "No questions available for this exam. Please contact your teacher."
            }), 404

        # Apply number_of_questions limit if specified
        if exam.number_of_questions and exam.number_of_questions < len(all_questions):
            # Randomly select the specified number of questions
            questions = random.sample(all_questions, exam.number_of_questions)
        else:
            # Use all available questions
            questions = all_questions
            # print(f"DEBUG: Using all {len(questions)} questions")

        # IMPORTANT: Shuffle the questions so each student gets them in different order
        random.shuffle(questions)
        # print(f"DEBUG: Questions shuffled - each student will see different question order")

        # Prepare questions data with randomized options
        questions_data = []
        for question in questions:
            # Get options and randomize their order
            options = list(question.options)
            random.shuffle(options)

            # Create option data with new order indices
            options_data = []
            for i, option in enumerate(options):
                options_data.append({
                    'id': option.id,
                    'text': option.text,
                    'order': i,
                    'has_math': getattr(option, 'has_math', False),
                    'option_image': getattr(option, 'option_image', None)
                })

            questions_data.append({
                'id': question.id,
                'question_text': question.question_text,
                'question_type': question.question_type,
                'options': options_data,
                'has_math': getattr(question, 'has_math', False),
                'question_image': getattr(question, 'question_image', None)
            })

        return jsonify({
            "success": True,
            "questions": questions_data,
            "total_questions": len(questions_data)
        })

    @app.route('/student/exam/<exam_id>/submit', methods=['POST'])
    def submit_exam(exam_id):
        """Submit exam answers and calculate score"""
        if 'user_id' not in session:
            return jsonify({"success": False, "message": "Authentication required"}), 401

        current_user = User.query.get(session['user_id'])
        if not current_user:
            return jsonify({"success": False, "message": "User not found"}), 404

        exam = Exam.query.get(exam_id)
        if not exam:
            return jsonify({"success": False, "message": "Exam not found"}), 404

        # Check student exam access (enrollment + completion)
        access = check_student_exam_access(current_user, exam, exam_id)
        is_demo_user = access['is_demo_user']
        if not access['success']:
            return jsonify({"success": False, "message": access['error_message']}), 403

        try:
            data = request.get_json()
            answers = data.get('answers', {})

            # Server-side time validation: find active session and check elapsed time
            exam_session = ExamSession.query.filter_by(
                student_id=current_user.id,
                exam_id=exam_id,
                is_active=True
            ).first()

            if not exam_session:
                completed_session = ExamSession.query.filter_by(
                    student_id=current_user.id,
                    exam_id=exam_id,
                    is_completed=True
                ).first()
                if completed_session:
                    return jsonify({
                        "success": False,
                        "message": "You have already submitted this exam"
                    }), 403
                return jsonify({
                    "success": False,
                    "message": "No active exam session found. Please start the exam first."
                }), 403

            # Validate elapsed time against exam duration
            if exam_session.started_at and exam.duration:
                elapsed = (datetime.utcnow() - exam_session.started_at).total_seconds()
                duration_seconds = exam.duration.total_seconds()
                grace_period = 5
                if elapsed > duration_seconds + grace_period:
                    exam_session.is_active = False
                    exam_session.is_completed = True
                    exam_session.completed_at = datetime.utcnow()
                    db.session.commit()
                    return jsonify({
                        "success": False,
                        "message": "Time limit exceeded. Your exam could not be submitted."
                    }), 403

            # Get questions for this exam - use same logic as get_exam_questions
            from models.question import Option

            # Use stored question order if available for accurate scoring
            question_order = exam_session.get_question_order() if exam_session else []
            if question_order:
                questions_to_score = Question.query.filter(
                    Question.id.in_(question_order)
            ).all()
                total_questions = len(question_order) if question_order else exam.number_of_questions or len(questions_to_score)
            else:
                from services.question_service import get_questions_for_exam
                all_questions = get_questions_for_exam(
                    subject_id=exam.subject_id,
                    class_room_id=exam.class_room_id,
                    term_id=exam.school_term_id
                ).all()

                if not all_questions:
                    return jsonify({"success": False, "message": "No questions found for this exam"}), 404

                if exam.number_of_questions and exam.number_of_questions < len(all_questions):
                    questions_to_score = all_questions
                    total_questions = exam.number_of_questions
                else:
                    questions_to_score = all_questions
                    total_questions = len(all_questions)

            # Batch load all selected options to avoid N+1 queries
            selected_option_ids = [
                v for v in answers.values()
                if v and isinstance(v, str) and len(v) > 0
            ]
            selected_options = {}
            if selected_option_ids:
                batch = Option.query.filter(
                    Option.id.in_(selected_option_ids)
                ).all()
                for opt in batch:
                    selected_options[opt.id] = opt

            # Calculate score - only count answers that were submitted
            correct_answers = 0

            for question in questions_to_score:
                question_id = question.id
                student_answer = answers.get(question_id)

                if student_answer:
                    # For MCQ and True/False, check if the selected option is correct
                    if question.question_type in ['mcq', 'multiple_choice', 'true_false']:
                        selected_option = selected_options.get(student_answer)
                        if selected_option and selected_option.is_correct:
                            correct_answers += 1
                    # For short answer, check if the answer matches (case insensitive)
                    elif question.question_type == 'short_answer':
                        if student_answer.lower().strip() == question.correct_answer.lower().strip():
                            correct_answers += 1

            # Calculate percentage and letter grade
            score_percentage = (
                correct_answers / total_questions * 100) if total_questions > 0 else 0
            raw_score = (correct_answers / total_questions *
                         exam.max_score) if total_questions > 0 else 0

            # Determine letter grade using configurable GradeScale
            letter_grade = 'F'
            if exam.school_term and exam.school_term.school:
                grade_scale = GradeScale.query.filter_by(
                    school_id=exam.school_term.school.school_id,
                    is_active=True,
                    is_default=True
                ).first()
                if grade_scale:
                    letter_grade, _ = grade_scale.get_grade_for_percentage(score_percentage)
                else:
                    # Fallback: try any active grade scale for this school
                    grade_scale = GradeScale.query.filter_by(
                        school_id=exam.school_term.school.school_id,
                        is_active=True
                    ).first()
                    if grade_scale:
                        letter_grade, _ = grade_scale.get_grade_for_percentage(score_percentage)
                    else:
                        # No grade scale configured — use basic fallback
                        if score_percentage >= 70:
                            letter_grade = 'A'
                        elif score_percentage >= 60:
                            letter_grade = 'B'
                        elif score_percentage >= 50:
                            letter_grade = 'C'
                        elif score_percentage >= 40:
                            letter_grade = 'D'
                        else:
                            letter_grade = 'F'

            # Get exam metadata
            school_term = SchoolTerm.query.get(exam.school_term_id)
            term_name = school_term.term_name if school_term else "Unknown"
            academic_year = school_term.academic_session if school_term else "Unknown"

            # Create exam record with answers and metadata
            from models.exam_record import ExamRecord
            from services.generate_uuid import generate_uuid
            exam_record = ExamRecord()
            exam_record.id = generate_uuid()
            exam_record.student_id = str(current_user.id)
            exam_record.exam_id = str(exam_id)
            exam_record.subject_id = str(exam.subject_id)
            exam_record.class_room_id = str(exam.class_room_id)
            exam_record.school_term_id = str(
                exam.school_term_id) if exam.school_term_id else None
            exam_record.exam_type = str(exam.exam_type)
            exam_record.academic_year = str(academic_year)
            exam_record.correct_answers = int(correct_answers)
            exam_record.total_questions = int(total_questions)
            exam_record.score_percentage = float(round(score_percentage, 2))
            exam_record.raw_score = float(round(raw_score, 2))
            exam_record.max_score = float(exam.max_score)
            exam_record.letter_grade = str(letter_grade)
            exam_record.started_at = exam_session.started_at if exam_session and exam_session.started_at else datetime.utcnow()
            exam_record.submitted_at = datetime.utcnow()
            exam_record.set_answers(answers)  # Store answers as JSON

            if not is_demo_user:
                # Save ExamRecord only when full results should be persisted
                if not (exam.is_on_the_go and not exam.save_after_completion):
                    db.session.add(exam_record)

                # Always save student_exam to lock completion and prevent retakes
                from sqlalchemy.dialects.sqlite import insert as sqlite_insert
                time_taken = None
                if exam_session and exam_session.started_at:
                    time_taken = int(
                        (datetime.utcnow() - exam_session.started_at).total_seconds())

                stmt = sqlite_insert(student_exam).values(
                    student_id=current_user.id,
                    exam_id=exam_id,
                    score=float(round(raw_score, 2)),
                    completed_at=datetime.utcnow(),
                    time_taken=time_taken
                ).on_conflict_do_update(
                    index_elements=['student_id', 'exam_id'],
                    set_={
                        'score': float(round(raw_score, 2)),
                        'completed_at': datetime.utcnow(),
                        'time_taken': time_taken
                    }
                )
                db.session.execute(stmt)

                db.session.commit()

            # Mark exam session as completed (reuse session from time validation)
            if exam_session:
                # Refresh the session from DB to get latest state
                db.session.refresh(exam_session)
                exam_session.is_active = False
                exam_session.is_completed = True
                exam_session.completed_at = datetime.utcnow()
                db.session.commit()

            # Clear exam session
            session.pop('current_exam_id', None)

            # Check if students can see results immediately
            show_results = False
            if not is_demo_user:
                # Check exam-level feedback setting first
                if exam.show_feedback:
                    show_results = True
                else:
                    # Fall back to permission check
                    show_results_permission = Permission.query.filter_by(
                        permission_name="students_view_results"
                    ).first()
                    show_results = show_results_permission and show_results_permission.is_active
            else:
                # Demo users always see results
                show_results = True

            # Check if students can view dashboard to determine redirect URL
            from models import is_permission_active
            can_view_dashboard = is_permission_active(
                "students_can_view_dashboard")
            redirect_url = "/student/dashboard" if can_view_dashboard else "/login"

            # Return response based on permission
            if show_results:
                # Batch load selected options for results
                result_answer_ids = [
                    v for v in answers.values()
                    if v and isinstance(v, str) and len(v) > 0
                ]
                result_options = {}
                if result_answer_ids:
                    for opt in Option.query.filter(Option.id.in_(result_answer_ids)).all():
                        result_options[opt.id] = opt

                # Build per-question results for feedback
                question_results = []
                for question in questions_to_score:
                    question_id = question.id
                    student_answer = answers.get(question_id)
                    is_correct = False

                    if student_answer:
                        if question.question_type in ['mcq', 'multiple_choice', 'true_false']:
                            selected_option = result_options.get(student_answer)
                            if selected_option and selected_option.is_correct:
                                is_correct = True
                        elif question.question_type == 'short_answer':
                            if student_answer.lower().strip() == question.correct_answer.lower().strip():
                                is_correct = True

                    # Get correct answer text
                    correct_answer_text = ""
                    if question.question_type in ['mcq', 'multiple_choice', 'true_false']:
                        for opt in question.options:
                            if opt.is_correct:
                                correct_answer_text = opt.text
                                break
                    elif question.question_type == 'short_answer':
                        correct_answer_text = question.correct_answer or ""

                    # Get student answer text
                    student_answer_text = ""
                    if student_answer:
                        if question.question_type in ['mcq', 'multiple_choice', 'true_false']:
                            selected_option = result_options.get(student_answer)
                            if selected_option:
                                student_answer_text = selected_option.text
                        elif question.question_type == 'short_answer':
                            student_answer_text = student_answer

                    question_results.append({
                        "question_id": question_id,
                        "question_text": question.question_text,
                        "question_type": question.question_type,
                        "student_answer_id": student_answer,
                        "student_answer_text": student_answer_text,
                        "correct_answer_text": correct_answer_text,
                        "is_correct": is_correct,
                    })

                return jsonify({
                    "success": True,
                    "show_results": True,
                    "correct_answers": correct_answers,
                    "total_questions": total_questions,
                    "score_percentage": round(score_percentage, 2),
                    "raw_score": round(raw_score, 2),
                    "max_score": float(exam.max_score),
                    "letter_grade": letter_grade,
                    "question_results": question_results,
                    "redirect_url": redirect_url
                })
            else:
                return jsonify({
                    "success": True,
                    "show_results": False,
                    "message": "Exam submitted successfully. Results will be available after teacher review.",
                    "redirect_url": redirect_url
                })

        except Exception as e:
            print(f"Error submitting exam: {str(e)}")
            import traceback
            traceback.print_exc()
            db.session.rollback()
            return jsonify({"success": False, "message": "Error processing exam submission"}), 500

    @app.route('/student/exam/<exam_id>/session/save', methods=['POST'])
    def save_exam_session(exam_id):
        """Save current exam progress"""
        if 'user_id' not in session:
            return jsonify({"success": False, "message": "Authentication required"}), 401

        current_user = User.query.get(session['user_id'])
        if not current_user:
            return jsonify({"success": False, "message": "User not found"}), 404

        try:
            data = request.get_json()
            current_question_index = data.get('current_question_index', 0)
            answers = data.get('answers', {})
            question_order = data.get('question_order', [])

            # Find or create exam session (enforce one active session)
            exam_session = ExamSession.query.filter_by(
                student_id=current_user.id,
                exam_id=exam_id,
                is_active=True,
                is_completed=False
            ).first()

            exam = Exam.query.get(exam_id)
            if not exam_session:
                from services.generate_uuid import generate_uuid
                exam_session = ExamSession()
                exam_session.id = generate_uuid()
                exam_session.student_id = current_user.id
                exam_session.exam_id = exam_id
                exam_session.started_at = datetime.utcnow()
                exam_session.time_remaining = exam.duration.total_seconds() if exam and exam.duration else 1500
                db.session.add(exam_session)
            else:
                # Compute time_remaining server-side instead of trusting client
                if exam and exam_session.started_at and exam.duration:
                    elapsed = (datetime.utcnow() - exam_session.started_at).total_seconds()
                    duration_seconds = exam.duration.total_seconds()
                    exam_session.time_remaining = max(0, int(duration_seconds - elapsed))
                else:
                    exam_session.time_remaining = exam.duration.total_seconds() if exam and exam.duration else 1500

            # Reject save if time has expired (strict, no grace)
            if exam and exam_session.started_at and exam.duration:
                elapsed = (datetime.utcnow() - exam_session.started_at).total_seconds()
                duration_seconds = exam.duration.total_seconds()
                if elapsed > duration_seconds:
                    exam_session.is_active = False
                    exam_session.is_completed = True
                    exam_session.completed_at = datetime.utcnow()
                    db.session.commit()
                    return jsonify({
                        "success": False,
                        "message": "Time limit exceeded. You can no longer save progress."
                    }), 403

            # Update session data
            exam_session.current_question_index = current_question_index
            exam_session.set_answers(answers)
            exam_session.set_question_order(question_order)
            exam_session.last_activity = datetime.utcnow()

            db.session.commit()

            return jsonify({
                "success": True,
                "message": "Progress saved",
                "session_id": exam_session.id,
                "time_remaining": exam_session.time_remaining
            })

        except Exception as e:
            db.session.rollback()
            return jsonify({"success": False, "message": "Error saving progress"}), 500

    @app.route('/student/exam/<exam_id>/session/restore')
    def restore_exam_session(exam_id):
        """Restore saved exam progress"""
        if 'user_id' not in session:
            return jsonify({"success": False, "message": "Authentication required"}), 401

        current_user = User.query.get(session['user_id'])
        if not current_user:
            return jsonify({"success": False, "message": "User not found"}), 404

        try:
            # Find active exam session
            exam_session = ExamSession.query.filter_by(
                student_id=current_user.id,
                exam_id=exam_id,
                is_active=True,
                is_completed=False
            ).first()

            if exam_session:
                return jsonify({
                    "success": True,
                    "has_session": True,
                    "session": exam_session.to_dict()
                })
            else:
                return jsonify({
                    "success": True,
                    "has_session": False
                })

        except Exception as e:
            # print(f"Error restoring exam session: {str(e)}")
            return jsonify({"success": False, "message": "Error restoring progress"}), 500

    @app.route('/student/exam/<exam_id>/session/complete', methods=['POST'])
    def complete_exam_session(exam_id):
        """Mark exam session as completed"""
        if 'user_id' not in session:
            return jsonify({"success": False, "message": "Authentication required"}), 401

        current_user = User.query.get(session['user_id'])
        if not current_user:
            return jsonify({"success": False, "message": "User not found"}), 404

        try:
            # Find active exam session
            exam_session = ExamSession.query.filter_by(
                student_id=current_user.id,
                exam_id=exam_id,
                is_active=True
            ).first()

            if exam_session:
                exam_session.is_active = False
                exam_session.is_completed = True
                exam_session.completed_at = datetime.utcnow()
                db.session.commit()

            return jsonify({"success": True, "message": "Session completed"})

        except Exception as e:
            # print(f"Error completing exam session: {str(e)}")
            db.session.rollback()
            return jsonify({"success": False, "message": "Error completing session"}), 500

    @app.route('/student/exam/<exam_id>/session/reset', methods=['POST'])
    def reset_exam_session(exam_id):
        """Invalidate old session when user chooses 'Start Fresh'"""
        if 'user_id' not in session:
            return jsonify({"success": False, "message": "Authentication required"}), 401

        current_user = User.query.get(session['user_id'])
        if not current_user:
            return jsonify({"success": False, "message": "User not found"}), 404

        try:
            exam_session = ExamSession.query.filter_by(
                student_id=current_user.id,
                exam_id=exam_id,
                is_active=True,
                is_completed=False
            ).first()

            if exam_session:
                exam_session.is_active = False
                exam_session.is_completed = True
                exam_session.completed_at = datetime.utcnow()
                db.session.commit()

            return jsonify({"success": True})
        except Exception as e:
            db.session.rollback()
            return jsonify({"success": False, "message": "Error resetting session"}), 500

    @app.route('/student/test')
    def student_exams():
        """Legacy route - redirects to dashboard"""
        return redirect(url_for('student_dashboard'))

    @app.route('/student/demo_questions')
    def demo_question_bank():
        """Display available demo questions for practice"""
        if 'user_id' not in session:
            return redirect(url_for('login'))

        current_user = User.query.get(session['user_id'])
        if not current_user:
            return redirect(url_for('login'))

        # Check if demo practice is enabled by admin
        from models import is_permission_active
        demo_enabled = is_permission_active("demo_question_bank")

        if not demo_enabled:
            flash('Demo practice is currently disabled by the administrator.', 'error')
            return redirect(url_for('student_dashboard'))

        # Get all demo questions grouped by subject
        from models.demo_question import DemoQuestion
        demo_questions = DemoQuestion.query.all()

        # Group questions by subject
        subjects = {}
        for question in demo_questions:
            if question.subject not in subjects:
                subjects[question.subject] = []
            subjects[question.subject].append(question)

        return render_template(
            'student/demo_questions.html',
            current_user=current_user,
            subjects=subjects,
            total_questions=len(demo_questions)
        )

    @app.route('/student/demo_questions/start')
    def start_demo_practice():
        """Start demo practice session"""
        if 'user_id' not in session:
            return redirect(url_for('login'))

        current_user = User.query.get(session['user_id'])
        if not current_user:
            return redirect(url_for('login'))

        # Check if demo practice is enabled by admin
        from models import is_permission_active
        demo_enabled = is_permission_active("demo_question_bank")

        if not demo_enabled:
            flash('Demo practice is currently disabled by the administrator.', 'error')
            return redirect(url_for('student_dashboard'))

        # Get subject filter if provided
        subject_filter = request.args.get('subject')

        # Get demo questions
        from models.demo_question import DemoQuestion
        query = DemoQuestion.query
        if subject_filter:
            query = query.filter_by(subject=subject_filter)

        demo_questions = query.all()

        if not demo_questions:
            flash('No demo questions available.', 'error')
            return redirect(url_for('demo_question_bank'))

        # Store demo questions in session
        session['demo_questions'] = [q.id for q in demo_questions]
        session['demo_started'] = True

        return render_template(
            'student/demo_test.html',
            current_user=current_user,
            total_questions=len(demo_questions)
        )

    @app.route('/student/demo_questions/api')
    def get_demo_questions():
        """API endpoint to fetch demo questions with randomized option orders"""
        if 'user_id' not in session:
            return jsonify({"success": False, "message": "Authentication required"}), 401

        current_user = User.query.get(session['user_id'])
        if not current_user:
            return jsonify({"success": False, "message": "User not found"}), 404

        # Check if demo practice is enabled
        from models import is_permission_active
        demo_enabled = is_permission_active("demo_question_bank")

        if not demo_enabled:
            return jsonify({"success": False, "message": "Demo practice is disabled"}), 403

        # Check if demo session is active
        if not session.get('demo_started'):
            return jsonify({"success": False, "message": "Demo session not started"}), 400

        # Get demo question IDs from session
        question_ids = session.get('demo_questions', [])
        if not question_ids:
            return jsonify({"success": False, "message": "No questions found"}), 404

        # Get questions
        from models.demo_question import DemoQuestion, DemoOption
        questions = DemoQuestion.query.filter(
            DemoQuestion.id.in_(question_ids)).all()

        # Prepare questions data with randomized options
        questions_data = []
        for question in questions:
            # Get options and randomize their order
            options = list(question.options)
            random.shuffle(options)

            # Create option data with new order indices
            options_data = []
            for i, option in enumerate(options):
                options_data.append({
                    'id': option.id,
                    'text': option.text,
                    'order': i,
                    'has_math': getattr(option, 'has_math', False),
                    'option_image': getattr(option, 'option_image', None)
                })

            questions_data.append({
                'id': question.id,
                'question_text': question.question_text,
                'question_type': question.question_type,
                'options': options_data,
                'has_math': getattr(question, 'has_math', False),
                'question_image': getattr(question, 'question_image', None)
            })

        return jsonify({
            "success": True,
            "questions": questions_data,
            "total_questions": len(questions_data)
        })

    @app.route('/student/demo_questions/submit', methods=['POST'])
    def submit_demo_practice():
        """Submit demo practice answers and calculate score (not saved to database)"""
        if 'user_id' not in session:
            return jsonify({"success": False, "message": "Authentication required"}), 401

        current_user = User.query.get(session['user_id'])
        if not current_user:
            return jsonify({"success": False, "message": "User not found"}), 404

        # Check if demo practice is enabled
        from models import is_permission_active
        demo_enabled = is_permission_active("demo_question_bank")

        if not demo_enabled:
            return jsonify({"success": False, "message": "Demo practice is disabled"}), 403

        try:
            data = request.get_json()
            answers = data.get('answers', {})

            # Get demo question IDs from session
            question_ids = session.get('demo_questions', [])
            if not question_ids:
                return jsonify({"success": False, "message": "No questions found"}), 404

            # Get questions
            from models.demo_question import DemoQuestion, DemoOption
            questions = DemoQuestion.query.filter(
                DemoQuestion.id.in_(question_ids)).all()

            # Calculate score
            correct_count = 0
            total_questions = len(questions)

            for question in questions:
                student_answer = answers.get(question.id)

                if question.question_type == 'short_answer':
                    # For short answer, check if answer matches (case-insensitive)
                    if student_answer and student_answer.strip().lower() == question.correct_answer.strip().lower():
                        correct_count += 1
                else:
                    # For MCQ and True/False, check if selected option is correct
                    if student_answer:
                        option = DemoOption.query.filter_by(
                            id=student_answer,
                            question_id=question.id
                        ).first()
                        if option and option.is_correct:
                            correct_count += 1

            score_percentage = round((correct_count / total_questions) * 100) if total_questions > 0 else 0

            # Clear demo session
            session.pop('demo_questions', None)
            session.pop('demo_started', None)

            return jsonify({
                "success": True,
                "correct_answers": correct_count,
                "total_questions": total_questions,
                "score_percentage": score_percentage
            })

        except Exception as e:
            print(f"Error submitting demo practice: {e}")
            return jsonify({"success": False, "message": "Error processing answers"}), 500
