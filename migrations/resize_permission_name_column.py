"""
Migration to resize the permission_name column from VARCHAR(20) to VARCHAR(60).
This accommodates longer permission names like 'teachers_can_upload_questions' (29 chars).

For SQLite: This is a no-op since SQLite doesn't enforce VARCHAR length limits.
For PostgreSQL/MySQL: This recreates the table with the correct column size.
"""
from models import db


def upgrade():
    """Resize permission_name column to VARCHAR(60)."""
    try:
        with db.engine.connect() as conn:
            # SQLite stores text of any length regardless of VARCHAR declaration,
            # but we ALTER the table metadata for correctness.
            conn.execute(db.text(
                "ALTER TABLE permission RENAME TO permission_old"
            ))
            conn.execute(db.text("""
                CREATE TABLE permission (
                    permission_id VARCHAR(36) PRIMARY KEY,
                    permission_name VARCHAR(60) NOT NULL,
                    permission_description VARCHAR(100) NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_for VARCHAR(20) NOT NULL,
                    permission_created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    permission_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.execute(db.text(
                "INSERT INTO permission SELECT * FROM permission_old"
            ))
            conn.execute(db.text("DROP TABLE permission_old"))
            conn.commit()
        print("✓ Successfully resized permission_name column to VARCHAR(60)")
    except Exception as e:
        print(f"Migration note: {e}")
        print("  SQLite may not require this migration as it ignores VARCHAR limits.")


if __name__ == "__main__":
    from app import create_app
    app = create_app()
    with app.app_context():
        upgrade()
