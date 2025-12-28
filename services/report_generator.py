"""Service for generating student performance reports"""
import os
import base64
import mimetypes

from models import db
from models.grade import Grade
from models.user import User
from models.subject import Subject
from models.class_room import ClassRoom
from models.school_term import SchoolTerm
from models.school import School
from models.assessment_type import AssessmentType
from models.report_config import ReportConfig
from models.student import Student
from models.grade_scale import GradeScale
from models.section import Section
from sqlalchemy import func


class ReportGenerator:
    """Generate student performance reports with flexible exam merging"""

    @staticmethod
    def _embed_image(path_or_url):
        """Return a data URI for a local image or the original url if already data/http.

        Handles common storage markers like `file://`, `#file:` and looks under typical
        upload directories (e.g., `uploads/school_logos`). If embedding fails, returns
        the original path_or_url so other renderers (WeasyPrint) can try with base_url.
        """
        if not path_or_url:
            return ''

        lower = path_or_url.lower()
        if lower.startswith('data:') or lower.startswith('http://') or lower.startswith('https://'):
            return path_or_url

        # Normalize custom prefixes
        if lower.startswith('#file:'):
            stripped = path_or_url.split(':', 1)[1].lstrip('/')
            norm_path = os.path.normpath(stripped)
        elif lower.startswith('file://'):
            stripped = path_or_url.split('://', 1)[1].lstrip('/')
            norm_path = os.path.normpath(stripped)
        else:
            norm_path = os.path.normpath(path_or_url)

        # Candidate locations to search for the file
        candidates = [
            norm_path,
            os.path.join(os.getcwd(), norm_path),
            os.path.join(os.getcwd(), 'static', norm_path),
            os.path.join(os.getcwd(), 'static', 'uploads', os.path.basename(norm_path)),
            os.path.join(os.getcwd(), 'uploads', os.path.basename(norm_path)),
            os.path.join(os.getcwd(), 'uploads', 'school_logos',
                         os.path.basename(norm_path)),
            # Add proper subdirectory support for the actual upload structure
            os.path.join(os.getcwd(), 'static', norm_path),
            os.path.join(os.getcwd(), 'static', 'uploads', norm_path),
        ]

        for p in candidates:
            if os.path.exists(p) and os.path.isfile(p):
                try:
                    mime, _ = mimetypes.guess_type(p)
                    mime = mime or 'application/octet-stream'
                    with open(p, 'rb') as f:
                        data = f.read()
                    b64 = base64.b64encode(data).decode('ascii')
                    return f'data:{mime};base64,{b64}'
                except Exception:
                    # If embedding fails for this candidate, continue to next
                    continue

        # If no local file found, return original; renderers with base_url may still handle it
        return path_or_url

    @staticmethod
    def _get_image_url(path_or_url):
        """Return a proper URL for an uploaded image.

        Handles various path formats stored in the database and converts them
        to proper URLs that work with the Flask /uploads route.
        """
        if not path_or_url:
            return ''

        lower = path_or_url.lower()
        if lower.startswith('data:') or lower.startswith('http://') or lower.startswith('https://'):
            return path_or_url

        # Clean the path by removing common prefixes
        clean_path = path_or_url
        prefixes_to_remove = ['static/uploads/', 'static/']
        for prefix in prefixes_to_remove:
            if clean_path.startswith(prefix):
                clean_path = clean_path[len(prefix):]
                break

        # Normalize path separators to forward slashes (Flask expects forward slashes)
        clean_path = clean_path.replace('\\', '/')

        # The Flask route expects the path to be relative to static/uploads/
        # So if the cleaned path is correct, just prepend / to make it a URL
        result = f'/{clean_path}'
        

        
        return result

    @staticmethod
    def get_student_scores(student_id, term_id, class_room_id, config_id=None):
        """Get all scores for a student in a specific term and class"""
        # Get user and related info
        user = User.query.get(student_id)
        if not user:
            return None

        student = user.student
        if not student:
            return None

        class_room = ClassRoom.query.get(class_room_id)
        if not class_room:
            return None

        term = SchoolTerm.query.get(term_id)
        if not term:
            return None

        school = School.query.first()
        if not school:
            return None

        # Get default grade scale for the school
        grade_scale = GradeScale.query.filter_by(
            school_id=school.school_id, is_default=True, is_active=True).first()
        if not grade_scale:
            # Fallback to any active scale for the school
            grade_scale = GradeScale.query.filter_by(
                school_id=school.school_id, is_active=True).first()

        # Get sections for this school
        all_sections = Section.query.filter_by(
            school_id=school.school_id,
            is_active=True
        ).order_by(Section.level).all()
        
        # Group similar sections (e.g., combine Junior Secondary and Senior Secondary as Secondary)
        sections = []
        seen_levels = set()
        grouped_secondary_added = False
        
        for section in all_sections:
            # Group secondary levels together (level 3 and 4 - Junior Secondary and Senior Secondary)
            if section.level == 3 or section.level == 4:
                if not grouped_secondary_added:
                    # Create a combined secondary section
                    class CombinedSection:
                        def __init__(self, name, abbreviation, level, description="Combined secondary section"):
                            self.name = name
                            self.abbreviation = abbreviation
                            self.level = level
                            self.description = description
                            self.is_active = True
                            self.school_id = section.school_id
                            
                    combined_section = CombinedSection("Secondary", "Secondary", 3)
                    sections.append(combined_section)
                    grouped_secondary_added = True
                # Skip individual junior/senior secondary sections
                continue
            else:
                sections.append(section)
                seen_levels.add(section.level)
        
        # For the simple report, we need to convert to dict format
        sections_for_simple_report = []
        for section in sections:
            if hasattr(section, 'to_dict'):
                sections_for_simple_report.append(section.to_dict())
            else:
                # For CombinedSection objects
                sections_for_simple_report.append({
                    "name": section.name,
                    "abbreviation": section.abbreviation,
                    "level": section.level,
                    "description": getattr(section, 'description', 'Combined secondary section'),
                    "is_active": getattr(section, 'is_active', True),
                    "school_id": getattr(section, 'school_id', None)
                })

        # Get assessment types for this school
        all_assessment_types = AssessmentType.query.filter_by(
            school_id=school.school_id,
            is_active=True
        ).order_by(AssessmentType.order).all()

        # Get report configuration if provided
        config = ReportConfig.query.get(config_id) if config_id else None

        # Filter assessment types based on configuration
        if config:
            active_assessments = config.get_active_assessments()
            if active_assessments:
                assessment_types = [
                    at for at in all_assessment_types
                    if at.code in active_assessments
                ]
            else:
                assessment_types = all_assessment_types
        else:
            assessment_types = all_assessment_types

        # Get all subjects for this class
        from models import class_subject, Subject
        class_subjects = db.session.query(Subject).join(
            class_subject, class_subject.c.subject_id == Subject.subject_id
        ).filter(
            class_subject.c.class_room_id == class_room_id
        ).all()

        # Initialize subject scores structure
        subject_scores = {
            s.subject_id: {
                'subject_name': s.subject_name,
                'assessments': {},
                'total': 0,
                'max_total': 0
            } for s in class_subjects
        }

        # NEW: Auto-sync CBT scores before generating report
        # This ensures that any CBT exam records are synced to the grades table
        from utils.grade_sync import sync_student_exam_records
        try:
            sync_result = sync_student_exam_records(
                student_id=student_id, class_id=class_room_id, term_id=term_id)
            # Only show detailed sync results if there were actual changes
            if sync_result['synced'] > 0 or sync_result['updated'] > 0:
                print(f"Auto-synced CBT scores for student {student_id[:8]}: {sync_result['synced']} new, {sync_result['updated']} updated")
        except Exception as e:
            print(f"Warning: Error during auto-sync: {str(e)}")
            # Continue with report generation even if sync fails

        # Get all grades for this student in this term (including unpublished to show CBT)
        grades = Grade.query.filter_by(
            student_id=student_id,
            term_id=term_id,
            class_room_id=class_room_id
        ).all()

        # Organize grades by subject and assessment type
        for grade in grades:
            subject_id = grade.subject_id

            # Skip if subject is not part of the class's subjects
            if subject_id not in subject_scores:
                continue

            # Only include published grades OR CBT scores (CBT is auto-published)
            if grade.is_published or grade.is_from_cbt:
                assessment_type = grade.assessment_type
                subject_scores[subject_id]['assessments'][assessment_type] = {
                    'score': grade.score,
                    'max_score': grade.max_score,
                    'percentage': grade.percentage,
                    'is_cbt': grade.is_from_cbt,  # Mark CBT scores for special display
                    # Link to original CBT exam if applicable
                    'exam_record_id': grade.exam_record_id
                }

        # Apply exam merging if configuration exists
        if config:
            merge_config = config.get_merge_config()
            active_assessments = config.get_active_assessments()

            for subject_id, subject_data in subject_scores.items():
                merged_assessments = {}

                # Process merged exams
                for merge_rule in merge_config.get('merged_exams', []):
                    merge_name = merge_rule['name']
                    components = merge_rule['components']
                    display_as = merge_rule.get('display_as', merge_name)

                    # Calculate merged score
                    total_score = 0
                    total_max = 0
                    has_all_components = True

                    for component in components:
                        if component in subject_data['assessments']:
                            total_score += subject_data['assessments'][component]['score']
                            total_max += subject_data['assessments'][component]['max_score']
                        else:
                            has_all_components = False

                    if total_max > 0:
                        merged_assessments[display_as] = {
                            'score': total_score,
                            'max_score': total_max,
                            'percentage': (total_score / total_max) * 100,
                            'is_merged': True,
                            'components': components
                        }

                        # Remove component assessments as they are now merged
                        for component in components:
                            subject_data['assessments'].pop(
                                component, None)

                # Add merged assessments
                subject_data['assessments'].update(merged_assessments)

                # Identify display names that should be forced active (merged ones)
                merged_rules = merge_config.get('merged_exams', [])
                merged_display_names = [
                    rule.get('display_as', rule['name']) for rule in merged_rules]
                merged_to_components = {rule.get(
                    'display_as', rule['name']): rule['components'] for rule in merged_rules}

                effective_active = set(active_assessments) | set(
                    merged_display_names)
                at_max_scores = {
                    at.code: at.max_score for at in all_assessment_types}

                # Filter to only active assessments
                if active_assessments:
                    filtered_assessments = {
                        k: v for k, v in subject_data['assessments'].items()
                        if k in effective_active
                    }
                    subject_data['assessments'] = filtered_assessments

                # CRITICAL: Ensure all effective active assessments are present in subject_data
                # If a student is missing a score, they should get 0, but max_score must be counted.
                for at_code in effective_active:
                    if at_code not in subject_data['assessments']:
                        if at_code in merged_to_components:
                            # This is a merged assessment that was completely missing
                            comp_codes = merged_to_components[at_code]
                            comp_max_total = sum(
                                at_max_scores.get(c, 0) for c in comp_codes)
                            subject_data['assessments'][at_code] = {
                                'score': 0,
                                'max_score': comp_max_total,
                                'percentage': 0,
                                'is_merged': True,
                                'components': comp_codes
                            }
                        else:
                            # Regular assessment missing
                            subject_data['assessments'][at_code] = {
                                'score': 0,
                                'max_score': at_max_scores.get(at_code, 0),
                                'percentage': 0,
                                'is_cbt': False
                            }

                # Calculate total correctly based on ALL active assessments
                subject_data['total'] = sum(
                    a['score'] for a in subject_data['assessments'].values()
                )
                subject_data['max_total'] = sum(
                    a['max_score'] for a in subject_data['assessments'].values()
                )
        else:
            # No configuration, iterate all subjects and all active assessment types
            at_max_scores = {
                at.code: at.max_score for at in all_assessment_types}
            at_codes = [at.code for at in all_assessment_types]

            for subject_id, subject_data in subject_scores.items():
                # Ensure all assessment types are represented
                for code in at_codes:
                    if code not in subject_data['assessments']:
                        subject_data['assessments'][code] = {
                            'score': 0,
                            'max_score': at_max_scores.get(code, 0),
                            'percentage': 0
                        }

                subject_data['total'] = sum(
                    a['score'] for a in subject_data['assessments'].values()
                )
                subject_data['max_total'] = sum(
                    a['max_score'] for a in subject_data['assessments'].values()
                )

        # Calculate class position
        position = ReportGenerator.calculate_class_position(
            student_id, term_id, class_room_id
        )

        # Get total students in class
        total_students = db.session.query(func.count(User.id)).join(
            Student, Student.user_id == User.id
        ).filter(
            User.class_room_id == class_room_id,
            User.role == 'student'
        ).scalar()

        # Prepare assessment types for response, ensuring merged exams are included
        returned_assessment_types = [a.to_dict() for a in assessment_types]

        if config:
            merge_config = config.get_merge_config()
            merged_exams = merge_config.get('merged_exams', [])
            active_assessments = config.get_active_assessments()

            if merged_exams:
                # Add merged exams definition to the list
                for merge_rule in merged_exams:
                    display_as = merge_rule.get(
                        'display_as', merge_rule['name'])
                    components = merge_rule['components']

                    # Merged exams are always displayed if they exist
                    if True:
                        # Calculate max score from components (using first found subject as reference)
                        max_score = 100  # Default

                        # Try to find max score from existing types
                        component_max_total = 0
                        for comp in components:
                            comp_type = next(
                                (at for at in all_assessment_types if at.code == comp), None)
                            if comp_type:
                                component_max_total += comp_type.max_score

                        if component_max_total > 0:
                            max_score = component_max_total

                        # Check if already exists to avoid duplicates
                        if not any(at['code'] == display_as for at in returned_assessment_types):
                            returned_assessment_types.append({
                                'code': display_as,
                                'name': display_as,
                                'max_score': max_score,
                                # Append at end
                                'order': 100 + len(returned_assessment_types),
                                'school_id': school.school_id,
                                'is_active': True
                            })

            # Identify all components that were merged to remove them from headers
            merged_component_codes = set()
            for merge_rule in merged_exams:
                merged_component_codes.update(merge_rule['components'])

            # Identify all merged display names to protect them from filtering
            merged_display_names = [
                rule.get('display_as', rule['name']) for rule in merged_exams]

            # Filter returned assessment types if active list is configured
            if active_assessments:
                returned_assessment_types = [
                    at for at in returned_assessment_types
                    if (at['code'] in active_assessments or at['code'] in merged_display_names)
                    and at['code'] not in merged_component_codes
                ]
            else:
                returned_assessment_types = [
                    at for at in returned_assessment_types
                    if at['code'] not in merged_component_codes
                ]

        # FORCE 100 Max Total as requested by user
        for subject_id, subject_data in subject_scores.items():
            subject_data['max_total'] = 100.0

        # Update header maxes for consistency with the 100% total
        # We'll set the assessment type maxes to match their contribution to 100
        total_at_max = sum(at.max_score for at in all_assessment_types)
        if total_at_max > 0:
            header_scale = 100.0 / total_at_max
            for at in returned_assessment_types:
                if 'max_score' in at:
                    at['max_score'] = at['max_score'] * header_scale

        # Sort by order
        returned_assessment_types.sort(key=lambda x: x.get('order', 0))

        # Convert sections to dictionary format for JSON serialization
        sections_data = []
        for section in sections:
            if hasattr(section, 'to_dict'):
                sections_data.append(section.to_dict())
            else:
                # For CombinedSection objects
                sections_data.append({
                    "section_id": getattr(section, 'section_id', f"combined_{section.name.lower()}") ,
                    "name": section.name,
                    "abbreviation": section.abbreviation,
                    "level": section.level,
                    "description": getattr(section, 'description', 'Combined secondary section'),
                    "is_active": getattr(section, 'is_active', True),
                    "school_id": getattr(section, 'school_id', None),
                    "classrooms_count": getattr(section, 'get_classrooms_count', lambda: 0)(),
                    "created_at": None,
                    "updated_at": None
                })
        
        # Format sections with commas and 'and' for display
        def format_sections_for_display(sections_list):
            if not sections_list:
                return ''
            if len(sections_list) == 1:
                return sections_list[0]['name']
            elif len(sections_list) == 2:
                return f"{sections_list[0]['name']} and {sections_list[1]['name']}"
            else:
                names = [s['name'] for s in sections_list]
                last = names.pop()
                return f"{', '.join(names)} and {last}"
        
        # Convert sections to dictionary format for JSON serialization
        sections_data = []
        for section in sections:
            if hasattr(section, 'to_dict'):
                sections_data.append(section.to_dict())
            else:
                # For CombinedSection objects
                sections_data.append({
                    "section_id": getattr(section, 'section_id', f"combined_{section.name.lower()}") ,
                    "name": section.name,
                    "abbreviation": section.abbreviation,
                    "level": section.level,
                    "description": getattr(section, 'description', 'Combined secondary section'),
                    "is_active": getattr(section, 'is_active', True),
                    "school_id": getattr(section, 'school_id', None),
                    "classrooms_count": getattr(section, 'get_classrooms_count', lambda: 0)(),
                    "created_at": None,
                    "updated_at": None
                })
        
        return {
            'student': {
                'id': student_id,
                'name': f"{user.first_name} {user.last_name}".upper(),
                'admission_number': student.admission_number,
                'image': user.image,
                'gender': user.gender,
                'class_name': class_room.class_room_name,
                'class_id': class_room_id
            },
            'school': {
                'name': school.school_name,
                'logo': school.logo,
                'address': school.address,
                'phone': school.phone,
                'motto': school.motto
            },
            'sections': sections_data,
            'formatted_sections': format_sections_for_display(sections_data),
            'term': {
                'name': term.term_name,
                'session': term.academic_session,
                'start_date': term.start_date.strftime('%Y-%m-%d') if term.start_date else '-',
                'end_date': term.end_date.strftime('%Y-%m-%d') if term.end_date else '-'
            },
            'assessment_types': returned_assessment_types,
            'scores': subject_scores,
            'position': position,
            'total_students': total_students,
            'overall_total': sum(s['total'] for s in subject_scores.values()),
            'overall_max': sum(s['max_total'] for s in subject_scores.values()),
            # Include configuration metadata for client-side rendering
            'config': config.to_dict() if config else None,
            'grade_scale': grade_scale.to_dict() if grade_scale else None
        }

    @staticmethod
    def calculate_class_position(student_id, term_id, class_room_id):
        """Calculate student's position in class based on total scores"""
        # Get all students in the class
        students = db.session.query(User.id).filter(
            User.class_room_id == class_room_id,
            User.role == 'student'
        ).all()

        student_totals = []
        for (sid,) in students:
            # Include both published grades AND CBT scores
            total = db.session.query(func.sum(Grade.score)).filter(
                Grade.student_id == sid,
                Grade.term_id == term_id,
                Grade.class_room_id == class_room_id,
                db.or_(Grade.is_published == True, Grade.is_from_cbt == True)
            ).scalar() or 0

            student_totals.append((sid, total))

        # Sort by total score (descending)
        student_totals.sort(key=lambda x: x[1], reverse=True)

        # Find position
        for position, (sid, total) in enumerate(student_totals, start=1):
            if sid == student_id:
                return position

        return None

    @staticmethod
    def get_class_report_data(class_room_id, term_id, config_id=None):
        """Get report data for all students in a class"""
        students = User.query.filter_by(
            class_room_id=class_room_id,
            role='student'
        ).all()

        reports = []
        for student in students:
            report_data = ReportGenerator.get_student_scores(
                student.id, term_id, class_room_id, config_id
            )
            if report_data:
                reports.append(report_data)

        # Sort by position
        reports.sort(key=lambda x: x['position']
                     if x['position'] else float('inf'))

        return reports

    @staticmethod
    def format_position(position):
        """Format position with ordinal suffix (1st, 2nd, 3rd, etc.)"""
        if position is None:
            return "N/A"

        if 10 <= position % 100 <= 20:
            suffix = 'th'
        else:
            suffix = {1: 'st', 2: 'nd', 3: 'rd'}.get(position % 10, 'th')

        return f"{position}{suffix}"

    @staticmethod
    def get_grade(percentage, grade_scale=None):
        """Get letter grade from percentage using configurable grade scale or professional fallback"""
        if grade_scale and 'grade_ranges' in grade_scale:
            for range_item in grade_scale['grade_ranges']:
                if float(range_item['min_score']) <= float(percentage) <= float(range_item['max_score']):
                    return range_item['grade']

        # Fallback to standard 70/60/50/45/40 scale if no specific scale matches
        score = float(percentage)
        if score >= 70:
            return 'A'
        if score >= 60:
            return 'B'
        if score >= 50:
            return 'C'
        if score >= 45:
            return 'D'
        if score >= 40:
            return 'E'
        return 'F'

    @staticmethod
    def format_assessment_name(code):
        """Format assessment code to display name with special handling for common types"""
        # Special handling for common assessment types
        special_cases = {
            'cbt': 'Computer Based Test',
            'ca': 'Continuous Assessment',
            'exam': 'Terminal Examination',
            'mid_term': 'Mid-Term Exam',
            'final': 'Final Exam',
            'quiz': 'Quiz',
            'assignment': 'Assignment',
            'project': 'Project'
        }

        if code.lower() in special_cases:
            return special_cases[code.lower()]

        return ' '.join(word.capitalize() for word in code.split('_'))

    @staticmethod
    def _get_assessment_display_name(code, assessment_types):
        """Get assessment display name with max score"""
        assessment_type = next(
            (at for at in assessment_types if at['code'] == code), None)
        if assessment_type:
            formatted_name = ReportGenerator.format_assessment_name(
                assessment_type['name'])
            return f"{formatted_name} ({assessment_type['max_score']})"
        else:
            return ReportGenerator.format_assessment_name(code).upper()

    @staticmethod
    def get_remark(percentage, grade_scale=None):
        """Get remark based on percentage using configurable grade scale or professional fallback"""
        if grade_scale and 'grade_ranges' in grade_scale:
            for range_item in grade_scale['grade_ranges']:
                if float(range_item['min_score']) <= float(percentage) <= float(range_item['max_score']):
                    return range_item.get('remark', '')

        # Fallback based on standard system
        score = float(percentage)
        if score >= 70:
            return 'Excellent'
        if score >= 60:
            return 'Very Good'
        if score >= 50:
            return 'Good'
        if score >= 45:
            return 'Fair'
        if score >= 40:
            return 'Pass'
        return 'Needs Improvement'

    @staticmethod
    def generate_report_html(report_data):
        """Generate HTML for a student report card - Modern Single Page Design Optimized for GTK3"""
        student = report_data['student']
        school = report_data['school']
        term = report_data['term']
        assessment_types = report_data.get('assessment_types', [])
        scores = report_data['scores']
        position = report_data['position']
        total_students = report_data['total_students']
        overall_total = report_data['overall_total']
        overall_max = report_data['overall_max']
        grade_scale = report_data.get('grade_scale')
        if not grade_scale or 'grade_ranges' not in grade_scale:
            grade_scale = {
                'grade_ranges': [
                    {'grade': 'A', 'min_score': 70,
                        'max_score': 100, 'remark': 'Excellent'},
                    {'grade': 'B', 'min_score': 60,
                        'max_score': 69, 'remark': 'Very Good'},
                    {'grade': 'C', 'min_score': 50,
                        'max_score': 59, 'remark': 'Good'},
                    {'grade': 'D', 'min_score': 45,
                        'max_score': 49, 'remark': 'Fair'},
                    {'grade': 'E', 'min_score': 40,
                        'max_score': 44, 'remark': 'Pass'},
                    {'grade': 'F', 'min_score': 0,
                        'max_score': 39, 'remark': 'Fail'},
                ]
            }

        # Build assessment columns
        assessments = [at['code'] for at in assessment_types]
        assessments.sort(key=lambda code: next(
            (at['order'] for at in assessment_types if at['code'] == code), 0))

        # Calculate overall stats
        overall_percentage = (overall_total / overall_max *
                              100) if overall_max > 0 else 0
        overall_grade = ReportGenerator.get_grade(
            overall_percentage, grade_scale)
        overall_remark = ReportGenerator.get_remark(
            overall_percentage, grade_scale)

        # Beautiful purple gradient design inspired by professional report cards
        html = f'''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page {{ size: A4 landscape; margin: 8mm; }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{ 
            font-family: Arial, sans-serif;
            background: white;
            font-size: 7.5pt;
            line-height: 1.2;
        }}
        .report-container {{
            background: white;
            padding: 0;
            max-width: 100%;
            height: 100%;
        }}
        .content-wrapper {{
            padding: 0 15px;
        }}
        
        /* Purple Gradient Header */
        .header-banner {{
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
            color: white;
            padding: 10px 15px;
            display: table;
            width: 100%;
            border-radius: 6px 6px 0 0;
        }}
        .header-left {{
            display: table-cell;
            vertical-align: middle;
            width: 60px;
        }}
        .header-center {{
            display: table-cell;
            vertical-align: middle;
            padding-left: 12px;
        }}
        .header-right {{
            display: table-cell;
            vertical-align: middle;
            text-align: right;
            width: 220px;
        }}
        .school-logo {{
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: 2px solid white;
            background: white;
            object-fit: contain;
            padding: 2px;
        }}
        .school-name {{
            font-size: 14pt;
            font-weight: 700;
            letter-spacing: 0.3px;
            margin-bottom: 2px;
        }}
        .school-address {{
            font-size: 6pt;
            opacity: 0.95;
        }}
        .report-title {{
            font-size: 11pt;
            font-weight: 700;
            letter-spacing: 0.5px;
        }}
        .report-term {{
            font-size: 7pt;
            opacity: 0.9;
            margin-top: 1px;
        }}
        
        /* Student Info Card */
        .student-card {{
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 1px solid #bae6fd;
            border-radius: 6px;
            padding: 10px;
            margin: 8px 0;
            display: table;
            width: 100%;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }}
        .student-icon-cell {{
            display: table-cell;
            width: 80px;
            vertical-align: middle;
            text-align: center;
        }}
        .student-icon {
            width: 70px;
            height: 70px;
            border-radius: 10px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 3px solid white;
            box-shadow: 0 2px 5px rgba(99, 102, 241, 0.3);
        }
        .student-icon img {
            width: 64px;
            height: 64px;
            border-radius: 7px;
            object-fit: cover;
        }
        .student-default {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            border-radius: 7px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 24px;
        }
        .student-details {
            display: table-cell;
            vertical-align: middle;
            padding-left: 15px;
        }
        .student-info-table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 5px;
        }}
        .student-info-table td {{
            padding: 4px 10px 4px 0;
            vertical-align: middle;
        }}
        .info-label {{
            font-size: 7.5pt;
            color: #64748b;
            font-weight: 600;
            letter-spacing: 0.3px;
            width: 35%;
            text-align: right;
            padding-right: 10px;
        }}
        .info-value {{
            font-size: 9pt;
            color: #0f172a;
            font-weight: 700;
            width: 15%;
            text-align: left;
        }}
        .grade-pill {{
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            font-weight: 700;
            font-size: 7pt;
            color: white;
        }}
        .grade-A {{ background: #10b981; }}
        .grade-B {{ background: #3b82f6; }}
        .grade-C {{ background: #f59e0b; }}
        .grade-D {{ background: #f97316; }}
        .grade-E {{ background: #ef4444; }}
        .grade-F {{ background: #6b7280; }}
        
        /* Academic Performance Section */
        .section-title {{
            font-size: 9pt;
            font-weight: 700;
            color: #6366f1;
            padding: 6px 0 4px 0;
            border-bottom: 1px solid #e0e7ff;
        }}
        
        /* Beautiful Table */
        .performance-table {{
            width: 100%;
            margin: 0 0 8px 0;
            border-collapse: collapse;
            font-size: 7pt;
        }}
        .performance-table thead {{
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
        }}
        .performance-table th {{
            padding: 5px 3px;
            text-align: center;
            font-weight: 600;
            font-size: 6pt;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            border: 1px solid #8b5cf6;
        }}
        .performance-table th:first-child {{
            border-radius: 4px 0 0 0;
        }}
        .performance-table th:last-child {{
            border-radius: 0 4px 0 0;
        }}
        .performance-table td {{
            padding: 4px 3px;
            text-align: center;
            border: 1px solid #e5e7eb;
        }}
        .performance-table tbody tr:nth-child(even) {{
            background: #fafafa;
        }}
        .performance-table td:first-child {{
            background: #f8fafc;
            font-weight: 600;
            color: #64748b;
        }}
        .performance-table td:nth-child(2) {{
            text-align: left;
            font-weight: 600;
            color: #1e293b;
            padding-left: 6px;
        }}
        .cbt-badge {{
            background: #f59e0b;
            color: white;
            padding: 1px 4px;
            border-radius: 6px;
            font-size: 5pt;
            font-weight: 700;
            margin-left: 2px;
            vertical-align: super;
        }}
        .total-row {{
            background: linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%) !important;
            font-weight: 700 !important;
            font-size: 7.5pt !important;
        }}
        .total-row td {{
            border-top: 2px solid #8b5cf6 !important;
            padding: 5px 3px !important;
        }}
        .remark-excellent {{ color: #059669; font-weight: 600; font-style: italic; }}
        .remark-good {{ color: #2563eb; font-weight: 600; font-style: italic; }}
        .remark-average {{ color: #d97706; font-weight: 600; font-style: italic; }}
        .remark-poor {{ color: #dc2626; font-weight: 600; font-style: italic; }}
        .remark-fail {{ color: #4b5563; font-weight: 600; font-style: italic; }}
        
        /* Comments Section */
        .comments-container {{
            display: table;
            width: 100%;
            margin: 0 0 6px 0;
        }}
        .comment-box {{
            display: table-cell;
            width: 50%;
            padding: 6px;
            background: #faf5ff;
            border: 1px dashed #d8b4fe;
            border-radius: 4px;
            vertical-align: top;
        }}
        .comment-box:first-child {{
            margin-right: 6px;
        }}
        .comment-header {{
            font-weight: 700;
            color: #7c3aed;
            font-size: 7pt;
            margin-bottom: 3px;
        }}
        .comment-area {{
            min-height: 50px;
            border-bottom: 1px solid #d8b4fe;
            margin-bottom: 4px;
        }}
        .signature-line {{
            font-size: 5.5pt;
            color: #94a3b8;
            text-align: center;
            padding-top: 2px;
            border-top: 1px solid #cbd5e1;
            margin-top: 3px;
        }}
        
        /* Grading Scale */
        .grading-scale {{
            text-align: center;
            padding: 4px 0;
            font-size: 6pt;
            border-top: 1px solid #e5e7eb;
        }}
        .grading-scale strong {{
            margin-right: 6px;
        }}
        .grade-item {{
            display: inline-block;
            margin: 0 4px;
            padding: 2px 6px;
            border-radius: 8px;
            font-weight: 600;
            color: white;
        }}
        
        /* Footer */
        .footer-notice {{
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 1px solid #fbbf24;
            border-radius: 4px;
            padding: 4px 10px;
            margin: 0;
            text-align: center;
            font-size: 5.5pt;
            color: #92400e;
        }}
        .footer-notice strong {{
            font-weight: 700;
        }}
        
        /* Enhanced Student Info Table */
        .enhanced-student-table {{
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }}
        .enhanced-student-table th {{
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 8px;
            text-align: center;
            font-weight: 600;
            font-size: 8pt;
        }}
        .enhanced-student-table td {{
            padding: 6px 8px;
            border: 1px solid #e2e8f0;
            text-align: left;
        }}
        .enhanced-student-table tr:nth-child(even) {{
            background-color: #f8fafc;
        }}
        .enhanced-student-table .label-cell {{
            font-weight: 600;
            color: #64748b;
            width: 30%;
        }}
        .enhanced-student-table .value-cell {{
            font-weight: 700;
            color: #1e293b;
        }}
    </style>
</head>
<body>
    <div class="report-container">
        <!-- Purple Gradient Header -->
        <div class="header-banner">
            <div class="header-left">
                {(lambda logo_url=ReportGenerator._get_image_url(school.get("logo")): f'<img src="{logo_url}" class="school-logo" onerror="console.error(\'Logo failed to load:\', this.src);" onload="console.log(\'Logo loaded successfully:\', this.src);">' if school.get('logo') else '<div class="school-logo"></div>')()}
            </div>
            <div class="header-center">
                <div class="school-name">{school['name'].upper()}</div>
                <div class="school-address">{school.get('address', '')} • Tel: {school.get('phone', 'N/A')}</div>
            </div>
            <div class="header-right">
                <div class="report-term">First Term • {term['session']}</div>
            </div>
        </div>
        <div class="report-title" style="text-align: center; margin: 10px 0;">STUDENT PERFORMANCE REPORT</div>
        
        <div class="content-wrapper">
        <!-- Enhanced Student Information Table -->
        <table class="enhanced-student-table">
            <thead>
                <tr>
                    <th colspan="4">STUDENT INFORMATION</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="label-cell">Student Image:</td>
                    <td class="value-cell" style="text-align: center;">
                        {(lambda student_img_url=ReportGenerator._get_image_url(student.get("image")): f'<img src="{student_img_url}" width="60" height="60" style="border-radius: 50%; border: 2px solid #6366f1;" onerror="console.error(\'Student image failed to load:\', this.src);" onload="console.log(\'Student image loaded successfully:\', this.src);">' if student.get('image') else '<div style="width: 60px; height: 60px; border-radius: 50%; border: 2px solid #6366f1; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">{student["name"][0].upper()}</div>')()}
                    </td>
                    <td class="label-cell">Student Name:</td>
                    <td class="value-cell">{student['name'].upper()}</td>
                </tr>
                <tr>
                    <td class="label-cell">Class:</td>
                    <td class="value-cell">{student['class_name']}</td>
                    <td class="label-cell">Admission Number:</td>
                    <td class="value-cell">{student.get('admission_number', 'N/A')}</td>
                </tr>
                <tr>
                    <td class="label-cell">Position:</td>
                    <td class="value-cell" style="color: #6366f1; font-weight: 700;">{ReportGenerator.format_position(position)} of {total_students}</td>
                    <td class="label-cell">Total Score:</td>
                    <td class="value-cell" style="font-weight: 700;">{overall_total:.1f}/{overall_max}</td>
                </tr>
                <tr>
                    <td class="label-cell">Overall Grade:</td>
                    <td class="value-cell">
                        <span class="grade-pill grade-{overall_grade}" style="padding: 3px 10px; font-size: 8pt;">{overall_grade}</span>
                        <span style="font-size: 9pt; color: #64748b; margin-left: 6px; font-weight: 600;">({overall_percentage:.1f}%)</span>
                    </td>
                    <td class="label-cell">Percentage:</td>
                    <td class="value-cell">{overall_percentage:.1f}%</td>
                </tr>
            </tbody>
        </table>
        
        <!-- Academic Performance Section -->
        <div class="section-title">Academic Performance</div>
        
        <table class="performance-table">
            <thead>
                <tr>
                    <th style="width: 20px;">SN</th>
                    <th style="width: 110px;">SUBJECT</th>
                    {''.join(f'<th style="width: 45px;">{ReportGenerator.format_assessment_name(at["name"])}</th>' for at in assessment_types)}
                    <th style="width: 40px;">TOTAL</th>
                    <th style="width: 38px;">GRADE</th>
                    <th style="width: 85px;">REMARK</th>
                </tr>
            </thead>
            <tbody>
'''

        # Add subject rows
        serial_number = 1
        for subject_data in scores.values():
            percentage = (subject_data['total'] / subject_data['max_total']
                          * 100) if subject_data['max_total'] > 0 else 0
            grade = ReportGenerator.get_grade(percentage, grade_scale)
            remark = ReportGenerator.get_remark(percentage, grade_scale)
            remark_class = remark.lower().replace(' ', '-')

            html += f'<tr><td>{serial_number}</td><td>{subject_data["subject_name"]}</td>'
            serial_number += 1

            for at in assessment_types:
                assessment = subject_data['assessments'].get(at['code'])
                if assessment:
                    is_cbt = assessment.get('is_cbt', False)
                    cbt_badge = '<span class="cbt-badge">CBT</span>' if is_cbt else ''
                    html += f'<td style="font-weight: 600;">{assessment["score"]:.0f}{cbt_badge}</td>'
                else:
                    html += '<td style="color: #d1d5db;">-</td>'

            html += f'''
                <td style="font-weight: 700;">{subject_data['total']:.0f}</td>
                <td><span class="grade-pill grade-{grade}">{grade}</span></td>
                <td class="remark-{remark_class}">{remark}</td>
            </tr>'''

        html += f'''
                <tr class="total-row">
                    <td colspan="2" style="text-align: left; padding-left: 10px;">OVERALL TOTAL</td>
                    {''.join('<td>-</td>' for _ in assessment_types)}
                    <td style="font-size: 11pt;">{overall_total:.0f}</td>
                    <td><span class="grade-pill grade-{overall_grade}">{overall_grade}</span></td>
                    <td style="font-style: italic; color: #7c3aed;">Overall Performance</td>
                </tr>
            </tbody>
        </table>
        
        <!-- Comments Section -->
        <table class="comments-container">
            <tr>
                <td class="comment-box" style="padding-right: 5px;">
                    <div class="comment-header">Teacher's Comment:</div>
                    <div class="comment-area"></div>
                    <div class="signature-line">Signature</div>
                </td>
                <td class="comment-box" style="padding-left: 5px;">
                    <div class="comment-header">Principal's Comment:</div>
                    <div class="comment-area"></div>
                    <div class="signature-line">Signature</div>
                </td>
            </tr>
        </table>
        
        <!-- Grading Scale -->
        <div class="grading-scale">
            <strong>Grading Legend:</strong>
            {' '.join(f'<span class="grade-item grade-{r["grade"]}">{r["grade"]} ({r["min_score"]}-{r["max_score"]}%) {r.get("remark", "")}</span>' for r in grade_scale["grade_ranges"])}
        </div>
        
        <!-- Footer Notice -->
        <div class="footer-notice">
            <strong>⚠ OFFICIAL DOCUMENT:</strong> This is an official report card issued by {school['name']}. Any alteration or modification will render this document invalid.
        </div>
        </div>
    </div>
</body>
</html>
'''

        return html

    @staticmethod
    def generate_simple_report_html(report_data):
        """Generate simplified HTML for xhtml2pdf compatibility (no flexbox/grid)"""
        student = report_data['student']
        school = report_data['school']
        term = report_data['term']
        assessment_types = report_data.get('assessment_types', [])
        scores = report_data['scores']
        position = report_data['position']
        total_students = report_data['total_students']
        overall_total = report_data['overall_total']
        overall_max = report_data['overall_max']
        grade_scale = report_data.get('grade_scale')
        if not grade_scale or 'grade_ranges' not in grade_scale:
            grade_scale = {
                'grade_ranges': [
                    {'grade': 'A', 'min_score': 70,
                        'max_score': 100, 'remark': 'Excellent'},
                    {'grade': 'B', 'min_score': 60,
                        'max_score': 69, 'remark': 'Very Good'},
                    {'grade': 'C', 'min_score': 50,
                        'max_score': 59, 'remark': 'Good'},
                    {'grade': 'D', 'min_score': 45,
                        'max_score': 49, 'remark': 'Fair'},
                    {'grade': 'E', 'min_score': 40,
                        'max_score': 44, 'remark': 'Pass'},
                    {'grade': 'F', 'min_score': 0,
                        'max_score': 39, 'remark': 'Fail'},
                ]
            }

        # Build assessment columns
        assessments = [at['code'] for at in assessment_types]
        assessments.sort(key=lambda code: next(
            (at['order'] for at in assessment_types if at['code'] == code), 0))

        # Calculate overall stats
        overall_percentage = (overall_total / overall_max *
                              100) if overall_max > 0 else 0
        overall_grade = ReportGenerator.get_grade(
            overall_percentage, grade_scale)

        # Use the class-level embedder
        _embed_image = ReportGenerator._embed_image

        html = f'''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page {{ size: A4; margin: 1cm; }}
        body {{ 
            font-family: Helvetica, Arial, sans-serif; 
            font-size: 10pt;
        }}
        .header-table {{ width: 100%; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px; }}
        .school-name {{ font-size: 24pt; font-weight: bold; color: #1e40af; }}
        .school-info {{ font-size: 10pt; color: #4b5563; }}
        .section-badge {{ font-size: 9pt; background-color: #8b5cf6; color: white; padding: 2px 6px; border-radius: 12px; margin: 0 2px; display: inline-block; }}
        .report-title {{ font-size: 18pt; font-weight: bold; color: #2563eb; margin-top: 10px; text-align: center; }}
        
        .student-info-table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
        .student-info-table th {{ background-color: #3b82f6; color: white; padding: 8px; text-align: center; font-size: 12pt; }}
        .student-info-table td {{ padding: 6px 8px; border: 1px solid #d1d5db; }}
        .student-info-table tr:nth-child(even) {{ background-color: #f9fafb; }}
        .label {{ font-weight: bold; color: #374151; }}
        
        .score-table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
        .score-table th {{ background-color: #3b82f6; color: white; padding: 5px; border: 1px solid #9ca3af; font-size: 9pt; }}
        .score-table td {{ padding: 5px; border: 1px solid #d1d5db; text-align: center; font-size: 9pt; }}
        .score-table td.subject {{ text-align: left; font-weight: bold; background-color: #f0f9ff; }}
        
        .total-row td {{ background-color: #dbeafe; font-weight: bold; }}
        
        .comments-table {{ width: 100%; margin-top: 20px; }}
        .comment-box {{ border: 1px solid #d1d5db; padding: 10px; height: 80px; background-color: #fafafa; }}
        
        .grading-table {{ width: 100%; margin-top: 20px; border: 1px solid #e5e7eb; }}
        .grading-table td {{ padding: 5px; text-align: center; font-size: 8pt; }}
    </style>
</head>
<body>
    <!-- Header -->
    <table class="header-table">
        <tr>
            <td width="15%" valign="top">
                {(lambda logo_url=ReportGenerator._get_image_url(school.get("logo")): f'<img src="{logo_url}" width="100" height="100" onerror="console.error(\'Simple report logo failed to load:\', this.src);" onload="console.log(\'Simple report logo loaded successfully:\', this.src);">' if school.get('logo') else '')()}
            </td>
            <td width="85%" align="center">
                <div class="school-name">{school['name'].upper()}</div>
                <!-- Sections display -->
                <div style="margin: 5px 0;">
                    (lambda formatted=report_data.get('formatted_sections', ''): 
                        # Create badges for each section name in the formatted string
                        import re
                        parts = re.split(r'(, | and )', formatted)
                        result = []
                        for part in parts:
                            if part.strip() in [', ', ' and ']:
                                result.append(part)
                            elif part.strip():
                                result.append(f'<span class="section-badge">{part.strip()}</span>')
                        return ''.join(result)
                    )()
                </div>
                <div class="school-info">{school.get('address', '')}</div>
                <div class="school-info">Tel: {school.get('phone', '')}</div>
                <div class="school-info">{term['name']} - {term['session']}</div>
            </td>
        </tr>
    </table>
    <div class="report-title" style="text-align: center; margin: 10px 0 20px 0;">STUDENT PERFORMANCE REPORT</div>

    <!-- Enhanced Student Information Table -->
    <table class="student-info-table">
        <thead>
            <tr>
                <th colspan="4">STUDENT INFORMATION</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="label" width="20%">Student Name:</td>
                <td width="30%">{student['name'].upper()}</td>
                <td class="label" width="20%">Class:</td>
                <td width="30%">{student['class_name']}</td>
            </tr>
            <tr>
                <td class="label">Admission Number:</td>
                <td>{student.get('admission_number', 'N/A')}</td>
                <td class="label">Position:</td>
                <td>{ReportGenerator.format_position(position)} out of {total_students}</td>
            </tr>
            <tr>
                <td class="label">Overall Score:</td>
                <td>{overall_total:.1f}/{overall_max}</td>
                <td class="label">Percentage/Grade:</td>
                <td>{overall_percentage:.1f}% - Grade: {overall_grade}</td>
            </tr>
        </tbody>
    </table>

    <!-- Scores -->
    <table class="score-table">
        <thead>
            <tr>
                <th width="5%">SN</th>
                <th width="25%">SUBJECT</th>
                {''.join(f'<th>{ReportGenerator._get_assessment_display_name(a, assessment_types)} Score</th><th>{ReportGenerator._get_assessment_display_name(a, assessment_types)} Max</th>' for a in assessments)}
                <th width="10%">TOTAL</th>
                <th width="10%">GRADE</th>
            </tr>
        </thead>
        <tbody>
        '''

        serial_number = 1
        for subject_data in scores.values():
            percentage = (subject_data['total'] / subject_data['max_total']
                          * 100) if subject_data['max_total'] > 0 else 0
            grade = ReportGenerator.get_grade(percentage, grade_scale)

            html += f'<tr><td>{serial_number}</td><td class="subject">{subject_data["subject_name"]}</td>'
            serial_number += 1

            for assessment_code in assessments:
                assessment = subject_data['assessments'].get(assessment_code)
                if assessment:
                    is_cbt = assessment.get('is_cbt', False)
                    cbt_mark = ' (CBT)' if is_cbt else ''
                    html += f'<td>{assessment["score"]:.1f}{cbt_mark}</td><td>{assessment["max_score"]}</td>'
                else:
                    html += '<td>-</td><td>-</td>'

            html += f'<td>{subject_data["total"]:.1f}</td><td>{grade}</td></tr>'

        # Total Row
        html += f'''
            <tr class="total-row">
                    <td>OVERALL TOTAL</td>
                    <td></td>
                    {''.join('<td></td><td></td>' for _ in assessments)}
                    <td>{overall_total:.1f}</td>
                    <td>{overall_grade}</td>
            </tr>
        </tbody>
    </table>

    <!-- Comments -->
    <table class="comments-table" cellspacing="10">
        <tr>
            <td width="50%" valign="top">
                <div class="label">Class Teacher's Comment:</div>
                <div class="comment-box"></div>
                <div style="margin-top: 10px; border-top: 1px solid black; width: 80%;">Signature & Date</div>
            </td>
            <td width="50%" valign="top">
                <div class="label">Principal's Comment:</div>
                <div class="comment-box"></div>
                <div style="margin-top: 10px; border-top: 1px solid black; width: 80%;">Signature & Date</div>
            </td>
        </tr>
    </table>

    <!-- Grading System -->
    <table class="grading-table">
        <tr>
            <td width="20%"><strong>Grading Legend:</strong></td>
            {''.join(f'<td>{r["grade"]} ({r["min_score"]}-{r["max_score"]}%) {r.get("remark", "")}</td>' for r in grade_scale["grade_ranges"])}
        </tr>
    </table>
    
    <div style="text-align: center; margin-top: 20px; font-size: 8pt; color: #6b7280;">
        This is an official document issued by {school['name']}. Any alteration makes it invalid.
    </div>
</body>
</html>
        '''
        return html
