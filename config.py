import os
from datetime import timedelta

from utils.paths import get_app_root, get_data_dir, get_db_uri, get_uploads_dir, get_school_logos_dir


class Config:
    SECRET_KEY = "dev-secret-key-change-in-production"  # Proper secret key for sessions
    SQLALCHEMY_DATABASE_URI = get_db_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Base Directory (read-only app root for bundled assets)
    BASE_DIR = get_app_root()

    # Data Directory (writable — for DB, uploads)
    DATA_DIR = get_data_dir()

    # Session Configuration
    SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
    SESSION_COOKIE_HTTPONLY = True  # Prevent JavaScript access to session cookie
    SESSION_COOKIE_SAMESITE = 'Lax'  # CSRF protection
    PERMANENT_SESSION_LIFETIME = timedelta(days=1)  # 24 hours (1 day)
    SESSION_REFRESH_EACH_REQUEST = True  # Refresh session on each request

    # File Upload Configuration
    UPLOAD_FOLDER = get_uploads_dir()
    SCHOOL_LOGO_FOLDER = get_school_logos_dir()
    MAX_CONTENT_LENGTH = 2 * 1024 * 1024  # 2MB max file size
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}

    # Auto-initialization Configuration
    AUTO_INITIALIZE_DATA = os.environ.get("AUTO_INITIALIZE_DATA", "true").lower() == "true"
