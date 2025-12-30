"""Migration to add grade_scale table and update report_config table"""

from models import db
from models.grade_scale import GradeScale
from models.report_config import ReportConfig

def upgrade():
    """Add grade_scale table and update report_config table"""
    # Create grade_scale table
    db.create_all()
    
    # Add grade_scale_id column to report_config table if it doesn't exist
    inspector = db.inspect(db.engine)
    columns = [column['name'] for column in inspector.get_columns('report_config')]
    
    if 'grade_scale_id' not in columns:
        # For SQLite, we need to recreate the table with the new column
        # This is a simplified approach - in production, you might want a more robust solution
        with db.engine.connect() as conn:
            # Add the column (SQLite specific approach)
            try:
                conn.execute("ALTER TABLE report_config ADD COLUMN grade_scale_id VARCHAR(36)")
                conn.execute("ALTER TABLE report_config ADD FOREIGN KEY (grade_scale_id) REFERENCES grade_scale(scale_id)")
            except Exception as e:
                # print(f"Column may already exist or other error: {e}")
                pass  # Column might already exist
    
    # Create a default grade scale
    default_scale = GradeScale.query.filter_by(is_default=True).first()
    if not default_scale:
        from models.school import School
        school = School.query.first()
        if school:
            scale = GradeScale(
                school_id=school.school_id,
                name="Default Grade Scale",
                description="Default grading scale for the school",
                is_active=True,
                is_default=True
            )
            
            # Set default grade ranges as specified by the user
            grade_ranges = [
                {"grade": "A", "min_score": 70, "max_score": 100, "remark": "Excellent"},
                {"grade": "B", "min_score": 59, "max_score": 69, "remark": "Very Good"},
                {"grade": "C", "min_score": 49, "max_score": 58, "remark": "Good"},
                {"grade": "D", "min_score": 40, "max_score": 48, "remark": "Pass"},
                {"grade": "F", "min_score": 0, "max_score": 39, "remark": "Fail"}
            ]
            scale.set_grade_ranges(grade_ranges)
            
            db.session.add(scale)
            db.session.commit()

def downgrade():
    """Remove grade_scale table and revert report_config table"""
    # Remove the default grade scale
    default_scale = GradeScale.query.filter_by(is_default=True).first()
    if default_scale:
        db.session.delete(default_scale)
        db.session.commit()
    
    # Note: Dropping tables and columns in SQLite can be complex
    # In a production environment, you would need a more robust downgrade approach
    pass