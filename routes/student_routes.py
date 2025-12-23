from flask import render_template, redirect, url_for, session, flash, jsonify, request
from models import db, User
from models.exam import Exam
from models.exam_session import ExamSession
from models.question import Question
from models.subject import Subject
from models.school_term import SchoolTerm
from models.permissions import Permission
from models.associations import student_subject, student_exam, class_subject
from datetime import datetime
import random


def student_route(app):
    @app.route('/student/profile')
    def student_profile():
        # return render_template('student/profile.html')
        return "Student Profile"

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

        # Check if this is a demo user
        is_demo_user = "demo" in current_user.username.lower()

        if not is_demo_user:
            # Regular students - apply normal checks
            # Check if student is enrolled in the exam's subject
            enrollment = db.session.execute(
                db.select(student_subject).where(
                    student_subject.c.student_id == current_user.id,
                    student_subject.c.subject_id == exam.subject_id
                )
            ).fetchone()
            print("Enrollment: ", enrollment)

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
                    print(
                        f"DEBUG: Auto-enrolling student {current_user.username} in subject {exam.subject_id}")
                    stmt = student_subject.insert().values(
                        student_id=current_user.id,
                        subject_id=exam.subject_id
                    )
                    db.session.execute(stmt)
                    db.session.commit()
                else:
                    flash('You are not enrolled in this subject', 'error')
                    return redirect(url_for('student_dashboard'))

            # Check if student has already completed this exam
            completion = db.session.execute(
                db.select(student_exam).where(
                    student_exam.c.student_id == current_user.id,
                    student_exam.c.exam_id == exam_id
                )
            ).fetchone()

            if completion:
                flash('You have already completed this exam', 'error')
                return redirect(url_for('student_dashboard'))
        else:
            # Demo users bypass all checks
            print(
                f"DEBUG: Demo user '{current_user.username}' accessing exam details for {exam_id}")

        # Get question count for this exam
        # Note: Questions are linked to subject and class_room, not directly to exams
        # Count all questions for this subject
        question_count = Question.query.filter_by(
            subject_id=exam.subject_id
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
        print("Exam: ", exam.__getattribute__('subject_id'))
        if not exam:
            flash('Exam not found', 'error')
            return redirect(url_for('student_dashboard'))

        # Check if this is a demo user
        is_demo_user = "demo" in current_user.username.lower()

        if not is_demo_user:
            # Regular students - apply normal checks
            # Check if student is enrolled in the exam's subject
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
                    print(
                        f"DEBUG: Auto-enrolling student {current_user.username} in subject {exam.subject_id}")
                    stmt = student_subject.insert().values(
                        student_id=current_user.id,
                        subject_id=exam.subject_id
                    )
                    db.session.execute(stmt)
                    db.session.commit()
                else:
                    flash('You are not enrolled in this subject', 'error')
                    return redirect(url_for('student_dashboard'))

            # Check if student has already completed this exam
            completion = db.session.execute(
                db.select(student_exam).where(
                    student_exam.c.student_id == current_user.id,
                    student_exam.c.exam_id == exam_id
                )
            ).fetchone()

            if completion:
                flash('You have already completed this exam', 'error')
                return redirect(url_for('student_dashboard'))
        else:
            # Demo users bypass all checks
            print(
                f"DEBUG: Demo user '{current_user.username}' starting exam {exam_id}")

        # Check if exam has ended
        if exam.time_ended and exam.time_ended < datetime.utcnow():
            flash('This exam has already ended', 'error')
            return redirect(url_for('student_dashboard'))

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

        # Check if this is a demo user
        is_demo_user = "demo" in current_user.username.lower()

        if not is_demo_user:
            # Regular students - apply normal checks
            # Check if student is enrolled in the exam's subject
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
                    print(
                        f"DEBUG: Auto-enrolling student {current_user.username} in subject {exam.subject_id}")
                    stmt = student_subject.insert().values(
                        student_id=current_user.id,
                        subject_id=exam.subject_id
                    )
                    db.session.execute(stmt)
                    db.session.commit()
                else:
                    return jsonify({"success": False, "message": "Not enrolled in this subject"}), 403

            # Check if student has already completed this exam
            completion = db.session.execute(
                db.select(student_exam).where(
                    student_exam.c.student_id == current_user.id,
                    student_exam.c.exam_id == exam_id
                )
            ).fetchone()

            if completion:
                return jsonify({"success": False, "message": "You have already completed this exam"}), 403
        else:
            # Demo users bypass all checks
            print(
                f"DEBUG: Demo user '{current_user.username}' accessing exam {exam_id} - bypassing enrollment and completion checks")

        # Get questions for this exam (matching subject and class_room)
        questions_query = Question.query.filter_by(
            subject_id=exam.subject_id,
            class_room_id=exam.class_room_id
        )

        # Get all available questions first
        all_questions = questions_query.all()

        # Debug logging
        print(f"DEBUG: Fetching questions for exam {exam_id}")
        print(f"DEBUG: Subject ID: {exam.subject_id}")
        print(f"DEBUG: Class ID: {exam.class_room_id}")
        print(f"DEBUG: Found {len(all_questions)} total questions")
        print(
            f"DEBUG: Exam number_of_questions setting: {exam.number_of_questions}")

        # If no questions, return helpful message
        if not all_questions:
            return jsonify({
                "success": False,
                "message": f"No questions found for {exam.subject.subject_name} in {exam.class_room.class_room_name}",
                "debug_info": {
                    "subject_id": exam.subject_id,
                    "class_room_id": exam.class_room_id,
                    "total_questions_in_db": Question.query.count()
                }
            }), 404

        # Apply number_of_questions limit if specified
        if exam.number_of_questions and exam.number_of_questions < len(all_questions):
            # Randomly select the specified number of questions
            questions = random.sample(all_questions, exam.number_of_questions)
            print(
                f"DEBUG: Randomly selected {len(questions)} questions out of {len(all_questions)}")
        else:
            # Use all available questions
            questions = all_questions
            print(f"DEBUG: Using all {len(questions)} questions")

        # IMPORTANT: Shuffle the questions so each student gets them in different order
        random.shuffle(questions)
        print(f"DEBUG: Questions shuffled - each student will see different question order")

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
                    'is_correct': option.is_correct,
                    'order': i,  # New randomized order
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

        # Check if this is a demo user
        is_demo_user = "demo" in current_user.username.lower()

        if not is_demo_user:
            # Regular students - apply normal checks
            # Check if student is enrolled in the exam's subject
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
                    print(
                        f"DEBUG: Auto-enrolling student {current_user.username} in subject {exam.subject_id}")
                    stmt = student_subject.insert().values(
                        student_id=current_user.id,
                        subject_id=exam.subject_id
                    )
                    db.session.execute(stmt)
                    db.session.commit()
                else:
                    return jsonify({"success": False, "message": "Not enrolled in this subject"}), 403

            # Check if student has already completed this exam
            completion = db.session.execute(
                db.select(student_exam).where(
                    student_exam.c.student_id == current_user.id,
                    student_exam.c.exam_id == exam_id
                )
            ).fetchone()

            if completion:
                return jsonify({"success": False, "message": "You have already completed this exam"}), 403
        else:
            # Demo users bypass checks
            print(
                f"DEBUG: Demo user '{current_user.username}' submitting exam {exam_id} - scores will not be recorded")

        try:
            data = request.get_json()
            answers = data.get('answers', {})

            # Get questions for this exam - use same logic as get_exam_questions
            from models.question import Option
            all_questions = Question.query.filter_by(
                subject_id=exam.subject_id,
                class_room_id=exam.class_room_id
            ).all()

            if not all_questions:
                return jsonify({"success": False, "message": "No questions found for this exam"}), 404

            # Apply number_of_questions limit if specified (same as get_exam_questions)
            if exam.number_of_questions and exam.number_of_questions < len(all_questions):
                # Use the number_of_questions setting for scoring
                # Note: We score based on submitted answers, not a specific subset
                questions_to_score = all_questions  # Score any answered questions
                total_questions = exam.number_of_questions  # But total is based on exam setting
                print(
                    f"DEBUG: Scoring based on {total_questions} questions (exam setting)")
            else:
                questions_to_score = all_questions
                total_questions = len(all_questions)
                print(
                    f"DEBUG: Scoring based on all {total_questions} questions")

            # Calculate score - only count answers that were submitted
            correct_answers = 0

            for question in questions_to_score:
                question_id = question.id
                student_answer = answers.get(question_id)

                if student_answer:
                    # For MCQ and True/False, check if the selected option is correct
                    if question.question_type in ['mcq', 'true_false']:
                        selected_option = Option.query.get(student_answer)
                        if selected_option and selected_option.is_correct:
                            correct_answers += 1
                    # For short answer, check if the answer matches (case insensitive)
                    elif question.question_type == 'short_answer':
                        if student_answer.lower().strip() == question.correct_answer.lower().strip():
                            correct_answers += 1

            print(
                f"DEBUG: Student answered {len(answers)} questions, got {correct_answers} correct out of {total_questions} total")

            # Calculate percentage and letter grade
            score_percentage = (
                correct_answers / total_questions * 100) if total_questions > 0 else 0
            raw_score = (correct_answers / total_questions *
                         exam.max_score) if total_questions > 0 else 0

            # Determine letter grade using configurable grading system
            if score_percentage >= 70:
                letter_grade = 'A'
            elif score_percentage >= 59:
                letter_grade = 'B'
            elif score_percentage >= 49:
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
            exam_record.started_at = datetime.utcnow()
            exam_record.submitted_at = datetime.utcnow()
            exam_record.set_answers(answers)  # Store answers as JSON

            # Only save records for non-demo users
            if not is_demo_user:
                db.session.add(exam_record)

                # Mark exam as completed by adding student to student_exam relationship
                # This prevents retaking the exam
                existing = db.session.execute(
                    db.select(student_exam).where(
                        (student_exam.c.student_id == current_user.id) &
                        (student_exam.c.exam_id == exam_id)
                    )
                ).fetchone()

                if not existing:
                    # Calculate time taken (if exam session exists)
                    time_taken = None
                    exam_session = ExamSession.query.filter_by(
                        student_id=current_user.id,
                        exam_id=exam_id
                    ).first()
                    if exam_session and exam_session.started_at:
                        time_taken = int(
                            (datetime.utcnow() - exam_session.started_at).total_seconds())

                    stmt = student_exam.insert().values(
                        student_id=current_user.id,
                        exam_id=exam_id,
                        score=float(round(raw_score, 2)),
                        completed_at=datetime.utcnow(),
                        time_taken=time_taken
                    )
                    db.session.execute(stmt)
                else:
                    # Update existing record with score and completion time
                    time_taken = None
                    exam_session = ExamSession.query.filter_by(
                        student_id=current_user.id,
                        exam_id=exam_id
                    ).first()
                    if exam_session and exam_session.started_at:
                        time_taken = int(
                            (datetime.utcnow() - exam_session.started_at).total_seconds())

                    stmt = student_exam.update().where(
                        (student_exam.c.student_id == current_user.id) &
                        (student_exam.c.exam_id == exam_id)
                    ).values(
                        score=float(round(raw_score, 2)),
                        completed_at=datetime.utcnow(),
                        time_taken=time_taken
                    )
                    db.session.execute(stmt)

                db.session.commit()
                print(
                    f"DEBUG: Exam record saved for regular user '{current_user.username}'")
            else:
                print(
                    f"DEBUG: Skipping exam record save for demo user '{current_user.username}'")

            # Mark exam session as completed
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

            # Clear exam session
            session.pop('current_exam_id', None)

            # Check if students can see results immediately
            show_results = False
            if not is_demo_user:
                # Check permission for regular students
                show_results_permission = Permission.query.filter_by(
                    permission_name="show_results_immediately",
                    created_for="student"
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
                return jsonify({
                    "success": True,
                    "show_results": True,
                    "correct_answers": correct_answers,
                    "total_questions": total_questions,
                    "score_percentage": round(score_percentage, 2),
                    "raw_score": round(raw_score, 2),
                    "max_score": float(exam.max_score),
                    "letter_grade": letter_grade,
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
            time_remaining = data.get('time_remaining', 0)
            answers = data.get('answers', {})
            question_order = data.get('question_order', [])

            # Find or create exam session
            exam_session = ExamSession.query.filter_by(
                student_id=current_user.id,
                exam_id=exam_id,
                is_active=True
            ).first()

            if not exam_session:
                from services.generate_uuid import generate_uuid
                exam_session = ExamSession()
                exam_session.id = generate_uuid()
                exam_session.student_id = current_user.id
                exam_session.exam_id = exam_id
                db.session.add(exam_session)

            # Update session data
            exam_session.current_question_index = current_question_index
            exam_session.time_remaining = time_remaining
            exam_session.set_answers(answers)
            exam_session.set_question_order(question_order)
            exam_session.last_activity = datetime.utcnow()

            db.session.commit()

            return jsonify({
                "success": True,
                "message": "Progress saved",
                "session_id": exam_session.id
            })

        except Exception as e:
            print(f"Error saving exam session: {str(e)}")
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
            print(f"Error restoring exam session: {str(e)}")
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
            print(f"Error completing exam session: {str(e)}")
            db.session.rollback()
            return jsonify({"success": False, "message": "Error completing session"}), 500

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
                    'is_correct': option.is_correct,
                    'order': i,  # New randomized order
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
