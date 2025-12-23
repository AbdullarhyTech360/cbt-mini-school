from . import db
from services.generate_uuid import generate_uuid
from datetime import datetime


class Permission(db.Model):
    __tablename__ = "permission"
    permission_id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    permission_name = db.Column(db.String(20), nullable=False)
    permission_description = db.Column(db.String(100), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_for = db.Column(db.String(20), nullable=False)
    # exclusions = db.Column(db.String(100), nullable=False)
    permission_created_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow
    )
    permission_updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow
    )

    def to_dict(self):
        """Convert Permission object to a serializable dictionary."""
        return {
            "permission_id": self.permission_id,
            "permission_name": self.permission_name,
            "permission_description": self.permission_description,
            "is_active": self.is_active,
            "created_for": self.created_for,
            "permission_created_at": self.permission_created_at.strftime(
                "%Y-%m-%d %H:%M:%S"
            )
            if self.permission_created_at
            else None,
            "permission_updated_at": self.permission_updated_at.strftime(
                "%Y-%m-%d %H:%M:%S"
            )
            if self.permission_updated_at
            else None,
        }

    def __repr__(self):
        return (
            f"<Permission {self.permission_name} {self.created_for} {self.is_active}>"
        )
