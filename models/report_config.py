from . import db
from services.generate_uuid import generate_uuid
from datetime import datetime
import json


class ReportConfig(db.Model):
    """Model for configurable report settings and exam merging"""

    __tablename__ = "report_config"

    config_id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    
    # School and term association
    school_id = db.Column(db.String(36), db.ForeignKey("school.school_id"), nullable=False)
    term_id = db.Column(db.String(36), db.ForeignKey("school_term.term_id"), nullable=True)
    class_room_id = db.Column(db.String(500), nullable=True)
    section_id = db.Column(db.String(36), db.ForeignKey("section.section_id"), nullable=True)
    
    # Configuration name
    config_name = db.Column(db.String(200), nullable=False)  # e.g., "End of Term Report"
    
    # Exam merging configuration (stored as JSON)
    # Example: {"merged_exams": [{"name": "Final Exam", "components": ["cbt", "exam"], "display_as": "exam"}]}
    merge_config = db.Column(db.Text, nullable=True)
    
    # Display settings (stored as JSON)
    # Example: {"show_logo": true, "show_student_image": true, "show_position": true}
    display_settings = db.Column(db.Text, nullable=True)
    
    # Active assessments to include in report
    active_assessments = db.Column(db.Text, nullable=True)  # JSON array of assessment codes
    
    # Add grading scale configuration
    grade_scale_id = db.Column(db.String(36), db.ForeignKey("grade_scale.scale_id"), nullable=True)
    
    # Status
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_default = db.Column(db.Boolean, nullable=False, default=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Date
    resumption_date = db.Column(db.Date, nullable=True, default=datetime.utcnow)
    
    # Layout configuration (stored as JSON)
    # Example: {"template": "modern_portrait", "page_settings": {...}, "sections": [...]}
    layout_config = db.Column(db.Text, nullable=True)
    
    # School fees for next term (free-text to allow notes like "₦45,000 including hostel")
    next_term_fees = db.Column(db.String(300), nullable=True)

    # Custom data fields (stored as JSON)
    # Example: [{"field_name": "attendance", "data_type": "number", "label": "Days Present"}]
    custom_data_fields = db.Column(db.Text, nullable=True)
    
    # Relationships
    school = db.relationship("School", backref="report_configs")
    term = db.relationship("SchoolTerm", backref="report_configs")
    # class_room removed — class_room_id now stores comma-separated IDs
    section = db.relationship("Section", backref="report_configs")
    # Add relationship to GradeScale
    grade_scale = db.relationship("GradeScale", backref="report_configs")

    def get_merge_config(self):
        """Parse and return merge configuration"""
        if self.merge_config:
            return json.loads(self.merge_config)
        return {"merged_exams": []}

    def set_merge_config(self, config_dict):
        """Set merge configuration from dictionary"""
        self.merge_config = json.dumps(config_dict)

    def get_display_settings(self):
        """Parse and return display settings"""
        if self.display_settings:
            return json.loads(self.display_settings)
        return {
            "show_logo": True,
            "show_student_image": True,
            "show_position": True,
            "show_class_teacher_comment": True,
            "show_principal_comment": True
        }

    def set_display_settings(self, settings_dict):
        """Set display settings from dictionary"""
        self.display_settings = json.dumps(settings_dict)

    def get_active_assessments(self):
        """Parse and return active assessments"""
        if self.active_assessments:
            return json.loads(self.active_assessments)
        return []

    def set_active_assessments(self, assessments_list):
        """Set active assessments from list"""
        self.active_assessments = json.dumps(assessments_list)

    def get_layout_config(self):
        """Parse and return layout configuration"""
        if self.layout_config:
            return json.loads(self.layout_config)
        return None

    def set_layout_config(self, config_dict):
        """Set layout configuration from dictionary"""
        self.layout_config = json.dumps(config_dict)

    def get_custom_data_fields(self):
        """Parse and return custom data fields"""
        if self.custom_data_fields:
            return json.loads(self.custom_data_fields)
        return []

    def set_custom_data_fields(self, fields_list):
        """Set custom data fields from list"""
        self.custom_data_fields = json.dumps(fields_list)

    def __repr__(self):
        return f"<ReportConfig {self.config_name}>"

    def to_dict(self):
        """Convert report config to dictionary"""
        return {
            "config_id": self.config_id,
            "school_id": self.school_id,
            "term_id": self.term_id,
            "class_room_id": self.class_room_id,
            "section_id": self.section_id,
            "config_name": self.config_name,
            "resumption_date": self.resumption_date.isoformat() if self.resumption_date else None,
            "merge_config": self.get_merge_config(),
            "display_settings": self.get_display_settings(),
            "active_assessments": self.get_active_assessments(),
            "grade_scale_id": self.grade_scale_id,
            "layout_config": self.get_layout_config(),
            "custom_data_fields": self.get_custom_data_fields(),
            "next_term_fees": self.next_term_fees or "",
            "is_active": self.is_active,
            "is_default": self.is_default,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }