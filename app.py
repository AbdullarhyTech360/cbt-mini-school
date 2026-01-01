from models.assessment_type import AssessmentType
from models.school_term import SchoolTerm
from models.subject import Subject
from models.section import Section
from models import Permission
from models.school import School
from models.class_room import ClassRoom
from models.user import User
from datetime import date, timedelta
from flask import Flask, jsonify, render_template, session, send_from_directory
import json
import os
import ssl
import logging
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


# Custom logging filter to suppress SSL-related bad request errors

class SSLFilter(logging.Filter):
    def filter(self, record):
        # Suppress specific SSL/TLS handshake error messages
        message = record.getMessage()
        if message.startswith('code 400, message Bad request syntax') or \
           'Bad request version' in message or \
           'Bad request syntax' in message or \
           ('\x16\x03' in message and ('\x01' in message or '\x02' in message or '\x03' in message)):
            return False
        return True


# Apply the filter to the werkzeug logger to suppress SSL-related errors
log = logging.getLogger('werkzeug')
log.addFilter(SSLFilter())

# Reduce werkzeug logging level to reduce noise from malformed requests
logging.getLogger('werkzeug').setLevel(logging.WARNING)


# WSGI middleware to handle malformed SSL handshake requests

class SSLHandshakeMiddleware:
    def __init__(self, app):
        self.app = app

    def __call__(self, environ, start_response):
        # Check if this looks like an SSL handshake request
        try:
            # Get the raw request data if possible
            if 'wsgi.input' in environ:
                # This is complex to handle at WSGI level, so we'll focus on the logging approach
                # The main issue is handled by the logging filter above
                return self.app(environ, start_response)
        except Exception:
            # If there's an issue processing the request, let it fail normally
            return self.app(environ, start_response)


# Wrap the app with the middleware
app.wsgi_app = SSLHandshakeMiddleware(app.wsgi_app) # type: ignore


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
    # Get the current logged-in user
    current_user = User.query.get(session.get("user_id"))

    if current_user is None:
        return jsonify({"error": "User not found"}), 404
    return jsonify(current_user.to_dict())


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
    # Check if SSL certificate files exist, if not, run without SSL
    ssl_context = None
    cert_file = os.path.join(os.path.dirname(__file__), 'cert.pem')
    key_file = os.path.join(os.path.dirname(__file__), 'key.pem')
    
    if os.path.exists(cert_file) and os.path.exists(key_file):
        ssl_context = (cert_file, key_file)
    
    app.run(host='0.0.0.0',
            port=5000,
            debug=True,
            ssl_context=ssl_context if ssl_context else None
            )
