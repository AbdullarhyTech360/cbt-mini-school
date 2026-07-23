"""
Path resolution utility for both development and PyInstaller-bundled execution.

Simple rule:
  - Dev mode (python app.py):       data lives in instance/  (project root)
  - Compiled (.exe):                data lives in data/      (next to the .exe)

No renaming, no migration, no fallback. Each mode uses its own directory.
"""

import os
import sys


def is_frozen() -> bool:
    """Return True if running in a PyInstaller bundle."""
    return getattr(sys, "frozen", False)


def get_app_root() -> str:
    """
    Root of read-only bundled assets.

    Frozen: sys._MEIPASS (temp extraction dir).
    Script: project root (parent of utils/).
    """
    if is_frozen():
        return sys._MEIPASS
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def get_data_dir() -> str:
    """
    Return the writable data directory.

    - Dev mode (script):  <project-root>/instance/
    - Compiled (.exe):    <exe-dir>/data/

    The directory is created automatically on first run.
    """
    if is_frozen():
        d = os.path.join(os.path.dirname(sys.executable), "data")
    else:
        d = os.path.join(get_app_root(), "instance")

    os.makedirs(d, exist_ok=True)
    return d


def get_db_path() -> str:
    """Full path to the SQLite database file."""
    return os.path.join(get_data_dir(), "users.db")


def get_db_uri() -> str:
    """SQLAlchemy database URI for SQLite."""
    return "sqlite:///" + get_db_path()


def get_uploads_dir() -> str:
    """Uploads directory within the data directory."""
    d = os.path.join(get_data_dir(), "static", "uploads")
    os.makedirs(d, exist_ok=True)
    return d


def get_school_logos_dir() -> str:
    """School logos directory within uploads."""
    d = os.path.join(get_uploads_dir(), "school_logos")
    os.makedirs(d, exist_ok=True)
    return d


def get_profile_images_dir() -> str:
    """Profile images directory within uploads."""
    d = os.path.join(get_uploads_dir(), "profile_images")
    os.makedirs(d, exist_ok=True)
    return d


def get_node_modules_dir() -> str:
    """node_modules path (bundled or dev)."""
    return os.path.join(get_app_root(), "node_modules")


def get_cert_path() -> str:
    """Path to cert.pem."""
    return os.path.join(get_app_root(), "cert.pem")


def get_key_path() -> str:
    """Path to key.pem."""
    return os.path.join(get_app_root(), "key.pem")
