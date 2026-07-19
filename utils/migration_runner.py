"""
Auto-migration runner for CBT Mini School.

Scans the migrations/ folder on app startup, tracks applied migrations
in a _migrations table, and runs any pending ones automatically.
"""

import importlib
import os
import sys
from datetime import datetime, timezone

from sqlalchemy import text


def _ensure_migrations_table(db):
    """Create the _migrations tracking table if it doesn't exist."""
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS _migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL UNIQUE,
            applied_at TEXT NOT NULL
        )
    """))
    db.session.commit()


def _get_applied_migrations(db):
    """Return set of already-applied migration filenames."""
    result = db.session.execute(text("SELECT filename FROM _migrations"))
    return {row[0] for row in result.fetchall()}


def _discover_migrations(migrations_dir):
    """Return sorted list of .py migration filenames (excluding __init__ and __pycache__)."""
    files = []
    for f in os.listdir(migrations_dir):
        if f.endswith(".py") and f != "__init__.py":
            files.append(f)
    files.sort()
    return files


def _import_migration(migrations_dir, filename):
    """Dynamically import a migration module from the migrations/ folder."""
    module_name = f"migrations.{filename[:-3]}"

    # Ensure parent dirs are importable
    parent_dir = os.path.dirname(migrations_dir)
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)

    # If already imported, reload to pick up any changes
    if module_name in sys.modules:
        return importlib.reload(sys.modules[module_name])

    return importlib.import_module(module_name)


def _is_expected_error(error):
    """Check if an error means the desired change already exists (safe to skip)."""
    msg = str(error).lower()
    expected = [
        "duplicate column name",
        "already exists",
    ]
    return any(pattern in msg for pattern in expected)


def _record_migration(db, filename):
    """Record a migration as applied in the tracking table."""
    db.session.execute(
        text("INSERT OR IGNORE INTO _migrations (filename, applied_at) VALUES (:fn, :at)"),
        {"fn": filename, "at": datetime.now(timezone.utc).isoformat()},
    )
    db.session.commit()


def run_pending_migrations(app):
    """
    Scan migrations/ and run any that haven't been applied yet.
    Called from app.py after db.create_all().
    """
    migrations_dir = os.path.join(app.root_path, "migrations")
    migrations_dir = os.path.abspath(migrations_dir)

    if not os.path.isdir(migrations_dir):
        print("[migrations] No migrations/ folder found, skipping.")
        return

    with app.app_context():
        from models import db

        _ensure_migrations_table(db)
        applied = _get_applied_migrations(db)
        all_files = _discover_migrations(migrations_dir)
        pending = [f for f in all_files if f not in applied]

        if not pending:
            print("[migrations] All migrations applied.")
            return

        print(f"[migrations] {len(pending)} pending migration(s) found.")

        for filename in pending:
            try:
                module = _import_migration(migrations_dir, filename)

                # Standardize on upgrade() as the entry point
                if not hasattr(module, "upgrade"):
                    print(f"[migrations] WARNING: {filename} has no upgrade() function, skipping.")
                    continue

                module.upgrade()

                # Record as applied
                _record_migration(db, filename)
                print(f"[migrations] ✓ Applied: {filename}")

            except Exception as e:
                db.session.rollback()

                # If the error means the change already exists, treat as success
                if _is_expected_error(e):
                    _record_migration(db, filename)
                    print(f"[migrations] ✓ Applied (already exists): {filename}")
                else:
                    print(f"[migrations] ✗ FAILED: {filename} — {e}")
                    # Continue with next migration instead of crashing the app
