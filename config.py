import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
INSTANCE_DIR = os.path.join(BASE_DIR, "instance")
os.makedirs(INSTANCE_DIR, exist_ok=True)


class Config:
    SECRET_KEY = "dev-secret-key-change-in-production"  # Proper secret key for sessions
    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(
        INSTANCE_DIR, "users.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Base Directory
    BASE_DIR = BASE_DIR

    # Session Configuration
    SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
    SESSION_COOKIE_HTTPONLY = True  # Prevent JavaScript access to session cookie
    SESSION_COOKIE_SAMESITE = 'Lax'  # CSRF protection
    PERMANENT_SESSION_LIFETIME = timedelta(days=1)  # 24 hours (1 day)
    SESSION_REFRESH_EACH_REQUEST = True  # Refresh session on each request

    # File Upload Configuration
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "uploads")
    SCHOOL_LOGO_FOLDER = os.path.join(UPLOAD_FOLDER, "school_logos")
    MAX_CONTENT_LENGTH = 2 * 1024 * 1024  # 2MB max file size
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}

    # Auto-initialization Configuration
    AUTO_INITIALIZE_DATA = os.environ.get("AUTO_INITIALIZE_DATA", "true").lower() == "true"
