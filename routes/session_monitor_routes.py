from flask import render_template, redirect, url_for, session, jsonify
from models import db, User
from models.exam_session import ExamSession
from models.exam import Exam
from functools import wraps


def require_admin(f):
    """Decorator to require admin access"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        
        current_user = User.query.get(session['user_id'])
        if not current_user or current_user.role != 'admin':
            return redirect(url_for('dashboard'))
        
        return f(*args, **kwargs)
    return decorated_function


def session_monitor_routes(app):
    """Routes for monitoring exam sessions"""
    
    @app.route('/admin/exam-sessions')
    @require_admin
    def exam_sessions_monitor():
        """View all active exam sessions"""
        current_user = User.query.get(session['user_id'])
        
        # Get all active sessions
        active_sessions = ExamSession.query.filter_by(is_active=True).order_by(
            ExamSession.last_activity.desc()
        ).all()
        
        # Get completed sessions from today
        from datetime import datetime, timedelta
        today = datetime.utcnow().date()
        completed_today = ExamSession.query.filter(
            ExamSession.is_completed == True,
            ExamSession.completed_at >= today
        ).count()
        
        return render_template(
            'admin/exam_sessions.html',
            current_user=current_user,
            active_sessions=active_sessions,
            completed_today=completed_today
        )
    
    @app.route('/admin/exam-sessions/api')
    @require_admin
    def exam_sessions_api():
        """API endpoint for exam sessions data"""
        # Get all active sessions with related data
        active_sessions = ExamSession.query.filter_by(is_active=True).all()
        
        sessions_data = []
        for exam_session in active_sessions:
            student = User.query.get(exam_session.student_id)
            exam = Exam.query.get(exam_session.exam_id)
            
            if student and exam:
                answered_count = len(exam_session.get_answers())
                time_remaining_minutes = exam_session.time_remaining // 60
                
                sessions_data.append({
                    'id': exam_session.id,
                    'student_name': student.username,
                    'exam_name': exam.name,
                    'subject': exam.subject.subject_name,
                    'answered_questions': answered_count,
                    'current_question': exam_session.current_question_index + 1,
                    'time_remaining': f"{time_remaining_minutes} min",
                    'last_activity': exam_session.last_activity.strftime("%Y-%m-%d %H:%M:%S"),
                    'started_at': exam_session.started_at.strftime("%Y-%m-%d %H:%M:%S")
                })
        
        return jsonify({
            'success': True,
            'sessions': sessions_data,
            'total_active': len(sessions_data)
        })
    
    @app.route('/admin/exam-sessions/stats')
    @require_admin
    def exam_sessions_stats():
        """Get session statistics"""
        from datetime import datetime, timedelta
        
        # Total sessions
        total_sessions = ExamSession.query.count()
        
        # Active sessions
        active_sessions = ExamSession.query.filter_by(is_active=True).count()
        
        # Completed sessions
        completed_sessions = ExamSession.query.filter_by(is_completed=True).count()
        
        # Sessions completed today
        today = datetime.utcnow().date()
        completed_today = ExamSession.query.filter(
            ExamSession.is_completed == True,
            ExamSession.completed_at >= today
        ).count()
        
        # Sessions with resume (sessions that were restored)
        # This would require tracking resume events, for now we'll estimate
        # by finding sessions with multiple save events (future enhancement)
        
        return jsonify({
            'success': True,
            'stats': {
                'total_sessions': total_sessions,
                'active_sessions': active_sessions,
                'completed_sessions': completed_sessions,
                'completed_today': completed_today
            }
        })
