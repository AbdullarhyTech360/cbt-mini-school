from . import db

# Many-to-Many: Teachers and Class Subjects
teacher_subject = db.Table(
    "teacher_subject",
    db.Column("teacher_id", db.String(36), db.ForeignKey("user.id"), primary_key=True),
    db.Column(
        "subject_id",
        db.String(36),
        db.ForeignKey("subject.subject_id"),
        primary_key=True,
    ),
    db.Column(
        "class_room_id",
        db.String(36),
        db.ForeignKey("class_room.class_room_id"),
        primary_key=True,
    ),
)

# Many-to-Many: Students and Subjects (for enrollment)
student_subject = db.Table(
    "student_subject",
    db.Column("student_id", db.String(36), db.ForeignKey("user.id"), primary_key=True),
    db.Column(
        "subject_id",
        db.String(36),
        db.ForeignKey("subject.subject_id"),
        primary_key=True,
    ),
)

# Many-to-Many: Teachers and ClassRooms (teachers can teach multiple classes)
teacher_classroom = db.Table(
    "teacher_classroom",
    db.Column("teacher_id", db.String(36), db.ForeignKey("user.id"), primary_key=True),
    db.Column(
        "classroom_id",
        db.String(36),
        db.ForeignKey("class_room.class_room_id"),
        primary_key=True,
    ),
)

# class-subject
class_subject = db.Table(
    "class_subject",
    db.Column("class_room_id", db.String(36), db.ForeignKey("class_room.class_room_id"), primary_key=True),
    db.Column("subject_id", db.String(36), db.ForeignKey("subject.subject_id"), primary_key=True),
)

# Many-to-Many: Students and Exams (tracks completed exams)
student_exam = db.Table(
    "student_exam",
    db.Column("student_id", db.String(36), db.ForeignKey("user.id"), primary_key=True),
    db.Column("exam_id", db.String(36), db.ForeignKey("exams.id"), primary_key=True),
    db.Column("score", db.Float, nullable=True),
    db.Column("completed_at", db.DateTime, nullable=True),
    db.Column("time_taken", db.Integer, nullable=True),  # in seconds
)
