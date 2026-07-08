from . import db
from services.generate_uuid import generate_uuid


class StudentTrait(db.Model):
    __tablename__ = "student_trait"

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    student_id = db.Column(db.String(36), db.ForeignKey("user.id"), nullable=False)
    term_id = db.Column(db.String(36), db.ForeignKey("school_term.term_id"), nullable=False)
    trait_id = db.Column(db.String(36), db.ForeignKey("trait_definition.id"), nullable=True)
    score = db.Column(db.Float, nullable=False, default=0.0)

    student = db.relationship("User", foreign_keys=[student_id], backref="student_traits")
    term = db.relationship("SchoolTerm", backref="student_traits")
    trait_definition = db.relationship("TraitDefinition", backref="student_traits")

    __table_args__ = (
        db.UniqueConstraint("student_id", "term_id", "trait_id", name="uq_student_trait_per_term"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "term_id": self.term_id,
            "trait_id": self.trait_id,
            "trait_name": self.trait_definition.name if self.trait_definition else None,
            "max_score": self.trait_definition.max_score if self.trait_definition else None,
            "score": self.score,
        }

    def __repr__(self):
        return f"<StudentTrait student={self.student_id} trait={self.trait_id} score={self.score}>"
