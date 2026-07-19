"""Service for generating student performance reports"""
import os
import base64
import mimetypes
from datetime import timedelta

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
from models.student_trait import StudentTrait
from models.trait_definition import TraitDefinition
from models.attendance import Attendance
from sqlalchemy import func


# --- Font CSS using /static/ paths (rewritten to file:/// by _rewrite_static_urls for WeasyPrint) ---
_FONT_CSS = (
    "@font-face { font-family:'Inter'; src:url('/static/fonts/Inter/Inter-VariableFont_opsz,wght.ttf') format('truetype'); font-weight:100 900; font-style:normal; }\n"
    "@font-face { font-family:'Inter'; src:url('/static/fonts/Inter/Inter-Italic-VariableFont_opsz,wght.ttf') format('truetype'); font-weight:100 900; font-style:italic; }\n"
    "@font-face { font-family:'Space Grotesk'; src:url('/static/fonts/Space_Grotesk/SpaceGrotesk-VariableFont_wght.ttf') format('truetype'); font-weight:300 700; font-style:normal; }\n"
    "@font-face { font-family:'JetBrains Mono'; src:url('/static/fonts/JetBrains_Mono/JetBrainsMono-VariableFont_wght.ttf') format('truetype'); font-weight:100 800; font-style:normal; }\n"
    "@font-face { font-family:'JetBrains Mono'; src:url('/static/fonts/JetBrains_Mono/JetBrainsMono-Italic-VariableFont_wght.ttf') format('truetype'); font-weight:100 800; font-style:italic; }\n"
)


