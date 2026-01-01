"""Routes for report generation and management"""
from flask import Blueprint, render_template, request, jsonify, session, send_file
from models import db
from models.report_config import ReportConfig
from models.assessment_type import AssessmentType
from models.class_room import ClassRoom
from models.school_term import SchoolTerm
from models.user import User
from services.report_generator import ReportGenerator
from functools import wraps
import io
from datetime import datetime, date
# Add GTK3 to PATH for Windows if present

import os
if os.name == 'nt':
    gtk_paths = [
        r"C:\Program Files\GTK3-Runtime Win64\bin",
        r"C:\Program Files (x86)\GTK3-Runtime Win64\bin",
        r"C:\GTK3\bin",
    ]
    for path in gtk_paths:
        if os.path.exists(path):
            os.environ['PATH'] += os.pathsep + path

try:
    from weasyprint import HTML
    WEASYPRINT_AVAILABLE = True
except (ImportError, OSError) as e:
    # print(f"WeasyPrint not available: {e}")
    WEASYPRINT_AVAILABLE = False

try:
    from xhtml2pdf import pisa
    XHTML2PDF_AVAILABLE = True
except ImportError:
    # print("xhtml2pdf not available")
    XHTML2PDF_AVAILABLE = False

report_bp = Blueprint("report", __name__, url_prefix="/reports")


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated_function


def admin_or_staff_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Unauthorized"}), 401

        user = User.query.get(session["user_id"])
        if not user or user.role not in ["admin", "staff"]:
            return jsonify({"error": "Forbidden"}), 403

        return f(*args, **kwargs)
    return decorated_function


@report_bp.route("/config")
@admin_or_staff_required
def report_config_page():
    """Report configuration page"""
    user = User.query.get(session["user_id"])
    return render_template("admin/report_config.html", user=user, current_user=user)


@report_bp.route("/api/configs", methods=["GET"])
@admin_or_staff_required
def get_configs():
    """Get all report configurations"""
    from models.school import School

    school = School.query.first()
    if not school:
        return jsonify({"success": False, "error": "School not found"}), 404

    configs = ReportConfig.query.filter_by(school_id=school.school_id).all()
    # Decode generator objects and convert to list of dictionaries
    configs_list = []
    for config in configs:
        configs_list.append(config.to_dict())
    
    return jsonify({
        "success": True,
        "configs": [config.to_dict() for config in configs]
    })


@report_bp.route("/api/configs", methods=["POST"])
@admin_or_staff_required
def create_config():
    """Create a new report configuration"""
    try:
        from models.school import School

        data = request.get_json()
        school = School.query.first()

        if not school:
            return jsonify({"success": False, "error": "School not found"}), 404

        # Convert resumption_date string to date object if provided
        resumption_date = data.get("resumption_date")
        if resumption_date and isinstance(resumption_date, str):
            try:
                resumption_date = datetime.strptime(resumption_date, '%Y-%m-%d').date()
            except ValueError:
                resumption_date = None
        
        config = ReportConfig(
            school_id=school.school_id,
            term_id=data.get("term_id"),
            class_room_id=data.get("class_room_id"),
            config_name=data.get("config_name"),
            resumption_date=resumption_date,
            is_default=data.get("is_default", False)
        )

        # Set merge configuration
        if "merge_config" in data:
            config.set_merge_config(data["merge_config"])

        # Set display settings
        if "display_settings" in data:
            config.set_display_settings(data["display_settings"])

        # Set active assessments
        if "active_assessments" in data:
            config.set_active_assessments(data["active_assessments"])

        # If this is set as default, unset other defaults
        if config.is_default:
            ReportConfig.query.filter_by(
                school_id=school.school_id,
                term_id=config.term_id,
                is_default=True
            ).update({"is_default": False})

        db.session.add(config)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Report configuration created successfully",
            "config": config.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@report_bp.route("/api/configs/<config_id>", methods=["PUT"])
@admin_or_staff_required
def update_config(config_id):
    """Update a report configuration"""
    try:
        data = request.get_json()
        config = ReportConfig.query.get(config_id)

        if not config:
            return jsonify({"success": False, "error": "Configuration not found"}), 404

        # Update fields
        if "config_name" in data:
            config.config_name = data["config_name"]
        if "term_id" in data:
            config.term_id = data["term_id"]
        if "class_room_id" in data:
            config.class_room_id = data["class_room_id"]
        if "is_default" in data:
            config.is_default = data["is_default"]
        if "is_active" in data:
            config.is_active = data["is_active"]
        if "resumption_date" in data:
            resumption_date = data["resumption_date"]
            if resumption_date and isinstance(resumption_date, str):
                try:
                    resumption_date = datetime.strptime(resumption_date, '%Y-%m-%d').date()
                except ValueError:
                    resumption_date = None
            config.resumption_date = resumption_date

        # Update merge configuration
        if "merge_config" in data:
            config.set_merge_config(data["merge_config"])

        # Update display settings
        if "display_settings" in data:
            config.set_display_settings(data["display_settings"])

        # Update active assessments
        if "active_assessments" in data:
            config.set_active_assessments(data["active_assessments"])

        # If this is set as default, unset other defaults
        if config.is_default:
            from models.school import School
            school = School.query.first()
            if school:
                ReportConfig.query.filter(
                    ReportConfig.school_id == school.school_id,
                    ReportConfig.term_id == config.term_id,
                    ReportConfig.config_id != config_id,
                    ReportConfig.is_default == True
                ).update({"is_default": False})

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Report configuration updated successfully",
            "config": config.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@report_bp.route("/api/configs/<config_id>", methods=["DELETE"])
@admin_or_staff_required
def delete_config(config_id):
    """Delete a report configuration"""
    try:
        config = ReportConfig.query.get(config_id)

        if not config:
            return jsonify({"success": False, "error": "Configuration not found"}), 404

        db.session.delete(config)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Report configuration deleted successfully"
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@report_bp.route("/api/assessment-types", methods=["GET"])
@admin_or_staff_required
def get_assessment_types():
    """Get all assessment types for the school"""
    from models.school import School

    school = School.query.first()
    if not school:
        return jsonify({"success": False, "error": "School not found"}), 404

    assessments = AssessmentType.query.filter_by(
        school_id=school.school_id,
        is_active=True
    ).order_by(AssessmentType.order).all()

    return jsonify({
        "success": True,
        "assessments": [a.to_dict() for a in assessments]
    })


@report_bp.route("/api/terms", methods=["GET"])
@admin_or_staff_required
def get_terms():
    """Get all terms for the school"""
    from models.school import School

    school = School.query.first()
    if not school:
        return jsonify({"success": False, "error": "School not found"}), 404

    terms = SchoolTerm.query.filter_by(
        school_id=school.school_id
    ).order_by(SchoolTerm.start_date.desc()).all()

    return jsonify({
        "success": True,
        "terms": [{
            "term_id": term.term_id,
            "term_name": term.term_name,
            "academic_session": term.academic_session,
            "start_date": term.start_date.isoformat() if term.start_date else None,
            "end_date": term.end_date.isoformat() if term.end_date else None,
            "is_current": term.is_current if hasattr(term, 'is_current') else False
        } for term in terms]
    })


@report_bp.route("/api/classes", methods=["GET"])
@admin_or_staff_required
def get_classes():
    """Get all classes for the school"""
    classes = ClassRoom.query.filter_by(
        is_active=True
    ).order_by(ClassRoom.class_room_name).all()

    return jsonify({
        "success": True,
        "classes": [{
            "class_room_id": cls.class_room_id,
            "class_name": cls.class_room_name,
            "class_level": cls.level if hasattr(cls, 'level') else None
        } for cls in classes]
    })


