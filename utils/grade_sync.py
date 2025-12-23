"""
Utility functions for syncing exam records to grades
"""
from models import db
from models.grade import Grade
from models.exam_record import ExamRecord
from models.assessment_type import AssessmentType
from datetime import datetime


def sync_exam_record_to_grade(exam_record):
    """
    Sync an ExamRecord to the Grade table
    Creates or updates a Grade entry based on the exam record
    
    Args:
        exam_record: ExamRecord instance to sync
        
    Returns:
        Grade instance (created or updated)
    """
    # Try to find matching assessment type based on exam_type
    assessment_type = AssessmentType.query.filter(
        db.or_(
            AssessmentType.name.ilike(f"%{exam_record.exam_type}%"),
            AssessmentType.code.ilike(f"%{exam_record.exam_type}%")
        )
    ).first()
    
    # If no match, use exam_type as assessment name
    assessment_name = assessment_type.name if assessment_type else exam_record.exam_type
    assessment_code = assessment_type.code if assessment_type else exam_record.exam_type.lower().replace(" ", "_")
    
    # Check if grade already exists
    existing_grade = Grade.query.filter_by(
        student_id=exam_record.student_id,
        subject_id=exam_record.subject_id,
        class_room_id=exam_record.class_room_id,
        term_id=exam_record.school_term_id,
        exam_record_id=exam_record.id
    ).first()
    
    if existing_grade:
        # Only update if there are actual changes
        needs_update = (
            existing_grade.score != exam_record.raw_score or
            existing_grade.max_score != exam_record.max_score or
            existing_grade.assessment_name != assessment_name or
            existing_grade.assessment_type != assessment_code
        )
        
        if needs_update:
            # Update existing grade (in case exam was retaken)
            existing_grade.score = exam_record.raw_score
            existing_grade.max_score = exam_record.max_score
            existing_grade.assessment_name = assessment_name
            existing_grade.assessment_type = assessment_code
            existing_grade.calculate_percentage()
            existing_grade.assign_grade_letter()
            existing_grade.updated_at = datetime.utcnow()
            grade = existing_grade
            print(f"Updated existing grade for student {exam_record.student_id[:8]}")
        else:
            # No changes needed, return existing grade
            grade = existing_grade
    else:
        # Create new grade
        grade = Grade()
        grade.student_id = exam_record.student_id
        grade.subject_id = exam_record.subject_id
        grade.class_room_id = exam_record.class_room_id
        grade.term_id = exam_record.school_term_id
        grade.teacher_id = None  # Will be set when teacher reviews
        grade.assessment_type = assessment_code
        grade.assessment_name = assessment_name
        grade.max_score = exam_record.max_score
        grade.score = exam_record.raw_score
        grade.academic_session = exam_record.academic_year
        grade.assessment_date = exam_record.submitted_at
        grade.exam_record_id = exam_record.id
        grade.is_from_cbt = True
        grade.calculate_percentage()
        grade.assign_grade_letter()
        
        db.session.add(grade)
        print(f"Created new grade for student {exam_record.student_id[:8]}")
    
    return grade


def sync_all_exam_records(subject_id=None, class_id=None, term_id=None):
    """
    Sync all exam records to grades
    Optionally filter by subject, class, or term
    
    Returns:
        dict with sync statistics
    """
    query = ExamRecord.query
    
    if subject_id:
        query = query.filter_by(subject_id=subject_id)
    if class_id:
        query = query.filter_by(class_room_id=class_id)
    if term_id:
        query = query.filter_by(school_term_id=term_id)
    
    exam_records = query.all()
    
    synced_count = 0
    updated_count = 0
    error_count = 0
    
    for record in exam_records:
        try:
            grade = sync_exam_record_to_grade(record)
            if grade.created_at == grade.updated_at:
                synced_count += 1
            else:
                updated_count += 1
        except Exception as e:
            print(f"Error syncing exam record {record.id}: {str(e)}")
            error_count += 1
    
    db.session.commit()
    
    return {
        "total_records": len(exam_records),
        "synced": synced_count,
        "updated": updated_count,
        "errors": error_count
    }


def sync_student_exam_records(student_id, subject_id=None, class_id=None, term_id=None):
    """
    Sync exam records to grades for a specific student
    Optionally filter by subject, class, or term
    
    Returns:
        dict with sync statistics
    """
    query = ExamRecord.query.filter_by(student_id=student_id)
    
    if subject_id:
        query = query.filter_by(subject_id=subject_id)
    if class_id:
        query = query.filter_by(class_room_id=class_id)
    if term_id:
        query = query.filter_by(school_term_id=term_id)
    
    exam_records = query.all()
    
    synced_count = 0
    updated_count = 0
    error_count = 0
    
    for record in exam_records:
        try:
            grade = sync_exam_record_to_grade(record)
            if grade.created_at == grade.updated_at:
                synced_count += 1
            else:
                updated_count += 1
        except Exception as e:
            print(f"Error syncing exam record {record.id}: {str(e)}")
            error_count += 1
    
    db.session.commit()
    
    return {
        "total_records": len(exam_records),
        "synced": synced_count,
        "updated": updated_count,
        "errors": error_count
    }
