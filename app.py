from models.assessment_type import AssessmentType
from models.school_term import SchoolTerm
from models.subject import Subject
from models.section import Section
from models import Permission
from models.school import School
from models.class_room import ClassRoom
from models.user import User
from datetime import date, timedelta
from flask import Flask, render_template, session, send_from_directory
import json
import os
from config import Config
from models import db, bcrypt
from routes.auth_routes import auth_routes
from routes.dashboard import dashboard_route
from routes.admin_action_routes import admin_action_route
from routes.staff_routes import staff_routes
from routes.student_routes import student_route
from routes.session_monitor_routes import session_monitor_routes

# Conditionally import report routes and initialize Celery based on availability
use_fakeredis = os.environ.get('USE_FAKEREDIS', '').lower() == 'true'

if use_fakeredis:
    # Use fakeredis for development
    try:
        import fakeredis
        # Set up fakeredis
        os.environ.setdefault('REDIS_URL', 'redis://localhost:6379/0')
        # We'll initialize the actual fake Redis server when needed
    except ImportError:
        pass

try:
    from routes.report_routes import report_bp
except (ImportError, OSError) as e:
    print(
        f"Warning: Report routes not available due to missing dependencies: {e}")
    report_bp = None


# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Explicitly set session configuration
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)
app.config['SESSION_REFRESH_EACH_REQUEST'] = True

db.init_app(app)
bcrypt.init_app(app)


# Initialize Celery
# Celery usage removed as per request
# from celery_app import make_celery
# celery = make_celery(app)
# app.config['CELERY_RESULT_EXPIRES'] = 3600

# Add custom filter for parsing JSON


@app.template_filter('from_json')
def from_json(value):
    try:
        return json.loads(value) if value else {}
    except:
        return {}

# Debug route to check session (remove in production)


@app.route('/debug/session')
def debug_session():
    from flask import session
    return {
        'session_data': dict(session),
        'permanent': session.permanent,
        'modified': session.modified,
        'config': {
            'PERMANENT_SESSION_LIFETIME': str(app.config.get('PERMANENT_SESSION_LIFETIME')),
            'SESSION_REFRESH_EACH_REQUEST': app.config.get('SESSION_REFRESH_EACH_REQUEST'),
        }
    }


@app.route("/current_user")
def current_user():
    users = db.session.query(User).all()
    class_rooms = db.session.query(ClassRoom).all()
    current_user = User.query.get(session["user_id"])
    return render_template(
        users=users,
        class_rooms=class_rooms,
        current_user=current_user
    )


# Register routes
auth_routes(app)
dashboard_route(app)
admin_action_route(app)
staff_routes(app)
student_route(app)
session_monitor_routes(app)
if report_bp:
    app.register_blueprint(report_bp)
# Initialize the database
with app.app_context():
    db.create_all()
    print("=" * 80)
    print("DATABASE INITIALIZED - READY TO SERVE")
    print("-" * 80)
    print("To create default data (school, terms, assessments, etc.), run:")
    print("  python -c \"from app import app; from utils.initialize_defaults import initialize_default_data; app.app_context().push(); initialize_default_data()\"")
    print("=" * 80)
    print()

# End of commented initialization code


# Root route
@app.route("/")
def index():
    return render_template("main/index.html")


# Make school info available in all templates
@app.context_processor
def inject_school_info():
    try:
        school = School.query.first()
        school_name = school.school_name if school and school.school_name else "Your School"
        # Build logo URL if saved; else None to use template fallback
        logo_url = None
        if school and school.logo:
            # school.logo is stored as a relative path like uploads/school_logos/filename
            logo_url = f"/{school.logo.replace('static/', '')}"
        return {
            "school_info": {
                "name": school_name,
                "address": getattr(school, "address", ""),
                "phone": getattr(school, "phone", ""),
                "email": getattr(school, "email", ""),
                "website": getattr(school, "website", ""),
                "logo_url": logo_url,
                "session": getattr(school, "current_session", ""),
                "term": getattr(school, "current_term", ""),
            }
        }
    except Exception:
        return {"school_info": {"name": "Your School", "logo_url": None}}


# Route to serve uploaded files
@app.route('/uploads/<path:filepath>')
def serve_uploads(filepath):
    """Serve uploaded files"""
    upload_dir = os.path.join(os.path.dirname(__file__), 'static', 'uploads')
    try:

        return send_from_directory(upload_dir, filepath)
    except FileNotFoundError:
        # Log the error and return a 404
        print(f"File not found: {filepath} in directory {upload_dir}")
        from flask import abort
        abort(404)


# Route to serve node_modules for client-side libraries
@app.route('/node_modules/<path:filepath>')
def serve_node_modules(filepath):
    """Serve node_modules files"""
    return send_from_directory(os.path.join(os.path.dirname(__file__), 'node_modules'), filepath)



if __name__ == "__main__":
    app.run(host='0.0.0.0',
            port=5000,
            debug=True,
            )
