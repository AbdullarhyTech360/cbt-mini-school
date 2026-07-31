from models.question import Question


def get_questions_for_exam(subject_id=None, class_room_id=None, term_id=None):
    """Base query for questions matching exam criteria.

    This is the canonical query used across the app to determine
    which questions belong to an exam. Questions are matched by
    subject, class, and school term.

    Callers can pass individual parameters or unpack an exam object:
        get_questions_for_exam(
            subject_id=exam.subject_id,
            class_room_id=exam.class_room_id,
            term_id=exam.school_term_id
        )

    Returns a SQLAlchemy BaseQuery object (call .all(), .count(), etc.)
    """
    query = Question.query
    if subject_id:
        query = query.filter_by(subject_id=subject_id)
    if class_room_id:
        query = query.filter_by(class_room_id=class_room_id)
    if term_id:
        query = query.filter_by(term_id=term_id)
    return query
