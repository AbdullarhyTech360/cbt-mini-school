"""Migration to add grade_scale_section association table"""
from models import db
from app import app


def upgrade():
    """Create grade_scale_section association table"""
    with app.app_context():
        import sqlalchemy as sa
        from sqlalchemy import inspect

        inspector = inspect(db.engine)
        existing_tables = inspector.get_table_names()

        if "grade_scale_section" not in existing_tables:
            db.session.execute(
                sa.text(
                    """
                    CREATE TABLE grade_scale_section (
                        scale_id VARCHAR(36) NOT NULL,
                        section_id VARCHAR(36) NOT NULL,
                        PRIMARY KEY (scale_id, section_id),
                        FOREIGN KEY (scale_id) REFERENCES grade_scale(scale_id) ON DELETE CASCADE,
                        FOREIGN KEY (section_id) REFERENCES section(section_id) ON DELETE CASCADE
                    )
                    """
                )
            )
            db.session.commit()
            print("Created grade_scale_section table")
        else:
            print("grade_scale_section table already exists")


def downgrade():
    """Drop grade_scale_section association table"""
    with app.app_context():
        import sqlalchemy as sa
        from sqlalchemy import inspect

        inspector = inspect(db.engine)
        existing_tables = inspector.get_table_names()

        if "grade_scale_section" in existing_tables:
            db.session.execute(sa.text("DROP TABLE grade_scale_section"))
            db.session.commit()
            print("Dropped grade_scale_section table")
        else:
            print("grade_scale_section table does not exist")


if __name__ == "__main__":
    print("Running migration: Add grade_scale_section table")
    upgrade()
    print("Migration completed successfully!")
