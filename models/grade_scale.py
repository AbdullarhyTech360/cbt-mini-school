from . import db
from services.generate_uuid import generate_uuid
from datetime import datetime


class GradeScale(db.Model):
    """Model for configurable grading scales"""
    
    __tablename__ = "grade_scale"
    
    scale_id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    
    # Foreign Keys
    school_id = db.Column(db.String(36), db.ForeignKey("school.school_id"), nullable=False)
    
    # Scale information
    name = db.Column(db.String(100), nullable=False)  # e.g., "Default Scale", "Advanced Scale"
    description = db.Column(db.Text, nullable=True)
    
    # Grade ranges (stored as JSON)
    # Example: [{"grade": "A", "min_score": 70, "max_score": 100, "remark": "Excellent"}, ...]
    grade_ranges = db.Column(db.Text, nullable=False)    
    # Status
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_default = db.Column(db.Boolean, nullable=False, default=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    # Relationships
    school = db.relationship("School", backref="grade_scales")
    
    def get_grade_ranges(self):
        """Parse and return grade ranges"""
        import json
        if self.grade_ranges:
            return json.loads(self.grade_ranges)
        # Return default scale if none configured
        return [
            {"grade": "A", "min_score": 70, "max_score": 100, "remark": "Excellent"},
            {"grade": "B", "min_score": 59, "max_score": 69, "remark": "Very Good"},
            {"grade": "C", "min_score": 49, "max_score": 58, "remark": "Good"},
            {"grade": "D", "min_score": 40, "max_score": 48, "remark": "Pass"},
            {"grade": "F", "min_score": 0, "max_score": 39, "remark": "Fail"}
        ]
    
    def set_grade_ranges(self, ranges_list):
        """Set grade ranges from list"""
        import json
        self.grade_ranges = json.dumps(ranges_list)
    
    def get_grade_for_percentage(self, percentage):
        """Get letter grade and remark for a given percentage"""
        ranges = self.get_grade_ranges()
        for range_item in ranges:
            if range_item["min_score"] <= percentage <= range_item["max_score"]:
                return range_item["grade"], range_item.get("remark", "")
        # Default fallback
        return "F", "Fail"
    
    def __repr__(self):
        return f"<GradeScale {self.name}>"
    
    def to_dict(self):
        """Convert grade scale to dictionary"""
        return {
            "scale_id": self.scale_id,
            "school_id": self.school_id,
            "name": self.name,
            "description": self.description,
            "grade_ranges": self.get_grade_ranges(),
            "is_active": self.is_active,
            "is_default": self.is_default,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }