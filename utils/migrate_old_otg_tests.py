"""
Data migration: Convert old Exam-based On-The-Go tests to new OnTheGoTest model.

For each Exam where is_on_the_go=True:
  1. Create an OnTheGoTest record (reuse same ID for FK consistency)
  2. Create OnTheGoResult records from existing ExamRecord records
  3. Create OnTheGoTestSession records from existing ExamSession records
  4. Create student_on_the_go_test records from existing student_exam entries
  5. Deactivate the old OTG Exam record (is_active=False)

Run with:
  .venv/bin/python3 -c "exec(open('utils/migrate_old_otg_tests.py').read())" --skip-license
"""

import os
import sys

# Ensure project root is importable
_project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)


def run_migration(skip_license=False):
    """Run the OTG data migration."""
    if skip_license:
        sys.argv.append("--skip-license")

    from app import app
    from models import db
    from models.exam import Exam
    from models.exam_record import ExamRecord
    from models.exam_session import ExamSession
    from models.associations import student_exam
    from models.on_the_go_test import (
        OnTheGoTest,
        OnTheGoResult,
        OnTheGoTestSession,
        student_on_the_go_test,
    )
    from models.user import User

    with app.app_context():
        # ---------------------------------------------------------------
        # Find all old OTG exams
        # ---------------------------------------------------------------
        old_otg_exams = Exam.query.filter_by(is_on_the_go=True).all()
        print(f"Found {len(old_otg_exams)} old OTG exam(s) to migrate.")

        if not old_otg_exams:
            print("Nothing to migrate.")
            return

        # Find a fallback user for created_by_id
        fallback_user = User.query.filter_by(role="admin").first()
        if not fallback_user:
            fallback_user = (
                User.query.filter(User.role.in_(["admin", "super_admin"])).first()
            )
        if not fallback_user:
            fallback_user = User.query.first()

        if not fallback_user:
            print("ERROR: No user found to set as created_by_id. Aborting.")
            sys.exit(1)

        print(f"  Fallback user: {fallback_user.email or fallback_user.id}")

        migrated_count = 0
        skipped_count = 0

        for exam in old_otg_exams:
            # Check if already migrated
            if OnTheGoTest.query.get(exam.id):
                print(f"  ⏭  Skipping '{exam.name}' — OnTheGoTest with same ID exists.")
                skipped_count += 1
                continue

            print(f"\n  ── Migrating '{exam.name}' (ID: {exam.id}) ──")

            # ---------------------------------------------------------------
            # 1. Create OnTheGoTest record
            # ---------------------------------------------------------------
            otg_test = OnTheGoTest(
                id=exam.id,
                title=exam.name,
                description=exam.description,
                instructions=exam.instructions,
                subject_id=exam.subject_id,
                class_room_id=exam.class_room_id,
                duration=exam.duration,
                max_score=exam.max_score,
                number_of_questions=exam.number_of_questions,
                calculator_enabled=exam.calculator_enabled,
                show_feedback=exam.show_feedback,
                save_after_completion=exam.save_after_completion,
                access_code=None,  # Old exams don't have this field
                is_active=exam.is_active,
                is_finished=exam.is_finished,
                started_at=exam.time_started,
                ended_at=exam.time_ended,
                created_by_id=exam.invigilator_id or fallback_user.id,
            )
            db.session.add(otg_test)
            db.session.flush()  # Ensure ID is available for FK references

            # ---------------------------------------------------------------
            # 2. Migrate ExamRecord → OnTheGoResult
            # ---------------------------------------------------------------
            old_records = ExamRecord.query.filter_by(exam_id=exam.id).all()
            for record in old_records:
                result = OnTheGoResult(
                    id=record.id,
                    on_the_go_test_id=exam.id,
                    student_id=record.student_id,
                    answers=record.answers,
                    correct_answers=record.correct_answers,
                    total_questions=record.total_questions,
                    score_percentage=record.score_percentage,
                    raw_score=record.raw_score,
                    max_score=record.max_score,
                    letter_grade=record.letter_grade,
                    started_at=record.started_at,
                    submitted_at=record.submitted_at,
                    created_at=record.created_at,
                    updated_at=record.updated_at,
                )
                db.session.add(result)

            if old_records:
                print(f"    ✓ {len(old_records)} result(s) migrated")

            # ---------------------------------------------------------------
            # 3. Migrate ExamSession → OnTheGoTestSession
            # ---------------------------------------------------------------
            old_sessions = ExamSession.query.filter_by(exam_id=exam.id).all()
            for session in old_sessions:
                new_session = OnTheGoTestSession(
                    id=session.id,
                    student_id=session.student_id,
                    on_the_go_test_id=exam.id,
                    current_question_index=session.current_question_index,
                    time_remaining=session.time_remaining,
                    answers=session.answers,
                    question_order=session.question_order,
                    is_active=session.is_active,
                    is_completed=session.is_completed,
                    started_at=session.started_at,
                    last_activity=session.last_activity,
                    completed_at=session.completed_at,
                    created_at=session.created_at,
                    updated_at=session.updated_at,
                )
                db.session.add(new_session)

            if old_sessions:
                print(f"    ✓ {len(old_sessions)} session(s) migrated")

            # ---------------------------------------------------------------
            # 4. Migrate student_exam → student_on_the_go_test
            # ---------------------------------------------------------------
            old_entries = db.session.execute(
                student_exam.select().where(student_exam.c.exam_id == exam.id)
            ).fetchall()

            for entry in old_entries:
                stmt = student_on_the_go_test.insert().values(
                    student_id=entry.student_id,
                    on_the_go_test_id=exam.id,
                    score=entry.score,
                    completed_at=entry.completed_at,
                    time_taken=entry.time_taken,
                )
                db.session.execute(stmt)

            if old_entries:
                print(f"    ✓ {len(old_entries)} student completion(s) migrated")

            # ---------------------------------------------------------------
            # 5. Deactivate old OTG exam so it no longer appears in exam lists
            # ---------------------------------------------------------------
            exam.is_active = False
            print(f"    → Deactivated old Exam record")

            migrated_count += 1

        db.session.commit()
        print(f"\n{'='*60}")
        print(f"✅ Migration complete.")
        print(f"   {migrated_count} OTG test(s) migrated.")
        print(f"   {skipped_count} already existed (skipped).")

        # Summary
        total_new = OnTheGoTest.query.filter(
            OnTheGoTest.id.in_([e.id for e in old_otg_exams])
        ).count()
        total_results = OnTheGoResult.query.count()
        total_sessions_query = OnTheGoTestSession.query.count()
        total_completions = len(
            db.session.execute(student_on_the_go_test.select()).fetchall()
        )
        print(f"\n📊 New OnTheGoTest records:    {total_new}")
        print(f"📊 OnTheGoResult records:       {total_results}")
        print(f"📊 OnTheGoTestSession records:  {total_sessions_query}")
        print(f"📊 Student completions:         {total_completions}")


if __name__ == "__main__":
    run_migration(skip_license=True)
