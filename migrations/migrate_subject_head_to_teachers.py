"""
Migrate subject heads to teacher_subject records.

For every subject that has a subject_head_id set, create teacher_subject
records linking that teacher to every class the subject is offered in
(via the class_subject table). Keeps subject_head_id intact — the
teacher remains the subject overseer AND becomes a class teacher.
"""
from sqlalchemy import text
from models import db


def upgrade():
    from models.subject import Subject
    from models.associations import teacher_subject, class_subject

    subjects_with_head = Subject.query.filter(
        Subject.subject_head_id.isnot(None)
    ).all()

    created = 0
    skipped = 0

    for subject in subjects_with_head:
        teacher_id = subject.subject_head_id

        # Get all classes this subject is linked to
        class_links = db.session.execute(
            db.select(class_subject).where(
                class_subject.c.subject_id == subject.subject_id
            )
        ).fetchall()

        for link in class_links:
            class_room_id = link.class_room_id

            # Check if record already exists
            existing = db.session.execute(
                db.select(teacher_subject).where(
                    teacher_subject.c.teacher_id == teacher_id,
                    teacher_subject.c.subject_id == subject.subject_id,
                    teacher_subject.c.class_room_id == class_room_id,
                )
            ).fetchone()

            if existing:
                skipped += 1
                continue

            db.session.execute(
                teacher_subject.insert().values(
                    teacher_id=teacher_id,
                    subject_id=subject.subject_id,
                    class_room_id=class_room_id,
                )
            )
            created += 1

    db.session.commit()
    print(f"[migration] Subject head -> teacher_subject: {created} created, {skipped} already existed")