class ReportGenerator:
    """Generate student performance reports with flexible exam merging"""

    # Cache for embedded images: resolved_path -> data_uri
    _image_cache = {}

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

        # Check cache first
        cache_key = path_or_url.replace('\\', '/').rstrip('/')
        cached = ReportGenerator._image_cache.get(cache_key)
        if cached is not None:
            return cached

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
                    result = f'data:{mime};base64,{b64}'
                    ReportGenerator._image_cache[cache_key] = result
                    return result
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

        clean_path = path_or_url
        prefixes_to_remove = ['static/uploads/', 'static/']
        for prefix in prefixes_to_remove:
            if clean_path.startswith(prefix):
                clean_path = clean_path[len(prefix):]
                break

        clean_path = clean_path.replace('\\', '/')
        clean_path = clean_path.lstrip('/')
        result = f'/{clean_path}'
        return result

    @staticmethod
    def _sections_to_dict(sections):
        """Convert sections (ORM or CombinedSection) to a list of dicts."""
        result = []
        for section in sections:
            if hasattr(section, 'to_dict'):
                result.append(section.to_dict())
            else:
                result.append({
                    "section_id": getattr(section, 'section_id', f"combined_{section.name.lower()}"),
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
        return result

    @staticmethod
    def _format_sections_for_display(sections_list):
        """Format sections with commas and 'and' for display."""
        if not sections_list:
            return ''
        if len(sections_list) == 1:
            return sections_list[0]['name']
        elif len(sections_list) == 2:
            return f"{sections_list[0]['name']} and {sections_list[1]['name']}"
        else:
            names = [s['name'] for s in sections_list]
            last = names.pop()
            return f"{', '.join(names)}, and {last}"

    @staticmethod
    def _build_shared_context(class_room_id, term_id, config_id=None):
        """Pre-compute all class-invariant data once for batch report generation.
        
        Returns a dict of shared data to pass as _shared to get_student_scores,
        or None if required lookups fail.
        """
        class_room = ClassRoom.query.get(class_room_id)
        if not class_room:
            return None

        term = SchoolTerm.query.get(term_id)
        if not term:
            return None

        school = School.query.first()
        if not school:
            return None

        config = ReportConfig.query.get(config_id) if config_id else None

        # Resolve grade scale
        grade_scale = None
        if config and config.grade_scale_id:
            grade_scale = GradeScale.query.get(config.grade_scale_id)
        if not grade_scale and class_room.section_id:
            section_scales = GradeScale.query.filter(
                GradeScale.school_id == school.school_id,
                GradeScale.is_active == True,
                GradeScale.sections.any(section_id=class_room.section_id)
            ).order_by(GradeScale.is_default.desc(), GradeScale.created_at.desc()).all()
            if section_scales:
                grade_scale = section_scales[0]
        if not grade_scale:
            grade_scale = GradeScale.query.filter_by(
                school_id=school.school_id, is_default=True, is_active=True).first()
        if not grade_scale:
            grade_scale = GradeScale.query.filter_by(
                school_id=school.school_id, is_active=True).first()

        # Sections
        all_sections = Section.query.filter_by(
            school_id=school.school_id, is_active=True
        ).order_by(Section.level).all()

        sections = []
        grouped_secondary_added = False
        for section in all_sections:
            if section.level == 3 or section.level == 4:
                if not grouped_secondary_added:
                    class CombinedSection:
                        def __init__(self, name, abbreviation, level, description="Combined secondary section"):
                            self.name = name
                            self.abbreviation = abbreviation
                            self.level = level
                            self.description = description
                            self.is_active = True
                            self.school_id = section.school_id
                    sections.append(CombinedSection("Secondary", "Secondary", 3))
                    grouped_secondary_added = True
                continue
            else:
                sections.append(section)

        sections_data = ReportGenerator._sections_to_dict(sections)

        # Assessment types
        all_assessment_types = AssessmentType.query.filter_by(
            school_id=school.school_id, is_active=True
        ).order_by(AssessmentType.order).all()

        if config:
            active_assessments = config.get_active_assessments()
            assessment_types = [at for at in all_assessment_types if at.code in active_assessments] if active_assessments else all_assessment_types
        else:
            assessment_types = all_assessment_types

        # Class subjects
        from models import class_subject, Subject
        class_subjects = db.session.query(Subject).join(
            class_subject, class_subject.c.subject_id == Subject.subject_id
        ).filter(
            class_subject.c.class_room_id == class_room_id
        ).order_by(
            class_subject.c.display_order.asc(),
            Subject.subject_name.asc()
        ).all()

        # All student IDs in this class (also gives total_students)
        all_student_ids = [
            sid for (sid,) in db.session.query(User.id).filter(
                User.class_room_id == class_room_id,
                User.role == 'student'
            ).all()
        ]
        total_students = len(all_student_ids)

        # Class position & average (computed once, shared across all students)
        # Single GROUP BY query replaces N individual queries
        student_totals_rows = db.session.query(
            Grade.student_id,
            func.sum(Grade.score).label('total_score'),
            func.sum(Grade.max_score).label('total_max')
        ).filter(
            Grade.student_id.in_(all_student_ids),
            Grade.term_id == term_id,
            Grade.class_room_id == class_room_id,
            db.or_(Grade.is_published == True, Grade.is_from_cbt == True)
        ).group_by(Grade.student_id).all()

        student_score_map = {row.student_id: (row.total_score or 0, row.total_max or 0) for row in student_totals_rows}

        # Position map: sort by total score descending
        class_position_results = [(sid, student_score_map.get(sid, (0, 0))[0]) for sid in all_student_ids]
        class_position_results.sort(key=lambda x: x[1], reverse=True)
        position_map = {}
        for pos, (sid, _) in enumerate(class_position_results, start=1):
            position_map[sid] = pos

        # Class average from pre-computed per-student totals
        percentages = []
        for sid in all_student_ids:
            total_score, total_max = student_score_map.get(sid, (0, 0))
            if total_max > 0:
                percentages.append((total_score / total_max) * 100)
        class_average = round(sum(percentages) / len(percentages), 1) if percentages else 0

        # Bulk-fetch all class grades for subject positions
        all_class_grades = db.session.query(
            Grade.subject_id, Grade.student_id, Grade.score
        ).filter(
            Grade.class_room_id == class_room_id,
            Grade.term_id == term_id,
            Grade.student_id.in_(all_student_ids),
            db.or_(Grade.is_published == True, Grade.is_from_cbt == True)
        ).all()
        subject_student_totals = {}
        for subj_id, stu_id, score in all_class_grades:
            subject_student_totals.setdefault(subj_id, {})
            subject_student_totals[subj_id][stu_id] = (
                subject_student_totals[subj_id].get(stu_id, 0) + score
            )

        # Grade ranges
        grade_ranges = grade_scale.get_grade_ranges() if grade_scale else []

        # Returned assessment types (with merged exams)
        returned_assessment_types = [a.to_dict() for a in assessment_types]
        if config:
            merge_config = config.get_merge_config()
            merged_exams = merge_config.get('merged_exams', [])
            active_assessments = config.get_active_assessments()
            if merged_exams:
                for merge_rule in merged_exams:
                    display_as = merge_rule.get('display_as', merge_rule['name'])
                    components = merge_rule['components']
                    component_max_total = 0
                    for comp in components:
                        comp_type = next((at for at in all_assessment_types if at.code == comp), None)
                        if comp_type:
                            component_max_total += comp_type.max_score
                    max_score = component_max_total if component_max_total > 0 else 100
                    if not any(at['code'] == display_as for at in returned_assessment_types):
                        returned_assessment_types.append({
                            'code': display_as, 'name': display_as, 'max_score': max_score,
                            'order': 100 + len(returned_assessment_types),
                            'school_id': school.school_id, 'is_active': True
                        })
            merged_component_codes = set()
            for merge_rule in merged_exams:
                merged_component_codes.update(merge_rule['components'])
            merged_display_names = [rule.get('display_as', rule['name']) for rule in merged_exams]
            if active_assessments:
                returned_assessment_types = [at for at in returned_assessment_types
                    if (at['code'] in active_assessments or at['code'] in merged_display_names)
                    and at['code'] not in merged_component_codes]
            else:
                returned_assessment_types = [at for at in returned_assessment_types
                    if at['code'] not in merged_component_codes]

        # FORCE 100 max total and scale assessment type maxes
        total_at_max = sum(at['max_score'] for at in returned_assessment_types)
        if total_at_max > 0:
            header_scale = 100.0 / total_at_max
            for at in returned_assessment_types:
                if 'max_score' in at:
                    at['max_score'] = at['max_score'] * header_scale
        returned_assessment_types.sort(key=lambda x: x.get('order', 0))

        # --- Bulk-fetch per-student data to avoid N+1 queries ---
        # All grades for the class, keyed by student_id
        all_grades_rows = db.session.query(Grade).filter(
            Grade.class_room_id == class_room_id,
            Grade.term_id == term_id,
            Grade.student_id.in_(all_student_ids),
            db.or_(Grade.is_published == True, Grade.is_from_cbt == True)
        ).all()
        grades_by_student = {}
        for g in all_grades_rows:
            grades_by_student.setdefault(g.student_id, []).append(g)

        # All attendance records for the class, keyed by student_id
        from models.attendance import Attendance
        all_attendance = Attendance.query.filter(
            Attendance.student_id.in_(all_student_ids),
            Attendance.term_id == term_id
        ).all()
        attendance_by_student = {}
        for att in all_attendance:
            attendance_by_student.setdefault(att.student_id, []).append(att)

        # All student traits for the class, keyed by student_id
        all_traits = StudentTrait.query.filter(
            StudentTrait.student_id.in_(all_student_ids),
            StudentTrait.term_id == term_id
        ).all()
        traits_by_student = {}
        for st in all_traits:
            traits_by_student.setdefault(st.student_id, []).append(st)

        # Trait definitions (once for the whole school)
        trait_definitions = [
            {'name': t.name, 'max_score': t.max_score}
            for t in TraitDefinition.query.filter_by(
                school_id=school.school_id, is_active=True
            ).order_by(TraitDefinition.sort_order).all()
        ]

        # Embed school logo once for WeasyPrint (avoids re-reading per student)
        embedded_logo = ReportGenerator._embed_image(school.logo) if school.logo else ''

        return {
            'class_room': class_room,
            'term': term,
            'school': school,
            'config': config,
            'grade_scale': grade_scale,
            'all_assessment_types': all_assessment_types,
            'sections': sections,
            'sections_data': sections_data,
            'format_sections_for_display': ReportGenerator._format_sections_for_display,
            'class_subjects': class_subjects,
            'total_students': total_students,
            'student_positions': position_map,
            'class_average': class_average,
            'subject_student_totals': subject_student_totals,
            'grade_ranges': grade_ranges,
            'returned_assessment_types': returned_assessment_types,
            'grades_by_student': grades_by_student,
            'attendance_by_student': attendance_by_student,
            'traits_by_student': traits_by_student,
            'trait_definitions': trait_definitions,
            'embedded_logo': embedded_logo,
        }

    @staticmethod
    def get_student_scores(student_id, term_id, class_room_id, config_id=None, _shared=None):
        """Get all scores for a student in a specific term and class.
        
        Args:
            _shared: Optional pre-computed class-invariant data dict (from _build_shared_context).
                     When provided, skips redundant DB queries for class/school/term data.
        """
        # Get user and related info
        user = User.query.get(student_id)
        if not user:
            return None

        student = user.student
        if not student:
            return None

        # --- Use pre-computed shared data when available (batch mode) ---
        if _shared is not None:
            class_room = _shared['class_room']
            term = _shared['term']
            school = _shared['school']
            config = _shared['config']
            grade_scale = _shared['grade_scale']
            all_assessment_types = _shared['all_assessment_types']
            sections = _shared['sections']
            sections_data = _shared['sections_data']
            format_sections_for_display = _shared['format_sections_for_display']
            position = _shared['student_positions'].get(student_id)
            class_average = _shared['class_average']
            total_students = _shared['total_students']
            returned_assessment_types = _shared['returned_assessment_types']
            grade_ranges = _shared['grade_ranges']
            subject_student_totals = _shared['subject_student_totals']

            # Initialize subject scores from pre-fetched class subjects (deep copy per student)
            from models import class_subject, Subject
            class_subjects = _shared['class_subjects']
            subject_scores = {
                s.subject_id: {
                    'subject_name': s.subject_name,
                    'assessments': {},
                    'total': 0,
                    'max_total': 0
                } for s in class_subjects
            }

            # CBT sync already done in bulk by get_class_report_data — skip per-student

            # Use pre-fetched grades from _shared (avoids per-student query)
            grades = _shared['grades_by_student'].get(student_id, [])

        else:
            # --- Original path: query everything (single student mode) ---
            class_room = ClassRoom.query.get(class_room_id)
            if not class_room:
                return None

            term = SchoolTerm.query.get(term_id)
            if not term:
                return None

            school = School.query.first()
            if not school:
                return None

            config = ReportConfig.query.get(config_id) if config_id else None

            grade_scale = None
            if config and config.grade_scale_id:
                grade_scale = GradeScale.query.get(config.grade_scale_id)
            if not grade_scale and class_room.section_id:
                section_scales = GradeScale.query.filter(
                    GradeScale.school_id == school.school_id,
                    GradeScale.is_active == True,
                    GradeScale.sections.any(section_id=class_room.section_id)
                ).order_by(GradeScale.is_default.desc(), GradeScale.created_at.desc()).all()
                if section_scales:
                    grade_scale = section_scales[0]
            if not grade_scale:
                grade_scale = GradeScale.query.filter_by(
                    school_id=school.school_id, is_default=True, is_active=True).first()
            if not grade_scale:
                grade_scale = GradeScale.query.filter_by(
                    school_id=school.school_id, is_active=True).first()

            all_sections = Section.query.filter_by(
                school_id=school.school_id, is_active=True
            ).order_by(Section.level).all()

            sections = []
            grouped_secondary_added = False
            for section in all_sections:
                if section.level == 3 or section.level == 4:
                    if not grouped_secondary_added:
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
                    continue
                else:
                    sections.append(section)

            all_assessment_types = AssessmentType.query.filter_by(
                school_id=school.school_id, is_active=True
            ).order_by(AssessmentType.order).all()

            if config:
                active_assessments = config.get_active_assessments()
                assessment_types = [at for at in all_assessment_types if at.code in active_assessments] if active_assessments else all_assessment_types
            else:
                assessment_types = all_assessment_types

            from models import class_subject, Subject
            class_subjects = db.session.query(Subject).join(
                class_subject, class_subject.c.subject_id == Subject.subject_id
            ).filter(
                class_subject.c.class_room_id == class_room_id
            ).order_by(
                class_subject.c.display_order.asc(),
                Subject.subject_name.asc()
            ).all()

            subject_scores = {
                s.subject_id: {
                    'subject_name': s.subject_name,
                    'assessments': {},
                    'total': 0,
                    'max_total': 0
                } for s in class_subjects
            }

            from utils.grade_sync import sync_student_exam_records
            try:
                sync_result = sync_student_exam_records(
                    student_id=student_id, class_id=class_room_id, term_id=term_id)
                if sync_result['synced'] > 0 or sync_result['updated'] > 0:
                    print(f"Auto-synced CBT scores for student {student_id[:8]}: {sync_result['synced']} new, {sync_result['updated']} updated")
            except Exception as e:
                print(f"Warning: Error during auto-sync: {str(e)}")

            grades = Grade.query.filter_by(
                student_id=student_id,
                term_id=term_id,
                class_room_id=class_room_id
            ).all()

            # Calculate class position and average (only when not shared)
            position = ReportGenerator.calculate_class_position(
                student_id, term_id, class_room_id
            )
            class_average = ReportGenerator.calculate_class_average(
                term_id, class_room_id
            )
            total_students = db.session.query(func.count(User.id)).join(
                Student, Student.user_id == User.id
            ).filter(
                User.class_room_id == class_room_id,
                User.role == 'student'
            ).scalar()

            grade_ranges = grade_scale.get_grade_ranges() if grade_scale else []

            # Prepare returned assessment types
            returned_assessment_types = [a.to_dict() for a in assessment_types]
            if config:
                merge_config = config.get_merge_config()
                merged_exams = merge_config.get('merged_exams', [])
                active_assessments = config.get_active_assessments()
                if merged_exams:
                    for merge_rule in merged_exams:
                        display_as = merge_rule.get('display_as', merge_rule['name'])
                        components = merge_rule['components']
                        component_max_total = 0
                        for comp in components:
                            comp_type = next((at for at in all_assessment_types if at.code == comp), None)
                            if comp_type:
                                component_max_total += comp_type.max_score
                        max_score = component_max_total if component_max_total > 0 else 100
                        if not any(at['code'] == display_as for at in returned_assessment_types):
                            returned_assessment_types.append({
                                'code': display_as, 'name': display_as, 'max_score': max_score,
                                'order': 100 + len(returned_assessment_types),
                                'school_id': school.school_id, 'is_active': True
                            })
                merged_component_codes = set()
                for merge_rule in merged_exams:
                    merged_component_codes.update(merge_rule['components'])
                merged_display_names = [rule.get('display_as', rule['name']) for rule in merged_exams]
                if active_assessments:
                    returned_assessment_types = [at for at in returned_assessment_types
                        if (at['code'] in active_assessments or at['code'] in merged_display_names)
                        and at['code'] not in merged_component_codes]
                else:
                    returned_assessment_types = [at for at in returned_assessment_types
                        if at['code'] not in merged_component_codes]

            for subject_id, subject_data in subject_scores.items():
                subject_data['max_total'] = 100.0
            total_at_max = sum(at['max_score'] for at in returned_assessment_types)
            if total_at_max > 0:
                header_scale = 100.0 / total_at_max
                for at in returned_assessment_types:
                    if 'max_score' in at:
                        at['max_score'] = at['max_score'] * header_scale
            returned_assessment_types.sort(key=lambda x: x.get('order', 0))

            sections_data = ReportGenerator._sections_to_dict(sections)

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
                    return f"{', '.join(names)}, and {last}"

            # Build subject_student_totals for subject positions
            all_class_student_ids = [sid for (sid,) in db.session.query(User.id).filter(
                User.class_room_id == class_room_id, User.role == 'student').all()]
            all_class_grades = db.session.query(
                Grade.subject_id, Grade.student_id, Grade.score
            ).filter(
                Grade.class_room_id == class_room_id, Grade.term_id == term_id,
                Grade.student_id.in_(all_class_student_ids),
                db.or_(Grade.is_published == True, Grade.is_from_cbt == True)
            ).all()
            subject_student_totals = {}
            for subj_id, stu_id, score in all_class_grades:
                subject_student_totals.setdefault(subj_id, {})
                subject_student_totals[subj_id][stu_id] = (
                    subject_student_totals[subj_id].get(stu_id, 0) + score)

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

        # --- Subject positions & teacher remarks ---
        for subject_id, subject_data in subject_scores.items():
            totals = subject_student_totals.get(subject_id, {})
            ranked = sorted(totals.items(), key=lambda x: x[1], reverse=True)
            subject_position = None
            for rank, (sid, _) in enumerate(ranked, start=1):
                if sid == student_id:
                    subject_position = rank
                    break
            subject_data['subject_position'] = subject_position

            max_total = subject_data.get('max_total', 0)
            subj_pct = (subject_data['total'] / max_total * 100) if max_total > 0 else 0
            subject_data['teacher_remark'] = ReportGenerator.get_remark(
                subj_pct, {'grade_ranges': grade_ranges} if grade_ranges else None
            )

        # --- Attendance stats ---
        if _shared is not None:
            attendance_records = _shared['attendance_by_student'].get(student_id, [])
        else:
            attendance_records = Attendance.query.filter_by(
                student_id=student_id,
                term_id=term_id
            ).all()
        present_count = sum(
            1 for a in attendance_records if a.status in ('present', 'late', 'excused')
        )
        absent_count = sum(1 for a in attendance_records if a.status == 'absent')

        # Calculate days_open from term's stored value, fallback to weekday count
        if term.open_days is not None:
            days_open = term.open_days
        elif term.start_date and term.end_date:
            days_open = 0
            current_day = term.start_date
            while current_day <= term.end_date:
                if current_day.weekday() < 5:  # Mon-Fri
                    days_open += 1
                current_day += timedelta(days=1)
        else:
            days_open = 0

        holidays = max(0, days_open - present_count - absent_count)

        attendance_stats = {
            'days_open': days_open,
            'present': present_count,
            'absent': absent_count,
            'holidays': holidays,
        }

        report_data = {
            'student': {
                'id': student_id,
                'name': f"{user.first_name} {user.last_name}".upper(),
                'admission_number': f"NCAT/{class_room.class_room_name.strip().replace(' ', '')}/{student.admission_number}" if student.admission_number else '',
                'image': user.image,
                'gender': user.gender,
                'class_name': class_room.class_room_name,
                'class_id': class_room_id,
                'house': getattr(student, 'house', '') or '',
            },
            'school': {
                'name': school.school_name,
                'logo': _shared['embedded_logo'] if _shared is not None else school.logo,
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
                'end_date': term.end_date.strftime('%Y-%m-%d') if term.end_date else '-',
                'teacher_remarks': '',
                'house_master_remarks': '',
                'principal_remarks': '',
            },
            'assessment_types': returned_assessment_types,
            'scores': subject_scores,
            'position': position,
            'total_students': total_students,
            'class_average': class_average,
            'overall_total': sum(s['total'] for s in subject_scores.values()),
            'overall_max': sum(s['max_total'] for s in subject_scores.values()),
            'config': config.to_dict() if config else None,
            'grade_scale': grade_scale.to_dict() if grade_scale else None,
            'custom_variables': config.get_layout_config().get('custom_variables', {}) if config and config.get_layout_config() else {},
            'trait_scores': {
                st.trait_definition.name: st.score
                for st in (_shared['traits_by_student'].get(user.id, []) if _shared is not None else StudentTrait.query.filter_by(student_id=user.id, term_id=term_id).all())
                if st.trait_definition
            },
            'trait_definitions': _shared['trait_definitions'] if _shared is not None else [
                {'name': t.name, 'max_score': t.max_score}
                for t in TraitDefinition.query.filter_by(school_id=school.school_id, is_active=True).order_by(TraitDefinition.sort_order).all()
            ],
            'attendance_stats': attendance_stats,
        }

        auto = ReportGenerator.generate_auto_remarks(report_data)
        if not report_data['term']['teacher_remarks']:
            report_data['term']['teacher_remarks'] = auto['teacher_remarks']
        if not report_data['term']['house_master_remarks']:
            report_data['term']['house_master_remarks'] = auto['house_master_remarks']
        if not report_data['term']['principal_remarks']:
            report_data['term']['principal_remarks'] = auto['principal_remarks']

        return report_data

    @staticmethod
    def generate_auto_remarks(report_data):
        """Generate performance-based remarks for form master, house master, and principal."""
        overall_total = report_data.get('overall_total', 0)
        overall_max = report_data.get('overall_max', 100)
        percentage = (overall_total / overall_max * 100) if overall_max > 0 else 0
        position = report_data.get('position')
        total_students = report_data.get('total_students', 1)
        class_average = report_data.get('class_average', 0)
        attendance = report_data.get('attendance_stats', {})
        days_open = attendance.get('days_open', 0)
        present = attendance.get('present', 0)
        absent = attendance.get('absent', 0)
        student_name = report_data.get('student', {}).get('name', '')
        first_name = student_name.split()[0] if student_name else 'the student'
        house = report_data.get('student', {}).get('house', '')
        trait_scores = report_data.get('trait_scores', {})

        # --- Helpers ---
        def _position_ratio():
            if not position or not total_students:
                return 0.5
            return position / total_students

        def _attendance_rate():
            if days_open <= 0:
                return 1.0
            return present / days_open

        def _trait_average():
            if not trait_scores:
                return None
            values = list(trait_scores.values())
            return sum(values) / len(values) if values else None

        # --- Form Master's Comment ---
        teacher_remarks = ''
        if percentage >= 70:
            if _position_ratio() <= 0.2:
                teacher_remarks = (
                    f'{first_name} is a diligent and highly focused student who consistently '
                    f'excels academically. A role model to peers. Keep up the outstanding work.'
                )
            else:
                teacher_remarks = (
                    f'{first_name} is a hardworking student with a strong grasp of the subjects. '
                    f'Continued dedication will yield even greater results.'
                )
        elif percentage >= 50:
            if _position_ratio() <= 0.4:
                teacher_remarks = (
                    f'{first_name} shows good promise and has performed above average. '
                    f'Consistent effort and focus will push the results even higher.'
                )
            else:
                teacher_remarks = (
                    f'{first_name} has performed satisfactorily this term. '
                    f'More effort in weak areas is encouraged for improvement.'
                )
        elif percentage >= 40:
            teacher_remarks = (
                f'{first_name} needs to put in more effort across all subjects. '
                f'Attending extra lessons and dedicating more time to study is strongly advised.'
            )
        else:
            teacher_remarks = (
                f'{first_name}\'s performance this term is below expectation. '
                f'A complete turnaround in study habits is urgently needed. '
                f'Parental guidance and extra lessons are highly recommended.'
            )

        # --- House Master's Comment ---
        trait_avg = _trait_average()
        house_remarks = ''
        if _position_ratio() <= 0.2 and (trait_avg is None or trait_avg >= 0.6):
            house_remarks = (
                f'{first_name} is a responsible student who demonstrates good discipline '
                f'and relates well with peers. Encouraged to take on leadership roles.'
            )
        elif _position_ratio() <= 0.6:
            if house:
                house_remarks = (
                    f'{first_name} cooperates well with fellow {house} House members '
                    f'and participates actively in school activities. '
                    f'Encouraged to take on more responsibilities.'
                )
            else:
                house_remarks = (
                    f'{first_name} cooperates well with peers and is an active member of the school community. '
                    f'Encouraged to take on more responsibilities.'
                )
        else:
            house_remarks = (
                f'{first_name} needs to show greater discipline and commitment to school activities. '
                f'Improved conduct and participation are expected next term.'
            )

        # --- Principal's Comment ---
        principal_remarks = ''
        if percentage >= 50 and _position_ratio() <= 0.5:
            principal_remarks = (
                f'A commendable result this term. {first_name} is promoted on merit. '
                f'Well done, keep striving for excellence.'
            )
        elif percentage >= 50:
            principal_remarks = (
                f'Satisfactory performance overall. {first_name} is promoted on trial. '
                f'Must improve class standing next term through greater effort.'
            )
        elif percentage >= 40:
            principal_remarks = (
                f'Below expectations this term. {first_name} is promoted on trial. '
                f'Strict improvement in academics and conduct is required next term.'
            )
        else:
            principal_remarks = (
                f'Unsatisfactory performance. {first_name} needs significant improvement '
                f'in all areas. Dedicated effort and parental involvement are expected next term.'
            )

        return {
            'teacher_remarks': teacher_remarks,
            'house_master_remarks': house_remarks,
            'principal_remarks': principal_remarks,
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
    def calculate_class_average(term_id, class_room_id):
        """Calculate the average percentage across all students in a class.

        For each student, compute (total_score / total_max_score * 100),
        then return the average of those percentages.
        """
        students = db.session.query(User.id).filter(
            User.class_room_id == class_room_id,
            User.role == 'student'
        ).all()

        percentages = []
        for (sid,) in students:
            result = db.session.query(
                func.sum(Grade.score),
                func.sum(Grade.max_score)
            ).filter(
                Grade.student_id == sid,
                Grade.term_id == term_id,
                Grade.class_room_id == class_room_id,
                db.or_(Grade.is_published == True, Grade.is_from_cbt == True)
            ).first()

            total_score = result[0] or 0
            total_max = result[1] or 0

            if total_max > 0:
                percentages.append((total_score / total_max) * 100)

        if not percentages:
            return 0

        return round(sum(percentages) / len(percentages), 1)

    @staticmethod
    def get_class_report_data(class_room_id, term_id, config_id=None):
        """Get report data for all students in a class (optimized with shared context)"""
        # Pre-compute all class-invariant data once
        _shared = ReportGenerator._build_shared_context(class_room_id, term_id, config_id)
        if _shared is None:
            return []

        students = User.query.filter_by(
            class_room_id=class_room_id,
            role='student'
        ).all()

        student_ids = [s.id for s in students]

        # Bulk sync CBT exam records once for all students (instead of per-student)
        from utils.grade_sync import sync_class_exam_records
        try:
            sync_result = sync_class_exam_records(
                student_ids, class_id=class_room_id, term_id=term_id)
            if sync_result['synced'] > 0 or sync_result['updated'] > 0:
                print(f"Bulk-synced CBT scores: {sync_result['synced']} new, {sync_result['updated']} updated")
        except Exception as e:
            print(f"Warning: Error during bulk CBT sync: {str(e)}")

        reports = []
        for student in students:
            report_data = ReportGenerator.get_student_scores(
                student.id, term_id, class_room_id, config_id, _shared=_shared
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
        """Generate HTML for a student report card using dynamic layout system or fallback"""
        from flask import current_app
        
        config = report_data.get('config')
        
        # Check if config has layout_config
        if config and config.get('layout_config'):
            template_name = config['layout_config'].get('template', 'unknown')
            try:
                print(f"[REPORT] Using layout template: {template_name}")
                return ReportGenerator.generate_report_with_layout(report_data, config['layout_config'])
            except Exception as e:
                print(f"[REPORT] ERROR: Template '{template_name}' failed: {str(e)}")
                import traceback
                traceback.print_exc()
                # Fallback to default HTML generation
                print(f"[REPORT] Falling back to _generate_default_html")
                return ReportGenerator._generate_default_html(report_data)
        else:
            # Use default hardcoded layout
            print(f"[REPORT] No layout_config found in config, using _generate_default_html")
            return ReportGenerator._generate_default_html(report_data)

    @staticmethod
    def generate_report_with_layout(report_data, layout_config):
        """Generate HTML using dynamic layout configuration and template engine"""
        from flask import render_template, request
        import copy

        template_name = layout_config.get('template', 'modern_portrait')
        page_settings = layout_config.get('page_settings', {
            'orientation': 'portrait',
            'margin': '8mm',
            'size': 'A4'
        })
        sections = layout_config.get('sections', [])
        custom_css = layout_config.get('custom_css', '')

        # Sort sections by order
        sections = sorted(sections, key=lambda x: x.get('order', 0))

        # Make a shallow copy so we can resolve image URLs for template rendering
        template_data = copy.copy(report_data)

        # Deep-copy the nested dicts we'll mutate (student, school)
        student = dict(report_data.get('student', {}))
        school = dict(report_data.get('school', {}))

        # Build base URL for absolute image URLs (WeasyPrint needs absolute URLs)
        try:
            base_url = request.host_url.rstrip('/')
        except RuntimeError:
            base_url = ''

        # Embed images as base64 data URIs so WeasyPrint doesn't need HTTP fetches
        if student.get('image'):
            student['image'] = ReportGenerator._embed_image(student['image'])
        else:
            # Default avatar based on gender
            gender = student.get('gender', '')
            if gender and gender.lower() == 'male':
                default_avatar = os.path.join('static', 'images', 'student', 'default', 'st_male.png')
            else:
                default_avatar = os.path.join('static', 'images', 'student', 'default', 'st_neutral_femal.png')
            student['image'] = ReportGenerator._embed_image(default_avatar)

        if school.get('logo'):
            school['logo'] = ReportGenerator._embed_image(school['logo'])

        template_data = dict(report_data)
        template_data['student'] = student
        template_data['school'] = school

        # Render using template
        try:
            html = render_template(
                f'report_layouts/{template_name}.html',
                report_data=template_data,
                layout_config=layout_config,
                page_settings=page_settings,
                sections=sections,
                custom_css=custom_css,
                font_css=_FONT_CSS,
            )
            return html
        except Exception as e:
            print(f"Template rendering error: {str(e)}")
            import traceback
            traceback.print_exc()
            # Fallback to base template with manual rendering
            return ReportGenerator._render_with_base_template(
                template_data, layout_config, page_settings, sections, custom_css
            )

    @staticmethod
    def _get_sample_report_data():
        """Generate sample report data for layout preview (no real student needed)"""
        return {
            'student': {
                'id': 'sample',
                'name': 'SAMPLE STUDENT',
                'admission_number': 'SMP/001',
                'image': '',
                'gender': 'Male',
                'class_name': 'JSS 1A',
                'class_id': 'sample',
                'house': 'Eagle House',
            },
            'school': {
                'name': 'Sample School International',
                'logo': '',
                'address': '123 Education Lane, Sample City',
                'phone': '+234 123 456 7890',
                'motto': 'Excellence in Education'
            },
            'sections': [],
            'formatted_sections': 'Nursery, Primary, and Secondary',
            'term': {
                'name': 'First Term',
                'session': '2025/2026',
                'start_date': '2025-09-01',
                'end_date': '2025-12-15',
                'teacher_remarks': '',
                'house_master_remarks': '',
                'principal_remarks': '',
            },
            'assessment_types': [
                {'code': 'ca', 'name': 'CA', 'max_score': 40, 'order': 1},
                {'code': 'exam', 'name': 'Exam', 'max_score': 60, 'order': 2}
            ],
            'scores': {
                'sub1': {'subject_name': 'Mathematics', 'assessments': {'ca': {'score': 30, 'max_score': 40}, 'exam': {'score': 50, 'max_score': 60}}, 'total': 80, 'max_total': 100, 'subject_position': 2, 'teacher_remark': 'Very Good'},
                'sub2': {'subject_name': 'English Language', 'assessments': {'ca': {'score': 35, 'max_score': 40}, 'exam': {'score': 55, 'max_score': 60}}, 'total': 90, 'max_total': 100, 'subject_position': 1, 'teacher_remark': 'Excellent'},
                'sub3': {'subject_name': 'Basic Science', 'assessments': {'ca': {'score': 28, 'max_score': 40}, 'exam': {'score': 42, 'max_score': 60}}, 'total': 70, 'max_total': 100, 'subject_position': 3, 'teacher_remark': 'Good'},
                'sub4': {'subject_name': 'Social Studies', 'assessments': {'ca': {'score': 32, 'max_score': 40}, 'exam': {'score': 48, 'max_score': 60}}, 'total': 80, 'max_total': 100, 'subject_position': 2, 'teacher_remark': 'Very Good'},
            },
            'position': 5,
            'total_students': 30,
            'overall_total': 320,
            'overall_max': 400,
            'config': {
                'resumption_date': None
            },
            'grade_scale': {
                'grade_ranges': [
                    {'grade': 'A', 'min_score': 70, 'max_score': 100, 'remark': 'Excellent'},
                    {'grade': 'B', 'min_score': 60, 'max_score': 69.99, 'remark': 'Very Good'},
                    {'grade': 'C', 'min_score': 50, 'max_score': 59.99, 'remark': 'Good'},
                    {'grade': 'D', 'min_score': 45, 'max_score': 49.99, 'remark': 'Fair'},
                    {'grade': 'E', 'min_score': 40, 'max_score': 44.99, 'remark': 'Pass'},
                    {'grade': 'F', 'min_score': 0, 'max_score': 39.99, 'remark': 'Fail'},
                ]
            },
            'trait_scores': {
                'Punctuality': 4,
                'Attitude to Study': 5,
                'Class Attendance': 4,
            },
            'attendance_stats': {
                'days_open': 60,
                'present': 57,
                'absent': 3,
                'holidays': 0,
            },
        }

    @staticmethod
    def _render_with_base_template(report_data, layout_config, page_settings, sections, custom_css):
        """Fallback rendering using base template manually"""
        from flask import render_template
        
        return render_template(
            'report_layouts/base.html',
            report_data=report_data,
            layout_config=layout_config,
            page_settings=page_settings,
            sections=sections,
            custom_css=custom_css,
        )

    @staticmethod
    def _generate_default_html(report_data):
        """Generate HTML for a student report card - Modern Single Page Design Optimized for GTK3 (Legacy Fallback)"""
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
                        'max_score': 69.99, 'remark': 'Very Good'},
                    {'grade': 'C', 'min_score': 50,
                        'max_score': 59.99, 'remark': 'Good'},
                    {'grade': 'D', 'min_score': 45,
                        'max_score': 49.99, 'remark': 'Fair'},
                    {'grade': 'E', 'min_score': 40,
                        'max_score': 44.99, 'remark': 'Pass'},
                    {'grade': 'F', 'min_score': 0,
                        'max_score': 39.99, 'remark': 'Fail'},
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
        .student-icon {{
            width: 70px;
            height: 70px;
            border-radius: 10px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 3px solid white;
            box-shadow: 0 2px 5px rgba(99, 102, 241, 0.3);
        }}
        .student-icon img {{
            width: 64px;
            height: 64px;
            border-radius: 7px;
            object-fit: cover;
        }}
        .student-default {{
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
        }}
        .student-details {{
            display: table-cell;
            vertical-align: middle;
            padding-left: 15px;
        }}
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
                        'max_score': 69.99, 'remark': 'Very Good'},
                    {'grade': 'C', 'min_score': 50,
                        'max_score': 59.99, 'remark': 'Good'},
                    {'grade': 'D', 'min_score': 45,
                        'max_score': 49.99, 'remark': 'Fair'},
                    {'grade': 'E', 'min_score': 40,
                        'max_score': 44.99, 'remark': 'Pass'},
                    {'grade': 'F', 'min_score': 0,
                        'max_score': 39.99, 'remark': 'Fail'},
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
