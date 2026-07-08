from . import db
from services.generate_uuid import generate_uuid


class TraitDefinition(db.Model):
    __tablename__ = "trait_definition"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    school_id = db.Column(db.String(36), db.ForeignKey("school.school_id"), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    max_score = db.Column(db.Float, nullable=False, default=5.0)
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    school = db.relationship("School", backref="trait_definitions")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "max_score": self.max_score,
            "sort_order": self.sort_order,
            "is_active": self.is_active,
        }

    def __repr__(self):
        return f"<TraitDefinition {self.name}>"
