import json
import logging
import os
from datetime import timedelta

from flask import Flask, jsonify, render_template, request, send_from_directory, session

from config import Config
from models import bcrypt, db
from models.school import School
from models.user import User
from routes.admin_action_routes import admin_action_route
from routes.auth_routes import auth_routes
from routes.dashboard import dashboard_route
from routes.session_monitor_routes import session_monitor_routes
from routes.staff_routes import staff_routes
from routes.student_routes import student_route

# Conditionally import report routes based on availability
try:
    from routes.report_routes import report_bp
except (ImportError, OSError) as e:
    print(f"Warning: Report routes not available due to missing dependencies: {e}")
    report_bp = None


# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Explicitly set session configuration
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=1)
app.config["SESSION_REFRESH_EACH_REQUEST"] = True

# Increase max content length for file uploads (100MB)
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024

db.init_app(app)
bcrypt.init_app(app)


# Custom logging filter to suppress SSL-related bad request errors


class SSLFilter(logging.Filter):
    def filter(self, record):
        # Suppress specific SSL/TLS handshake error messages
        message = record.getMessage()
        if (
            message.startswith("code 400, message Bad request syntax")
            or "Bad request version" in message
            or "Bad request syntax" in message
            or (
                "\x16\x03" in message
                and ("\x01" in message or "\x02" in message or "\x03" in message)
            )
        ):
            return False
        return True


# Apply the filter to the werkzeug logger to suppress SSL-related errors
log = logging.getLogger("werkzeug")
log.addFilter(SSLFilter())

# Reduce werkzeug logging level to reduce noise from malformed requests
logging.getLogger("werkzeug").setLevel(logging.WARNING)


# WSGI middleware to handle malformed SSL handshake requests


class SSLHandshakeMiddleware:
    def __init__(self, app):
        self.app = app

    def __call__(self, environ, start_response):
        # Check if this looks like an SSL handshake request
        try:
            # Get the raw request data if possible
            if "wsgi.input" in environ:
                # This is complex to handle at WSGI level, so we'll focus on the logging approach
                # The main issue is handled by the logging filter above
                return self.app(environ, start_response)
        except Exception:
            # If there's an issue processing the request, let it fail normally
            return self.app(environ, start_response)


# Wrap the app with the middleware
app.wsgi_app = SSLHandshakeMiddleware(app.wsgi_app)  # type: ignore


@app.template_filter("from_json")
def from_json(value):
    try:
        return json.loads(value) if value else {}
    except (TypeError, json.JSONDecodeError):
        return {}


# Debug route to check session (remove in production)


@app.route("/debug/session")
def debug_session():
    from flask import session

    return {
        "session_data": dict(session),
        "permanent": session.permanent,
        "modified": session.modified,
        "config": {
            "PERMANENT_SESSION_LIFETIME": str(
                app.config.get("PERMANENT_SESSION_LIFETIME")
            ),
            "SESSION_REFRESH_EACH_REQUEST": app.config.get(
                "SESSION_REFRESH_EACH_REQUEST"
            ),
        },
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

    # Auto-initialize default data on first startup if enabled
    if app.config.get("AUTO_INITIALIZE_DATA", True):
        instance_dir = os.path.join(os.path.dirname(__file__), "instance")
        flag_file = os.path.join(instance_dir, ".initialized")

        if not os.path.exists(flag_file):
            try:
                print("=" * 80)
                print("FIRST TIME STARTUP - INITIALIZING DEFAULT DATA...")
                print("=" * 80)
                from initialize_all_data import main as initialize_main

                initialize_main()
                print("=" * 80)
                print("✅ DEFAULT DATA INITIALIZATION COMPLETE!")
                print("=" * 80)
                print("\nDefault Login Credentials:")
                print("\nAdmin Account:")
                print("  Username: admin")
                print("  Password: aaaa")
                print("\nTeacher Accounts:")
                print("  Username: teacher1, Password: teacher123")
                print("  Username: teacher2, Password: teacher123")
                print("\nStudent Accounts:")
                print("  Username: student1, Password: student123")
                print("  Username: student2, Password: student123")
                print("  Username: student3, Password: student123")
                print("=" * 80)
            except Exception as e:
                print(f"⚠️  Error during data initialization: {e}")
                print("Continuing with app startup...")
        else:
            print("✓ App already initialized - skipping default data creation")
    else:
        print("AUTO_INITIALIZE_DATA is disabled - skipping default data creation")


# Root route
@app.route("/")
def index():
    return render_template("main/index.html")


# Make school info available in all templates
@app.context_processor
def inject_school_info():
    try:
        school = School.query.first()
        school_name = (
            school.school_name if school and school.school_name else "Your School"
        )
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


# Error handlers to render custom templates for HTML requests
@app.errorhandler(404)
def handle_404(err):
    # Return JSON for API/JSON requests, HTML template for browsers
    try:
        if request.path.startswith("/api") or (
            request.accept_mimetypes.accept_json
            and not request.accept_mimetypes.accept_html
        ):
            return jsonify({"error": "Not found"}), 404
    except Exception:
        pass
    return render_template("errors/404.html"), 404


@app.errorhandler(500)
def handle_500(err):
    # Log the exception and return appropriate response
    logging.exception(err)
    try:
        if request.path.startswith("/api") or (
            request.accept_mimetypes.accept_json
            and not request.accept_mimetypes.accept_html
        ):
            return jsonify({"error": "Server error"}), 500
    except Exception:
        pass
    return render_template("errors/500.html"), 500


# Route to serve uploaded files
@app.route("/uploads/<path:filepath>")
def serve_uploads(filepath):
    """Serve uploaded files"""
    upload_dir = os.path.join(os.path.dirname(__file__), "static", "uploads")
    try:
        return send_from_directory(upload_dir, filepath)
    except FileNotFoundError:
        # Log the error and return a 404
        print(f"File not found: {filepath} in directory {upload_dir}")
        from flask import abort

        abort(404)


# Route to serve node_modules for client-side libraries
@app.route("/node_modules/<path:filepath>")
def serve_node_modules(filepath):
    """Serve node_modules files"""
    return send_from_directory(
        os.path.join(os.path.dirname(__file__), "node_modules"), filepath
    )


if __name__ == "__main__":
    # Check if SSL certificate files exist, if not, run without SSL
    ssl_context = None
    cert_file = os.path.join(os.path.dirname(__file__), "cert.pem")
    key_file = os.path.join(os.path.dirname(__file__), "key.pem")

    if os.path.exists(cert_file) and os.path.exists(key_file):
        ssl_context = (cert_file, key_file)

    app.run(
        host="0.0.0.0",
        port=8000,
        debug=True,
        ssl_context=ssl_context if ssl_context else None,
    )
