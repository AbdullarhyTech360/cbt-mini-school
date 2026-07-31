"""
Migration 001: Create On-The-Go test tables.

Creates four new tables for the On-The-Go test feature:
- on_the_go_tests
- on_the_go_results
- on_the_go_test_sessions
- student_on_the_go_test
"""

from sqlalchemy import text


def upgrade():
    """Create the On-The-Go test tables."""
    from models import db

    # on_the_go_tests — primary entity
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS on_the_go_tests (
            id VARCHAR(36) PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            description TEXT,
            instructions TEXT,
            subject_id VARCHAR(36) NOT NULL REFERENCES subject(subject_id),
            class_room_id VARCHAR(36) REFERENCES class_room(class_room_id),
            duration INTERVAL NOT NULL,
            max_score FLOAT NOT NULL,
            number_of_questions INTEGER,
            calculator_enabled BOOLEAN DEFAULT FALSE,
            show_feedback BOOLEAN DEFAULT TRUE,
            save_after_completion BOOLEAN DEFAULT TRUE,
            access_code VARCHAR(10),
            is_active BOOLEAN DEFAULT TRUE,
            is_finished BOOLEAN DEFAULT FALSE,
            started_at TIMESTAMP,
            ended_at TIMESTAMP,
            created_by_id VARCHAR(36) NOT NULL REFERENCES user(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))

    # on_the_go_results — persisted results (when save_after_completion=True)
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS on_the_go_results (
            id VARCHAR(36) PRIMARY KEY,
            on_the_go_test_id VARCHAR(36) NOT NULL REFERENCES on_the_go_tests(id) ON DELETE CASCADE,
            student_id VARCHAR(36) NOT NULL REFERENCES user(id) ON DELETE CASCADE,
            answers TEXT NOT NULL,
            correct_answers INTEGER NOT NULL,
            total_questions INTEGER NOT NULL,
            score_percentage FLOAT NOT NULL,
            raw_score FLOAT NOT NULL,
            max_score FLOAT NOT NULL,
            letter_grade VARCHAR(1) NOT NULL,
            started_at TIMESTAMP NOT NULL,
            submitted_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL
        )
    """))

    # on_the_go_test_sessions — in-progress session tracking
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS on_the_go_test_sessions (
            id VARCHAR(36) PRIMARY KEY,
            student_id VARCHAR(36) NOT NULL REFERENCES user(id) ON DELETE CASCADE,
            on_the_go_test_id VARCHAR(36) NOT NULL REFERENCES on_the_go_tests(id) ON DELETE CASCADE,
            current_question_index INTEGER DEFAULT 0,
            time_remaining INTEGER NOT NULL,
            answers TEXT DEFAULT '{}',
            question_order TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            is_completed BOOLEAN DEFAULT FALSE,
            started_at TIMESTAMP NOT NULL,
            last_activity TIMESTAMP NOT NULL,
            completed_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL
        )
    """))

    # student_on_the_go_test — completion tracking (prevents retakes)
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS student_on_the_go_test (
            student_id VARCHAR(36) NOT NULL REFERENCES user(id),
            on_the_go_test_id VARCHAR(36) NOT NULL REFERENCES on_the_go_tests(id),
            score FLOAT,
            completed_at TIMESTAMP,
            time_taken INTEGER,
            PRIMARY KEY (student_id, on_the_go_test_id)
        )
    """))

    db.session.commit()