@report_bp.route("/api/students", methods=["GET"])
@admin_or_staff_required
def get_students():
    """Get students for a class"""
    class_id = request.args.get("class_id")

    if not class_id:
        return jsonify({"success": False, "error": "class_id required"}), 400

    from models.student import Student

    students = User.query.filter_by(
        class_room_id=class_id,
        role="student",
        is_active=True
    ).order_by(User.first_name, User.last_name).all()

    student_data = []
    for user in students:
        student = Student.query.filter_by(user_id=user.id).first()
        student_data.append({
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "profile_picture": user.image,  # Fixed: use 'image' field
            "admission_number": student.admission_number if student else None
        })

    return jsonify({
        "success": True,
        "students": student_data
    })


@report_bp.route("/generate")
@admin_or_staff_required
def generate_report_page():
    """Report generation page"""
    user = User.query.get(session["user_id"])
    return render_template("admin/generate_report.html", user=user, current_user=user)


@report_bp.route("/api/preview", methods=["POST"])
@admin_or_staff_required
def preview_report():
    """Preview report for a student"""
    try:
        data = request.get_json()
        student_id = data.get("student_id")
        term_id = data.get("term_id")
        class_room_id = data.get("class_room_id")
        config_id = data.get("config_id")

        # Debug logging
        # print(f"[DEBUG] Preview request - config_id: {config_id}, type: {type(config_id)}")
        if config_id:
            config = ReportConfig.query.get(config_id)
            # # print(f"[DEBUG] Config found: {config is not None}")
            # if config:
            #     # print(f"[DEBUG] Config term_id: {config.term_id}, requested term_id: {term_id}")
            #     # print(f"[DEBUG] Config class_room_id: {config.class_room_id}, requested class_room_id: {class_room_id}")
            #     # print(f"[DEBUG] Config active_assessments: {config.get_active_assessments()}")
            #     # print(f"[DEBUG] Config display_settings: {config.get_display_settings()}")

        if not all([student_id, term_id, class_room_id]):
            return jsonify({
                "success": False,
                "error": "Missing required parameters"
            }), 400

        report_data = ReportGenerator.get_student_scores(
            student_id, term_id, class_room_id, config_id
        )

        if not report_data:
            return jsonify({
                "success": False,
                "error": "Could not generate report data"
            }), 404

        return jsonify({
            "success": True,
            "report": report_data
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@report_bp.route("/api/class-preview", methods=["POST"])
@admin_or_staff_required
def preview_class_reports():
    """Preview reports for all students in a class"""
    try:
        data = request.get_json()
        class_room_id = data.get("class_room_id")
        term_id = data.get("term_id")
        config_id = data.get("config_id")

        if not all([class_room_id, term_id]):
            return jsonify({
                "success": False,
                "error": "Missing required parameters"
            }), 400

        reports = ReportGenerator.get_class_report_data(
            class_room_id, term_id, config_id
        )

        return jsonify({
            "success": True,
            "reports": reports
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@report_bp.route("/preview/<student_id>")
@login_required
def preview_student_report(student_id):
    """Preview page for a single student report"""
    user = User.query.get(session["user_id"])

    # Check permissions
    if user.role == "student" and user.id != student_id:
        return "Unauthorized", 403

    return render_template("reports/improved_preview.html", user=user, current_user=user, student_id=student_id)


@report_bp.route("/improved-preview/<student_id>")
@login_required
def improved_preview_student_report(student_id):
    """Improved preview page for a single student report"""
    user = User.query.get(session["user_id"])

    # Check permissions
    if user.role == "student" and user.id != student_id:
        return "Unauthorized", 403

    return render_template("reports/improved_preview.html", user=user, current_user=user, student_id=student_id)


@report_bp.route("/api/student-report/<student_id>")
@login_required
def get_student_report(student_id):
    """API endpoint to get student report data"""
    try:
        # Get query parameters
        term_id = request.args.get('term_id')
        class_room_id = request.args.get('class_room_id')
        config_id = request.args.get('config_id')
        
        # Handle empty string config_id as None
        if config_id == "":
            config_id = None

        # Debug logging
        # print(f"DEBUG: API received - student_id: {student_id}, term_id: {term_id}, class_room_id: {class_room_id}, config_id: {config_id}")
        
        # Validate required parameters
        if not all([student_id, term_id, class_room_id]):
            return jsonify({
                "success": False,
                "message": "Missing required parameters: student_id, term_id, and class_room_id are required"
            }), 400

        # Check permissions
        user = User.query.get(session["user_id"])
        if user.role == "student" and user.id != student_id:
            return jsonify({
                "success": False,
                "message": "Unauthorized access to student report"
            }), 403

        # Get report data
        report_data = ReportGenerator.get_student_scores(
            student_id, term_id, class_room_id, config_id
        )

        if not report_data:
            return jsonify({
                "success": False,
                "message": "Could not generate report data"
            }), 404

        return jsonify({
            "success": True,
            "report": report_data
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": f"Error generating report: {str(e)}"
        }), 500

@report_bp.route("/api/download-pdf", methods=["POST"])
@admin_or_staff_required
def download_single_pdf():
    """Download a single student report as PDF"""
    try:
        # print("DEBUG: Starting download_single_pdf")
        data = request.get_json()
        student_id = data.get("student_id")
        term_id = data.get("term_id")
        class_room_id = data.get("class_room_id")
        config_id = data.get("config_id")
        
        # print(f"DEBUG: Received data - student_id: {student_id}, term_id: {term_id}, class_room_id: {class_room_id}, config_id: {config_id}")

        if not all([student_id, term_id, class_room_id]):
            # print("DEBUG: Missing required parameters")
            return jsonify({
                "success": False,
                "error": "Missing required parameters"
            }), 400

        # Create filename
        # Get student name and term name for filename (simplified approach)
        from models.user import User
        from models.school_term import SchoolTerm
        student = User.query.get(student_id)
        term = SchoolTerm.query.get(term_id)
        student_name = f"{student.first_name}_{student.last_name}".replace(' ', '_') if student else 'Unknown'
        term_name = term.term_name.replace(' ', '_') if term else 'Unknown'
        filename = f"Report_{student_name}_{term_name}.pdf"
        # print(f"DEBUG: Generated filename: {filename}")

        # Get report data with performance optimization
        # print("DEBUG: Calling ReportGenerator.get_student_scores")
        report_data = ReportGenerator.get_student_scores(
            student_id, term_id, class_room_id, config_id
        )
        # print(f"DEBUG: Received data from client: {data}")
        if not report_data:
            # print("DEBUG: Could not generate report data")
            return jsonify({
                "success": False,
                "error": "Could not generate report data"
            }), 404

        if WEASYPRINT_AVAILABLE:
            # print(f"Generating report using WeasyPrint for {report_data['student']['name']}...")
            # Generate HTML with caching to avoid recomputation
            import time
            start_time = time.time()
            # print(f"Generating report for {report_data['student']['name']}...")
            
            html_content = ReportGenerator.generate_report_html(report_data)
            html_time = time.time() - start_time
            # print(f"  HTML generated in {html_time:.2f}s")
            
            # Clear image cache periodically to prevent memory buildup
            if hasattr(ReportGenerator, '_image_cache') and len(ReportGenerator._image_cache) > 100:
                ReportGenerator._image_cache.clear()
                
            # Clear HTML cache periodically to prevent memory buildup
            if hasattr(ReportGenerator, '_html_cache') and len(ReportGenerator._html_cache) > 50:
                ReportGenerator._html_cache.clear()

            # Convert to PDF with optimized settings
            pdf_start = time.time()
            # Use optimized WeasyPrint settings for faster rendering
            from weasyprint import HTML, CSS
            # Add timeout to prevent infinite waits (cross-platform approach)
            import threading
            import queue
            
            def generate_pdf(q, html_string):
                try:
                    import time
                    pdf_start_time = time.time()
                    # print(f"  Starting WeasyPrint PDF generation...")
                    pdf_bytes = HTML(string=html_string).write_pdf(
                        optimize_size=('fonts', 'images'),  # Compress fonts & images
                        presentational_hints=True,  # Use CSS efficiently
                        uncompressed_pdf=False,  # Compress PDF output
                        # Disable JavaScript for faster rendering (not needed for static reports)
                        javascript=False,
                        # Reduce DPI for faster rendering
                        resolution=60,  # Even lower DPI for faster rendering
                        # Disable embedded fonts for faster processing
                        embed_fonts=False,
                        # Disable smart anchors for faster processing
                        smart_quotes=False,
                        # Disable attachments for faster processing
                        attachments=False,
                        # Disable PDF/UA for faster processing
                        pdfua=False,
                        # Disable tagged PDF for faster processing
                        tagged=False,
                        # Disable PDF forms for faster processing
                        forms=False,
                        # Disable PDF outlines for faster processing
                        outline=False
                    )
                    pdf_end_time = time.time()
                    # print(f"  WeasyPrint PDF generation completed in {pdf_end_time - pdf_start_time:.2f}s")
                    q.put(('success', pdf_bytes))
                except Exception as e:
                    q.put(('error', e))
            
            # Create a queue and thread for PDF generation
            q = queue.Queue()
            t = threading.Thread(target=generate_pdf, args=(q, html_content))
            t.daemon = True
            t.start()
            
            try:
                # Wait for the result with a timeout of 45 seconds (increased for complex PDFs)
                result_type, pdf_bytes_or_error = q.get(timeout=45)
                if result_type == 'error':
                    raise pdf_bytes_or_error
                pdf_bytes = pdf_bytes_or_error
            except queue.Empty:
                # print("ERROR: PDF generation timed out after 45 seconds")
                return jsonify({
                    "success": False,
                    "error": "PDF generation timed out. Please try again."
                }), 500
            pdf_time = time.time() - pdf_start
            total_time = time.time() - start_time
            # print(f"  PDF generated in {pdf_time:.2f}s")
            # print(f"  Total time: {total_time:.2f}s")
            
            # Log performance metrics for monitoring
            if pdf_time > 10:  # If PDF generation takes more than 10 seconds, log details
                # print(f"  WARNING: Slow PDF generation detected for {report_data['student']['name']}")
                # print(f"    HTML size: {len(html_content)} characters")
                # Count images in HTML
                import re
                img_count = len(re.findall(r'<img[^>]+>', html_content))
                # print(f"    Images embedded: {img_count}")

            return send_file(
                io.BytesIO(pdf_bytes),
                mimetype='application/pdf',
                as_attachment=True,
                download_name=filename
            )
        elif XHTML2PDF_AVAILABLE:
            # Use simplified HTML for xhtml2pdf with performance optimizations
            html_content = ReportGenerator.generate_simple_report_html(
                report_data)

            # Convert to PDF using xhtml2pdf with optimized settings
            pdf_buffer = io.BytesIO()
            # Optimize xhtml2pdf generation
            from xhtml2pdf import pisa
            # Add timeout to prevent infinite waits (cross-platform approach)
            import threading
            import queue
            
            def generate_pdf(q, html_string, buffer):
                try:
                    pisa_status = pisa.CreatePDF(
                        html_string, 
                        dest=buffer,
                        show_error_as_pdf=True  # Show errors in PDF for debugging
                    )
                    q.put(('success', pisa_status))
                except Exception as e:
                    q.put(('error', e))
            
            # Create a queue and thread for PDF generation
            q = queue.Queue()
            t = threading.Thread(target=generate_pdf, args=(q, html_content, pdf_buffer))
            t.daemon = True
            t.start()
            
            try:
                # Wait for the result with a timeout of 30 seconds
                result_type, pisa_status_or_error = q.get(timeout=30)
                if result_type == 'error':
                    raise pisa_status_or_error
                pisa_status = pisa_status_or_error
            except queue.Empty:
                # print("ERROR: PDF generation timed out after 30 seconds")
                return jsonify({
                    "success": False,
                    "error": "PDF generation timed out. Please try again."
                }), 500

            if pisa_status.err:
                return jsonify({"success": False, "error": "PDF generation failed"}), 500

            pdf_buffer.seek(0)
            return send_file(
                pdf_buffer,
                mimetype='application/pdf',
                as_attachment=True,
                download_name=filename
            )
        else:
            return jsonify({
                "success": False,
                "error": "PDF generation not available. Install WeasyPrint or xhtml2pdf."
            }), 500

    except Exception as e:
        # print(f"Error generating PDF: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@report_bp.route("/api/download-class-pdf", methods=["POST"])
@admin_or_staff_required
def download_class_pdf():
    """Download all student reports for a class as a single PDF with performance optimizations"""
    try:
        data = request.get_json()
        class_room_id = data.get("class_room_id")
        term_id = data.get("term_id")
        config_id = data.get("config_id")

        if not all([class_room_id, term_id]):
            return jsonify({
                "success": False,
                "error": "Missing required parameters"
            }), 400

        # Batch process reports with optimizations
        if WEASYPRINT_AVAILABLE:
            # For WeasyPrint, generate all HTML first, then combine for better performance
            import time
            start_time = time.time()
            
            # Get all reports for the class with batch optimization
            reports = ReportGenerator.get_class_report_data(
                class_room_id, term_id, config_id
            )

            if not reports:
                return jsonify({
                    "success": False,
                    "error": "No reports found for this class"
                }), 404

            # Create filename
            class_room = ClassRoom.query.get(class_room_id)
            term = SchoolTerm.query.get(term_id)
            class_name = class_room.class_room_name.replace(
                ' ', '_') if class_room else 'Class'
            term_name = term.term_name.replace(' ', '_') if term else 'Term'
            filename = f"Reports_{class_name}_{term_name}.pdf"

            # Generate all HTML content first (batch processing)
            html_parts = []
            for i, report_data in enumerate(reports):
                student_name = report_data['student']['name']
                html_content = ReportGenerator.generate_report_html(report_data)
                html_parts.append(html_content)
                
                # Clear image cache periodically during bulk operations
                if hasattr(ReportGenerator, '_image_cache') and len(ReportGenerator._image_cache) > 100:
                    ReportGenerator._image_cache.clear()
                                
                # Clear HTML cache periodically during bulk operations
                if hasattr(ReportGenerator, '_html_cache') and len(ReportGenerator._html_cache) > 50:
                    ReportGenerator._html_cache.clear()

            # print(f"All HTML generated in {time.time() - start_time:.2f}s")

            # Combine with page breaks for single PDF generation
            combined_html = '<div style="page-break-after: always;"></div>'.join(html_parts)

            # Convert to PDF with optimized settings
            pdf_start = time.time()
            from weasyprint import HTML
            # Add timeout to prevent infinite waits (cross-platform approach)
            import threading
            import queue
            
            def generate_pdf(q, html_string):
                try:
                    pdf_bytes = HTML(string=html_string).write_pdf(
                        optimize_size=('fonts', 'images'),  # Compress fonts & images
                        presentational_hints=True,  # Use CSS efficiently
                        uncompressed_pdf=False,  # Compress PDF output
                        # Disable JavaScript for faster rendering (not needed for static reports)
                        javascript=False,
                        # Reduce DPI for faster rendering
                        resolution=60,  # Even lower DPI for faster rendering
                        # Disable embedded fonts for faster processing
                        embed_fonts=False,
                        # Disable smart anchors for faster processing
                        smart_quotes=False,
                        # Disable attachments for faster processing
                        attachments=False,
                        # Disable PDF/UA for faster processing
                        pdfua=False,
                        # Disable tagged PDF for faster processing
                        tagged=False,
                        # Disable PDF forms for faster processing
                        forms=False,
                        # Disable PDF outlines for faster processing
                        outline=False
                    )
                    q.put(('success', pdf_bytes))
                except Exception as e:
                    q.put(('error', e))
            
            # Create a queue and thread for PDF generation
            q = queue.Queue()
            t = threading.Thread(target=generate_pdf, args=(q, combined_html))
            t.daemon = True
            t.start()
            
            try:
                # Wait for the result with a timeout of 90 seconds (increased for bulk PDFs)
                result_type, pdf_bytes_or_error = q.get(timeout=90)
                if result_type == 'error':
                    raise pdf_bytes_or_error
                pdf_bytes = pdf_bytes_or_error
            except queue.Empty:
                # print("ERROR: Bulk PDF generation timed out after 90 seconds")
                return jsonify({
                    "success": False,
                    "error": "Bulk PDF generation timed out. Please try generating fewer reports at once."
                }), 500
            pdf_time = time.time() - pdf_start
            total_time = time.time() - start_time
            # print(f"PDF conversion took {pdf_time:.2f}s")
            # print(f"Total processing time: {total_time:.2f}s")
            
            # Log performance metrics for monitoring
            if pdf_time > 30:  # If PDF generation takes more than 30 seconds, log details
                # print(f"  WARNING: Slow PDF generation detected for class report")
                # print(f"    HTML size: {len(combined_html)} characters")
                # Count images in HTML
                import re
                img_count = len(re.findall(r'<img[^>]+>', combined_html))
                # print(f"    Images embedded: {img_count}")
                # print(f"    Number of students: {len(reports)}")

            return send_file(
                io.BytesIO(pdf_bytes),
                mimetype='application/pdf',
                as_attachment=True,
                download_name=filename
            )
        elif XHTML2PDF_AVAILABLE:
            # Get all reports for the class
            reports = ReportGenerator.get_class_report_data(
                class_room_id, term_id, config_id
            )

            if not reports:
                return jsonify({
                    "success": False,
                    "error": "No reports found for this class"
                }), 404

            # Create filename
            class_room = ClassRoom.query.get(class_room_id)
            term = SchoolTerm.query.get(term_id)
            class_name = class_room.class_room_name.replace(
                ' ', '_') if class_room else 'Class'
            term_name = term.term_name.replace(' ', '_') if term else 'Term'
            filename = f"Reports_{class_name}_{term_name}.pdf"

            # Generate combined HTML using simplified template with optimizations
            html_parts = []
            for i, report_data in enumerate(reports):
                student_name = report_data['student']['name']
                # print(f"DEBUG: Generating simple HTML for student {i+1}/{len(reports)}: {student_name}")
                html_content = ReportGenerator.generate_simple_report_html(report_data)
                html_parts.append(html_content)
                
            # Combine with page breaks (xhtml2pdf uses <pdf:nextpage /> or CSS page-break)
            # xhtml2pdf supports standard CSS page-break-after: always
            combined_html = '<div style="page-break-after: always;"></div>'.join(html_parts)

            # Convert to PDF using xhtml2pdf with optimized settings
            pdf_buffer = io.BytesIO()
            from xhtml2pdf import pisa
            # Add timeout to prevent infinite waits (cross-platform approach)
            import threading
            import queue
            
            def generate_pdf(q, html_string, buffer):
                try:
                    pisa_status = pisa.CreatePDF(
                        html_string, 
                        dest=buffer,
                        show_error_as_pdf=True
                    )
                    q.put(('success', pisa_status))
                except Exception as e:
                    q.put(('error', e))
            
            # Create a queue and thread for PDF generation
            q = queue.Queue()
            t = threading.Thread(target=generate_pdf, args=(q, combined_html, pdf_buffer))
            t.daemon = True
            t.start()
            
            try:
                # Wait for the result with a timeout of 60 seconds
                result_type, pisa_status_or_error = q.get(timeout=60)
                if result_type == 'error':
                    raise pisa_status_or_error
                pisa_status = pisa_status_or_error
            except queue.Empty:
                # print("ERROR: Bulk PDF generation timed out after 60 seconds")
                return jsonify({
                    "success": False,
                    "error": "Bulk PDF generation timed out. Please try generating fewer reports at once."
                }), 500

            if pisa_status.err:
                return jsonify({"success": False, "error": "PDF generation failed"}), 500

            pdf_buffer.seek(0)
            return send_file(
                pdf_buffer,
                mimetype='application/pdf',
                as_attachment=True,
                download_name=filename
            )
        else:
            return jsonify({
                "success": False,
                "error": "PDF generation not available. Install WeasyPrint or xhtml2pdf."
            }), 500

    except Exception as e:
        # Log the full error for debugging
        import traceback
        error_msg = f"Error in download_class_pdf: {str(e)}"
        # print(error_msg)
        traceback.print_exc()
        return jsonify({"success": False, "error": error_msg}), 500


@report_bp.route("/api/grade-scales", methods=["GET"])
@admin_or_staff_required
def get_grade_scales():
    """Get all grade scales for the school"""
    from models.school import School
    from models.grade_scale import GradeScale

    school = School.query.first()
    if not school:
        return jsonify({"success": False, "error": "School not found"}), 404

    scales = GradeScale.query.filter_by(
        school_id=school.school_id
    ).order_by(GradeScale.name).all()

    return jsonify({
        "success": True,
        "scales": [scale.to_dict() for scale in scales]
    })


@report_bp.route("/api/grade-scales/default", methods=["GET"])
@admin_or_staff_required
def get_default_grade_scale():
    """Get the default grade scale for the school"""
    from models.school import School
    from models.grade_scale import GradeScale

    school = School.query.first()
    if not school:
        return jsonify({"success": False, "error": "School not found"}), 404

    # Get the default grade scale
    default_scale = GradeScale.query.filter_by(
        school_id=school.school_id,
        is_default=True
    ).first()

    if not default_scale:
        return jsonify({"success": False, "error": "Default grade scale not found"}), 404

    return jsonify({
        "success": True,
        "scale": default_scale.to_dict()
    })


@report_bp.route("/api/grade-scales", methods=["POST"])
@admin_or_staff_required
def create_grade_scale():
    """Create a new grade scale"""
    try:
        from models.school import School
        from models.grade_scale import GradeScale

        data = request.get_json()
        school = School.query.first()

        if not school:
            return jsonify({"success": False, "error": "School not found"}), 404

        scale = GradeScale(
            school_id=school.school_id,
            name=data.get("name"),
            description=data.get("description"),
            is_active=data.get("is_active", True),
            is_default=data.get("is_default", False)
        )

        # Set grade ranges
        if "grade_ranges" in data:
            scale.set_grade_ranges(data["grade_ranges"])

        # If this is set as default, unset other defaults
        if scale.is_default:
            GradeScale.query.filter_by(
                school_id=school.school_id,
                is_default=True
            ).update({"is_default": False})

        db.session.add(scale)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Grade scale created successfully",
            "scale": scale.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@report_bp.route("/api/grade-scales/<scale_id>", methods=["PUT"])
@admin_or_staff_required
def update_grade_scale(scale_id):
    """Update a grade scale"""
    try:
        from models.grade_scale import GradeScale

        data = request.get_json()
        scale = GradeScale.query.get(scale_id)

        if not scale:
            return jsonify({"success": False, "error": "Grade scale not found"}), 404

        # Update fields
        if "name" in data:
            scale.name = data["name"]
        if "description" in data:
            scale.description = data["description"]
        if "is_active" in data:
            scale.is_active = data["is_active"]
        if "is_default" in data:
            scale.is_default = data["is_default"]

        # Update grade ranges
        if "grade_ranges" in data:
            scale.set_grade_ranges(data["grade_ranges"])

        # If this is set as default, unset other defaults
        if scale.is_default:
            from models.school import School
            school = School.query.first()
            if school:
                GradeScale.query.filter(
                    GradeScale.school_id == school.school_id,
                    GradeScale.scale_id != scale_id,
                    GradeScale.is_default == True
                ).update({"is_default": False})

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Grade scale updated successfully",
            "scale": scale.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@report_bp.route("/api/grade-scales/<scale_id>", methods=["DELETE"])
@admin_or_staff_required
def delete_grade_scale(scale_id):
    """Delete a grade scale"""
    try:
        from models.grade_scale import GradeScale

        scale = GradeScale.query.get(scale_id)

        if not scale:
            return jsonify({"success": False, "error": "Grade scale not found"}), 404

        # Prevent deletion of the default scale
        if scale.is_default:
            return jsonify({"success": False, "error": "Cannot delete the default grade scale"}), 400

        db.session.delete(scale)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Grade scale deleted successfully"
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@report_bp.route("/grade-scales")
@admin_or_staff_required
def grade_scales_page():
    """Grade scales management page"""
    user = User.query.get(session["user_id"])
    return render_template("admin/grade_scales.html", user=user, current_user=user)


@report_bp.route("/api/broad-sheet", methods=["POST"])
@admin_or_staff_required
def get_broad_sheet_data():
    """Get broad sheet data for a class"""
    try:
        data = request.get_json()
        class_room_id = data.get("class_room_id")
        term_id = data.get("term_id")
        exam_type = data.get("exam_type", "all")  # all, ca, exam, or specific assessment type
        if not all([class_room_id, term_id]):
            return jsonify({
                "success": False,
                "error": "Missing required parameters"
            }), 400
        
        # Use the helper function to get the data
        broad_sheet_data, metadata = get_broad_sheet_data_logic(class_room_id, term_id, exam_type)
        # print("Broad Sheet Data:", broad_sheet_data)
        return jsonify({
            "success": True,
            "data": broad_sheet_data,
            "metadata": metadata
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


def get_grade_from_score(score, term_id):
    """Get grade from score using the appropriate grade scale"""
    try:
        from models.grade_scale import GradeScale
        from models.school import School
        
        # Get the school's default grade scale
        school = School.query.first()
        if not school:
            return "N/A"
        
        grade_scale = GradeScale.query.filter_by(
            school_id=school.school_id,
            is_default=True
        ).first()
        
        if not grade_scale:
            # If no default grade scale, use a basic scale
            if score >= 70:
                return "A"
            elif score >= 60:
                return "B"
            elif score >= 50:
                return "C"
            elif score >= 40:
                return "D"
            else:
                return "F"
        
        # Get grade based on the scale's ranges
        grade_ranges = grade_scale.get_grade_ranges()
        for grade_range in grade_ranges:
            if grade_range['min_score'] <= score <= grade_range['max_score']:
                return grade_range['grade']
        
        return "N/A"
    
    except Exception as e:
        # print(f"Error getting grade from score: {str(e)}")
        return "N/A"

def get_grade(percentage):
    if percentage >= 70: return 'A'
    if percentage >= 60: return 'B'
    if percentage >= 50: return 'C'
    if percentage >= 45: return 'D'
    if percentage >= 40: return 'E'
    return 'F'
def get_broad_sheet_data_logic(class_room_id, term_id, exam_type="all", config_id=None):
    """Core logic for getting broad sheet data, extracted for reuse"""
    from models.subject import Subject
    from models.assessment_type import AssessmentType
    from models.class_room import ClassRoom
    from models.school_term import SchoolTerm
    from models.user import User
    from models.grade import Grade  # Import Grade model
    from models.school import School  # Import School model
    
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
            'project': 'Project',
            'first_ca': 'First CA',
            'second_ca': 'Second CA',
            'third_ca': 'Third CA',
            'fourth_ca': 'Fourth CA',
        }
    
        if code.lower() in special_cases:
            return special_cases[code.lower()]
    
        return ' '.join(word.capitalize() for word in code.split('_'))
    
    # Get all students in the class
    students = User.query.filter_by(
        class_room_id=class_room_id,
        role="student",
        is_active=True
    ).order_by(User.first_name, User.last_name).all()
    
    # Get all subjects offered by the class
    subjects = db.session.query(Subject).join(
        Subject.classes
    ).filter(
        ClassRoom.class_room_id == class_room_id
    ).order_by(Subject.subject_name).all()
    
    # Get the school to filter assessment types
    school = School.query.first()
    
    # Get all assessment types for this school (these are the possible assessment types)
    all_assessment_types = AssessmentType.query.filter_by(
        school_id=school.school_id if school else None,
        is_active=True
    ).order_by(AssessmentType.order).all()
    # # print("ALL ASSESMENTS: ", all_assessment_types)
    # Auto-sync CBT exam records to grades before retrieving
    from utils.grade_sync import sync_all_exam_records
    sync_all_exam_records(None, class_room_id, term_id)  # Sync all subjects for this class/term
    
    # Get all grades for the class and term (instead of exams)
    grades_query = Grade.query.filter_by(
        class_room_id=class_room_id,
        term_id=term_id
    )

    # Filter by assessment type if specified and not "all"
    if exam_type != "all":
        # Handle comma-separated assessment types
        assessment_types = exam_type.split(',') if ',' in exam_type else [exam_type]
        
        # Build filter conditions for multiple assessment types
        from sqlalchemy import or_
        conditions = []
        
        for single_type in assessment_types:
            single_type = single_type.strip().lower()
            if single_type == "ca":
                conditions.append(Grade.assessment_type.ilike("%ca%"))
            elif single_type == "exam":
                # Match 'exam', 'terminal examination', 'terminal', 'examination', etc.
                conditions.append(db.or_(
                    Grade.assessment_type.ilike("%exam%"),
                    Grade.assessment_type.ilike("%examination%"),
                    Grade.assessment_type.ilike("%terminal%")
                ))
            else:
                conditions.append(Grade.assessment_type.ilike(f"%{single_type}%"))
        
        if conditions:
            grades_query = grades_query.filter(or_(*conditions))
        else:
            # If no conditions, return empty result or all results based on requirements
            pass
        
    all_grades = grades_query.all()
    # print("DEBUG GRADES: ", all_grades)
    for grade in all_grades:
        # print(grade.to_dict())
        continue
    
    # Debug: Print all unique assessment types found
    unique_assessment_types = set(grade.assessment_type for grade in all_grades)
    # # print("DEBUG UNIQUE ASSESSMENT TYPES: ", unique_assessment_types)
    # Get all subjects for this class
    from models.associations import class_subject
    class_subjects = db.session.query(Subject).join(
        class_subject, class_subject.c.subject_id == Subject.subject_id
    ).filter(
        class_subject.c.class_room_id == class_room_id
    ).all()
    
    # Get active assessment types
    all_assessment_types = AssessmentType.query.filter_by(
        school_id=school.school_id,
        is_active=True
    ).order_by(AssessmentType.order).all()
    
    # Process Config for Merging
    merge_config = None
    active_assessments = []
    
    from models.report_config import ReportConfig
    if config_id:
        config = ReportConfig.query.get(config_id)
        if config:
            merge_config = config.get_merge_config()
            active_assessments = config.get_active_assessments()

    subjects = [s.subject_name for s in class_subjects]
    
    broad_sheet_data = []

    for student in students:
        student_data = {
            "student_id": student.id,
            "student_name": f"{student.first_name} {student.last_name}",
            "admission_number": student.student.admission_number if student.student else "N/A",
            "subjects": {}
        }
        
        # Get all grades for this student
        student_grades = Grade.query.filter_by(
            student_id=student.id,
            term_id=term_id,
            class_room_id=class_room_id
        ).all()
        
        # Organize grades by subject
        subject_grade_map = {}
        for grade in student_grades:
            if grade.subject_id not in subject_grade_map:
                subject_grade_map[grade.subject_id] = []
            subject_grade_map[grade.subject_id].append(grade)
            
        for subject in class_subjects:
            subject_grades = subject_grade_map.get(subject.subject_id, [])
            
            # Initialize subject scores structure for merging logic
            subject_assessments = {}
            for grade in subject_grades:
                assess_type = 'cbt' if grade.is_from_cbt else grade.assessment_type
                subject_assessments[assess_type] = {
                    "score": grade.score,
                    "max_score": grade.max_score,
                    "assessment_type": assess_type,
                    "is_cbt": grade.is_from_cbt,
                    "formatted_type": format_assessment_name(assess_type),
                    "grade_id": grade.grade_id,
                    "assessment_name": grade.assessment_name
                }
                
            # Apply Merging Logic if Configured
            if merge_config:
                merged_assessments_data = {}
                
                # Process merged exams
                for merge_rule in merge_config.get('merged_exams', []):
                    merge_name = merge_rule['name']
                    components = merge_rule['components']
                    display_as = merge_rule.get('display_as', merge_name)
                    
                    total_score = 0
                    total_max = 0
                    
                    for component in components:
                        if component in subject_assessments:
                            total_score += subject_assessments[component]['score']
                            total_max += subject_assessments[component]['max_score']
                            
                    if total_max > 0:
                        merged_assessments_data[display_as] = {
                            "score": total_score,
                            "max_score": total_max,
                            "assessment_type": display_as,
                            "is_cbt": False, # Merged scores aren't purely CBT
                            "formatted_type": format_assessment_name(display_as),
                            "is_merged": True
                        }
                        
                        # Remove components
                        for component in components:
                            subject_assessments.pop(component, None)
                            
                # Add merged assessments back
                subject_assessments.update(merged_assessments_data)
                
                # Filter by active assessments if configured
                # Identify display names that should be forced active (merged ones)
                merged_display_names = [rule.get('display_as', rule['name']) for rule in merge_config.get('merged_exams', [])]
                effective_active = set(active_assessments) | set(merged_display_names)
                
                if active_assessments:
                     subject_assessments = {
                        k: v for k, v in subject_assessments.items()
                        if k in effective_active
                    }

            # Convert back to list for broadsheet structure
            subject_scores = []
            for assess_type, data in subject_assessments.items():
                subject_scores.append({
                    "exam_id": data.get("grade_id"),
                    "exam_name": data.get("assessment_name") or data.get("formatted_type", assess_type),
                    "assessment_type": assess_type,
                    "formatted_type": data.get("formatted_type", format_assessment_name(assess_type)),
                    "score": data["score"],
                    "max_score": data["max_score"],
                    "percentage": round((data["score"] / data["max_score"]) * 100, 1) if data["max_score"] and data["max_score"] > 0 else 0,
                    "is_cbt": data.get("is_cbt", False)
                })

            
            # Calculate total and average for the subject
            total_score = sum(item["score"] for item in subject_scores)
            max_possible = sum(item["max_score"] for item in subject_scores)
            subject_total = {
                "total_score": total_score,
                "max_possible": max_possible,
                "percentage": round((total_score / max_possible) * 100, 1) if max_possible and max_possible > 0 else 0,
                "grade": get_grade((total_score / max_possible) * 100) if max_possible and max_possible > 0 else "N/A",
                "scores": subject_scores
            }
            
            student_data["subjects"][subject.subject_name] = subject_total
        
        broad_sheet_data.append(student_data)
    print(broad_sheet_data)
    # Get class room object to access form teacher
    class_room = ClassRoom.query.get(class_room_id)
    
    # Get school information
    from models.school import School
    school = School.query.first()
    
    # Get assessment types that exist in the grades for this class/term based on the filter (for metadata)
    # Use the already filtered all_grades from the main logic above
    unique_assessment_types = set()
    for grade in all_grades:
        if grade.is_from_cbt:
            unique_assessment_types.add('cbt')
        else:
            unique_assessment_types.add(grade.assessment_type)
    
    assessment_types_list = list(unique_assessment_types) if unique_assessment_types else []
    
    # Get assessment type orders from the AssessmentType model
    from models.assessment_type import AssessmentType
    # Get school_id through the section relationship
    school_id = class_room.section.school_id if class_room.section else None
    school_assessment_types = AssessmentType.query.filter_by(school_id=school_id).all()
    assessment_type_orders = {at.code: at.order for at in school_assessment_types}
    
    # Get sections for this school
    from models.section import Section
    all_sections = Section.query.filter_by(
        school_id=school.school_id if school else None,
        is_active=True
    ).order_by(Section.level).all()
    
    # Group similar sections (matching ReportGenerator)
    grouped_sections = []
    secondary_added = False
    for section in all_sections:
        if section.level in [3, 4]:
            if not secondary_added:
                # Create a simple object with a name attribute for the formatter
                class SimpleSection:
                    def __init__(self, name):
                        self.name = name
                grouped_sections.append(SimpleSection("Secondary"))
                secondary_added = True
            continue
        grouped_sections.append(section)
    
    # Format sections with commas and 'and' for display (matching ReportGenerator)
    def format_sections_for_display(sections_list):
        if not sections_list:
            return ''
        if len(sections_list) == 1:
            return sections_list[0].name
        elif len(sections_list) == 2:
            return f"{sections_list[0].name} and {sections_list[1].name}"
        else:
            names = [s.name for s in sections_list]
            last = names.pop()
            # Use Oxford comma: include a comma before the 'and' for clarity
            return f"{', '.join(names)}, and {last}"
    
    # Clean school logo path (handle Windows slashes and strip static/)
    logo_path = school.logo if school and school.logo else None
    if logo_path:
        logo_path = logo_path.replace("\\", "/").replace("static/", "", 1).lstrip("/")

    # Prepare metadata
    metadata = {
        "class_name": class_room.class_room_name,
        "term_name": SchoolTerm.query.get(term_id).term_name,
        "exam_type": exam_type,
        "total_students": len(students),
        "total_subjects": len(subjects),
        "assessment_types": assessment_types_list,
        "assessment_type_orders": assessment_type_orders,
        "school_name": school.school_name if school else "N/A",
        "school_address": school.address if school else "N/A",
        "school_logo": logo_path,
        "school_motto": school.motto if school else "N/A",
        "school_phone": school.phone if school else "N/A",
        "formatted_sections": format_sections_for_display(grouped_sections),
        "form_master": f"{class_room.form_teacher.first_name} {class_room.form_teacher.last_name}" if class_room.form_teacher else "N/A",
        "academic_session": SchoolTerm.query.get(term_id).academic_session if term_id else "N/A"
    }
    
    return broad_sheet_data, metadata


@report_bp.route("/api/broad-sheet/export/<format>", methods=["POST"])
@admin_or_staff_required
def export_broad_sheet(format):
    """Export broad sheet data in specified format"""
    try:
        if format.lower() not in ['pdf', 'excel']:
            return jsonify({"success": False, "error": "Invalid format. Use 'pdf' or 'excel'"}), 400
        
        from models.school import School
        school = School.query.first()
        
        data = request.json
        class_room_id = data.get('class_room_id')
        term_id = data.get('term_id')
        exam_type = data.get('exam_type', 'all')
        fmt = format.lower()
        config_id = data.get('config_id')
        subjects_per_page = data.get('subjects_per_page', 5)  # Default 5 subjects per page
        students_per_page = data.get('students_per_page', 25) # Default 25 students per page
        font_size = data.get('font_size', 9) # Default font size 9px
        
        if not class_room_id or not term_id:
            return jsonify({"success": False, "error": "Missing required fields"}), 400
            
        print(f"EXPORTING BROAD SHEET: class={class_room_id}, term={term_id}, type={exam_type}, format={fmt}")
        broad_sheet_data, metadata = get_broad_sheet_data_logic(class_room_id, term_id, exam_type, config_id)
        
        if format.lower() == 'pdf':
            return export_broad_sheet_pdf(broad_sheet_data, metadata, school, subjects_per_page, students_per_page, font_size)
        elif format.lower() == 'excel':
            return export_broad_sheet_excel(broad_sheet_data, metadata, school, subjects_per_page, students_per_page)
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


def export_broad_sheet_pdf(broad_sheet_data, metadata, school, subjects_per_page=5, students_per_page=25, font_size=9):
    """Export broad sheet as PDF"""
    try:
        from weasyprint import HTML
        import tempfile
        import os
        
        # Generate HTML for the broad sheet with pagination
        html_content = generate_broad_sheet_html(broad_sheet_data, metadata, school, subjects_per_page, students_per_page, font_size)
        
        # Convert to PDF
        pdf_bytes = HTML(string=html_content).write_pdf()
        
        # Create filename
        class_name = metadata["class_name"].replace(" ", "_")
        term_name = metadata["term_name"].replace(" ", "_")
        filename = f"Broad_Sheet_{class_name}_{term_name}.pdf"
        
        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


def export_broad_sheet_excel(broad_sheet_data, metadata, school, subjects_per_page=5, students_per_page=25):
    """Export broad sheet as Excel (Note: Excel export shows all subjects in one sheet)"""
    try:
        import xlsxwriter
        
        # Create in-memory workbook
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        worksheet = workbook.add_worksheet('Broad Sheet')
        
        # Define formats
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#D3D3D3',
            'border': 1,
            'align': 'center',
            'valign': 'vcenter'
        })
        
        cell_format = workbook.add_format({
            'border': 1,
            'align': 'center',
            'valign': 'vcenter'
        })
        
        # Write comprehensive header information
        worksheet.write('A1', 'BROAD SHEET', 
                       workbook.add_format({'bold': True, 'font_size': 16, 'align': 'center'}))
        worksheet.write('A2', f'School: {metadata.get("school_name", "N/A")}', 
                       workbook.add_format({'bold': True, 'align': 'center'}))
        worksheet.write('A3', f'Address: {metadata.get("school_address", "N/A")}', 
                       workbook.add_format({'bold': True, 'align': 'center'}))
        worksheet.write('A4', f'Class: {metadata["class_name"]}', 
                       workbook.add_format({'bold': True, 'align': 'center'}))
        worksheet.write('A5', f'Form Master: {metadata.get("form_master", "N/A")}', 
                       workbook.add_format({'bold': True, 'align': 'center'}))
        worksheet.write('A6', f'Term: {metadata["term_name"]}', 
                       workbook.add_format({'bold': True, 'align': 'center'}))
        worksheet.write('A7', f'Session: {metadata.get("academic_session", "N/A")}', 
                       workbook.add_format({'bold': True, 'align': 'center'}))
        
        # Add some spacing before the table
        row = 8
        
        # Write headers
        col = 0
        
        worksheet.write(row, col, 'S/N', header_format)
        worksheet.write(row, col + 1, 'Admission No.', header_format)
        worksheet.write(row, col + 2, 'Student Name', header_format)
        
        col_offset = 3
        
        # Get all unique subjects
        subjects = set()
        for student in broad_sheet_data:
            subjects.update(student["subjects"].keys())
        subjects = sorted(list(subjects))
        
        # Write subject headers
        current_col = col_offset
        subject_cols = {}
        for subject in subjects:
            subject_cols[subject] = current_col
            worksheet.write(row, current_col, subject, header_format)
            current_col += 1
        
        # Write student data
        row = 4
        for idx, student in enumerate(broad_sheet_data, 1):
            worksheet.write(row, 0, idx, cell_format)
            worksheet.write(row, 1, student["admission_number"], cell_format)
            worksheet.write(row, 2, student["student_name"], cell_format)
            
            # Write subject scores
            for subject, data in student["subjects"].items():
                if subject in subject_cols:
                    col_pos = subject_cols[subject]
                    # Show total score
                    score_text = f'{data["total_score"]}/{data["max_possible"]} ({data["percentage"]}%)'
                    worksheet.write(row, col_pos, score_text, cell_format)
            
            row += 1
        
        workbook.close()
        
        # Create filename
        class_name = metadata["class_name"].replace(" ", "_")
        term_name = metadata["term_name"].replace(" ", "_")
        filename = f"Broad_Sheet_{class_name}_{term_name}.xlsx"
        
        output.seek(0)
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


def generate_broad_sheet_html(broad_sheet_data, metadata, school, subjects_per_page=5, students_per_page=25, font_size=9):
    """Generate HTML for broad sheet with subject and student pagination and dynamic font size"""
    from datetime import datetime
    import math
    
    # ... (helper for assessment name formatting) ...
    def format_assess(code):
        if not code: return ""
        special_cases = {
            'cbt': 'CBT',
            'ca': 'CA',
            'exam': 'EXAM',
            'mid_term': 'MID-TERM',
            'final': 'FINAL',
            'quiz': 'QUIZ',
            'assignment': 'ASSIGNMENT',
            'project': 'PROJECT',
            'first_ca': '1ST CA',
            'second_ca': '2ND CA',
            'third_ca': '3RD CA',
            'fourth_ca': '4TH CA',
        }
        c = code.lower()
        if c in special_cases:
            return special_cases[c]
        if 'exam' in c: return 'EXAM'
        if 'ca' in c: return code.upper().replace('_', ' ')
        return ' '.join(word.capitalize() for word in code.split('_'))

    # ... (pagination logic) ...
    subjects_set = set()
    for student in broad_sheet_data:
        subjects_set.update(student["subjects"].keys())
    
    subjects = sorted(list(subjects_set))
    
    metadata_class_name = metadata['class_name']
    school_name = metadata.get('school_name', school.school_name if school else 'N/A')
    school_address = metadata.get('school_address', 'N/A')
    form_master = metadata.get('form_master', 'N/A')
    term_name = metadata['term_name']
    academic_session = metadata.get('academic_session', 'N/A')
    datetime_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # Resolve school logo path to a data URI or safe URL using ReportGenerator helpers
    try:
        from services.report_generator import ReportGenerator
        logo_src = ''
        if metadata.get('school_logo'):
            # Prefer embedding the image as data URI so PDF renderer always finds it
            logo_src = ReportGenerator._embed_image(metadata.get('school_logo'))
            # If embedding didn't produce a data URI, fall back to URL path
            if not logo_src.startswith('data:') and not logo_src.startswith('http'):
                logo_src = '/' + str(metadata.get('school_logo')).lstrip('/')
        else:
            logo_src = ''
    except Exception:
        # Best-effort fallback to previously used path
        logo_src = '/' + str(metadata.get('school_logo', '')).lstrip('/') if metadata.get('school_logo') else ''
    
    total_subjects = len(subjects)
    if subjects_per_page == 0 or subjects_per_page >= total_subjects:
        subject_chunks = [subjects]
    else:
        subject_chunks = [subjects[i:i + subjects_per_page] for i in range(0, total_subjects, subjects_per_page)]
        
    total_students = len(broad_sheet_data)
    if students_per_page == 0 or students_per_page >= total_students:
        student_chunks = [broad_sheet_data]
    else:
        student_chunks = [broad_sheet_data[i:i + students_per_page] for i in range(0, total_students, students_per_page)]
        
    total_pages = len(subject_chunks) * len(student_chunks)
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Broad Sheet - {metadata_class_name}</title>
        <style>
            @page {{
                size: A4 landscape;
                margin: 0.25in;
            }}
            body {{
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                background-color: white;
                font-size: {font_size}px;
                color: #1a1a1a;
            }}
            .header {{
                text-align: center;
                margin-bottom: 8px;
                width: 100%;
            }}
            .header-banner {{
                background: linear-gradient(135deg, #4338ca 0%, #312e81 100%);
                color: white;
                padding: 3mm 5mm;
                border-radius: 5px;
                display: flex;
                margin: 0 auto 3mm auto;
                width: 98%;
                max-width: 98%;
                align-items: center;
                justify-content: center;
                gap: 5mm;
                box-sizing: border-box;
            }}
            .logo-placeholder {{
                width: 18mm;
                height: 18mm;
                background: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }}
            .logo-img {{ width: 100%; height: 100%; object-fit: contain; }}
            .school-text {{
                text-align: center;
            }}
            .school-name {{
                font-size: {font_size + 12}px;
                font-weight: 800;
                text-transform: uppercase;
                margin: 0;
                line-height: 1.1;
                letter-spacing: 0.5px;
                color: white;
            }}
            .report-title {{
                font-size: {font_size + 6}px;
                font-weight: 700;
                margin-top: 2mm;
                text-transform: uppercase;
                letter-spacing: 4px;
                color: #374151;
            }}
            .school-motto {{ 
                font-size: {font_size}px; 
                margin: 1mm 0 0 0; 
                opacity: 0.95;
                font-style: italic; 
                color: white;
            }}
            .section-badge {{
                background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
                color: white;
                font-size: {font_size - 1}px;
                padding: 0.5mm 1.5mm;
                border-radius: 3px;
                display: inline-block;
                margin: 0 0.5mm;
                font-weight: 600;
            }}
            .meta-info {{
                display: flex;
                justify-content: space-between;
                margin-top: 5px;
                font-size: {font_size + 1}px;
                font-weight: 600;
                color: #374151;
                background: #f8fafc;
                padding: 2mm;
                border-radius: 4px;
                border: 1px solid #e2e8f0;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-top: 5px;
                table-layout: fixed;
            }}
            th, td {{
                border: 0.5px solid #d1d5db;
                padding: 4px 2px;
                text-align: center;
                vertical-align: middle;
                overflow: hidden;
            }}
            th {{
                background-color: #f8fafc;
                font-weight: 700;
                font-size: {font_size - 1}px;
                color: #334155;
            }}
            .subject-header {{
                background-color: #eff6ff;
                color: #1e40af;
                font-size: {font_size}px;
                border-bottom: 1.5px solid #2563eb;
            }}
            .assessment-header {{
                font-size: {font_size - 2}px;
                text-transform: uppercase;
                color: #64748b;
                background-color: #f1f5f9;
            }}
            .total-col {{
                font-weight: 800;
                background-color: #f1f5f9 !important;
                color: #0f172a;
                border-left: 1px solid #94a3b8;
            }}
            .student-name {{
                text-align: left !important;
                padding-left: 6px !important;
                white-space: nowrap;
                width: 180px;
                font-weight: 500;
            }}
            tr:nth-child(even) td {{
                background-color: #f9fafb;
            }}
            .sn-col {{ width: 25px; font-weight: 700; color: #64748b; }}
            .adm-col {{ width: 70px; font-family: monospace; font-size: {font_size - 1}px; }}
            .text-left {{ text-align: left; }}
            .score-val {{ font-size: {font_size}px; color: #374151; }}
            .total-val {{ font-weight: 800; font-size: {font_size + 1}px; }}
            
            .footer-strip {{
                margin-top: 10px;
                padding-top: 5px;
                border-top: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                font-size: {font_size - 2}px;
                color: #9ca3af;
                font-style: italic;
            }}
        </style>
    </head>
    <body>
    """

    current_page = 0
    # Outer loop: Student Groups (usually people want to see Page 1, Page 2 for first group of subjects first)
    # Actually, let's do: For each set of subjects, show all students.
    for s_idx, chunk_subjects in enumerate(subject_chunks):
        for st_idx, chunk_students in enumerate(student_chunks):
            current_page += 1
            if current_page > 1:
                html += '<div style="page-break-before: always;"></div>'

            html += f"""
            <div class="header">
                <div class="header-banner">
                    <div class="logo-placeholder">
                        { f'<img src="{logo_src}" class="logo-img">' if logo_src else '<span style="color:#4f46e5; font-weight:bold; font-size:24pt;">🏫</span>' }
                    </div>
                    <div class="school-text">
                        <h1 class="school-name">{school_name}</h1>
                        <div class="school-motto">Motto: {metadata.get("school_motto", "N/A")}</div>
                        <div style="margin-top: 1mm; font-size: {font_size + 0}px; color: #eef2ff;">
                            { metadata.get("formatted_sections") if metadata.get("formatted_sections") else "" }
                        </div>
                    </div>
                </div>
                <div class="report-title">OFFICIAL BROAD SHEET</div>
                <div class="meta-info">
                    <div><strong>CLASS:</strong> {metadata_class_name}</div>
                    <div><strong>TERM:</strong> {term_name}</div>
                    <div><strong>SESSION:</strong> {academic_session}</div>
                    <div><strong>PAGE {current_page} OF {total_pages}</strong></div>
                </div>
            </div>
                
            <table>
                <thead>
                    <tr>
                        <th rowspan="2" class="sn-col">S/N</th>
                        <th rowspan="2" class="adm-col">Adm No.</th>
                        <th rowspan="2" class="student-name">Student Name</th>"""

            # Pre-calculate assessment mapping for this chunk of subjects
            subject_assessment_map = {}
            for subject in chunk_subjects:
                atype_set = set()
                for student in broad_sheet_data: # Check ALL students to ensure header consistency
                    if subject in student["subjects"] and 'scores' in student["subjects"][subject]:
                        for s in student["subjects"][subject]['scores']:
                            atype_set.add(s['assessment_type'])
                
                sorted_types = sorted(list(atype_set))
                subject_assessment_map[subject] = sorted_types
                colspan = len(sorted_types) + 1 # +1 for Total
                html += f'<th class="subject-header" colspan="{colspan}">{subject.upper()}</th>'

            html += """
                    </tr>
                    <tr>"""

            for subject in chunk_subjects:
                for atype in subject_assessment_map[subject]:
                    html += f'<th class="assessment-header">{format_assess(atype)}</th>'
                html += '<th class="assessment-header total-col">TOTAL</th>'

            html += """
                    </tr>
                </thead>
                <tbody>"""

            for idx, student in enumerate(chunk_students, 1 + st_idx * students_per_page):
                html += f"""
                    <tr>
                        <td class="sn-col">{idx}</td>
                        <td class="adm-col">{student['admission_number'] or ''}</td>
                        <td class="student-name text-left">{student['student_name'].upper()}</td>"""

                for subject in chunk_subjects:
                    if subject in student["subjects"]:
                        s_data = student["subjects"][subject]
                        score_lookup = {s['assessment_type']: s for s in s_data.get('scores', [])}
                        
                        for atype in subject_assessment_map[subject]:
                            if atype in score_lookup:
                                score_val = score_lookup[atype]['score']
                                # Format as integer if possible
                                try:
                                    if float(score_val) == int(float(score_val)):
                                        score_val = int(float(score_val))
                                except: pass
                                html += f'<td class="score-val">{score_val}</td>'
                            else:
                                html += "<td>-</td>"
                        
                        total_score = s_data['total_score']
                        try:
                            if float(total_score) == int(float(total_score)):
                                total_score = int(float(total_score))
                        except: pass
                        html += f'<td class="total-val total-col">{total_score}</td>'
                    else:
                        for _ in range(len(subject_assessment_map[subject]) + 1):
                            html += "<td>-</td>"
                
                html += "</tr>"

            html += """
                </tbody>
            </table>
            """

    html += f"""
        <div class="footer-strip">
            <div>&copy; {datetime.now().year} CBT Mini School System</div>
            <div>Generated on: {datetime_str}</div>
        </div>
    </body>
    </html>"""
    return html

