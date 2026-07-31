import json
import logging
import os
import sys
from datetime import timedelta

# ---------------------------------------------------------------------------
# LICENSE VERIFICATION — runs BEFORE Flask initialization
# ---------------------------------------------------------------------------

def _run_license_check():
    """Handle --get-hwid flag and license verification before app starts."""
    from utils.license_display import (
        print_banner,
        print_error,
        print_hwid_header,
        print_info,
        print_ok,
        pause_and_exit,
    )
    from utils.license_manager import get_hwid, verify_license

    # Handle --skip-license flag (dev convenience)
    if "--skip-license" in sys.argv:
        return

    # Handle --get-hwid flag
    if "--get-hwid" in sys.argv:
        print_hwid_header()
        print_info("Your Hardware ID is:")
        print()
        print(f"    {get_hwid()}")
        print()
        print_info("Send this ID to your supplier to receive your license.")
        pause_and_exit("Press Enter to exit...", exit_code=0)

    # Run license verification
    print_banner()
    is_valid, message, school_name = verify_license()

    if is_valid:
        print_ok(message)
        print_ok("Starting application...")
        print()
    else:
        print_error(message)
        print()
        print_info("To activate this application, please:")
        print_info("  1. Run: app.exe --get-hwid")
        print_info("  2. Send the displayed Hardware ID to your supplier")
        print_info("  3. Place the received 'license.lic' file next to app.exe")
        print_info("  4. Run app.exe again")
        print()
        print_info("For help, contact your software supplier.")
        pause_and_exit()


_run_license_check()
# ---------------------------------------------------------------------------
# End license verification
# ---------------------------------------------------------------------------

from flask import Flask, jsonify, redirect, render_template, request, send_from_directory, session, url_for

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
from routes.promotion_routes import promotion_routes
from routes.on_the_go_routes import on_the_go_route

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

# Increase max content length for file uploads (5MB)
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024

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
    current_user = db.session.get(User, session.get("user_id"))

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
promotion_routes(app)
on_the_go_route(app)
if report_bp:
    app.register_blueprint(report_bp)
# Initialize the database
with app.app_context():
    db.create_all()

    # Seed default permissions
    from routes.admin_action_routes import initialize_default_permissions
    initialize_default_permissions()

    # Run pending migrations automatically
    from utils.migration_runner import run_pending_migrations
    run_pending_migrations(app)

    # Auto-initialize default data on first startup if enabled
    if app.config.get("AUTO_INITIALIZE_DATA", True):
        admin_exists = User.query.filter_by(role="admin").first() is not None

        if not admin_exists:
            try:
                print("=" * 80)
                print("FIRST TIME STARTUP - INITIALIZING DEFAULT DATA...")
                print("=" * 80)
                from scripts.setup.initialize_all_data import main as initialize_main

                initialize_main()
                print("=" * 80)
                print("✅ DEFAULT DATA INITIALIZATION COMPLETE!")
                print("=" * 80)
                print("\nDefault Login Credentials:")
                print("\nAdmin Account:")
                print("  Username: admin")
                print("  Password: aaaa")
                print("=" * 80)
            except Exception as e:
                print(f"⚠️  Error during data initialization: {e}")
                print("Continuing with app startup...")
        else:
            print("[OK] App already initialized - skipping default data creation")
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
        # Build logo URL; fall back to default if none uploaded
        logo_url = url_for('static', filename='default-logo.svg')
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
        return {"school_info": {"name": "Your School", "logo_url": url_for('static', filename='default-logo.svg')}}


@app.context_processor
def inject_form_master_status():
    """Make is_form_master available to all staff templates."""
    from models.class_room import ClassRoom

    try:
        user_id = session.get("user_id")
        user = db.session.get(User, user_id) if user_id else None
        if user and user.role == "staff":
            is_form_master = ClassRoom.query.filter_by(
                form_teacher_id=user_id, is_active=True
            ).first() is not None
            return {"is_form_master": is_form_master}
    except Exception:
        pass
    return {"is_form_master": False}


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
    """Serve uploaded files from the data directory"""
    from utils.paths import get_uploads_dir
    upload_dir = get_uploads_dir()
    try:
        return send_from_directory(upload_dir, filepath)
    except FileNotFoundError:
        return send_from_directory(app.static_folder, "default-logo.svg")


# Route to serve node_modules for client-side libraries
@app.route("/node_modules/<path:filepath>")
def serve_node_modules(filepath):
    """Serve node_modules files from the app root"""
    from utils.paths import get_node_modules_dir
    return send_from_directory(get_node_modules_dir(), filepath)


if __name__ == "__main__":
    # Check if SSL certificate files exist, if not, run without SSL
    ssl_context = None
    from utils.paths import get_cert_path, get_key_path
    cert_file = get_cert_path()
    key_file = get_key_path()

    if os.path.exists(cert_file) and os.path.exists(key_file):
        ssl_context = (cert_file, key_file)

    app.run(
        host="0.0.0.0",
        port=8000,
        debug=True,
        ssl_context=ssl_context if ssl_context else None,
    )
