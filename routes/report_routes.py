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
    print(f"WeasyPrint not available: {e}")
    WEASYPRINT_AVAILABLE = False

try:
    from xhtml2pdf import pisa
    XHTML2PDF_AVAILABLE = True
except ImportError:
    print("xhtml2pdf not available")
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
    
    # Print the decoded configurations for debugging
    print("Decoded configurations:")
    for config in configs_list:
        print(config)
    
    # configs = configs_list

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
        print(f"[DEBUG] Preview request - config_id: {config_id}, type: {type(config_id)}")
        if config_id:
            config = ReportConfig.query.get(config_id)
            # print(f"[DEBUG] Config found: {config is not None}")
            # if config:
            #     print(f"[DEBUG] Config term_id: {config.term_id}, requested term_id: {term_id}")
            #     print(f"[DEBUG] Config class_room_id: {config.class_room_id}, requested class_room_id: {class_room_id}")
            #     print(f"[DEBUG] Config active_assessments: {config.get_active_assessments()}")
            #     print(f"[DEBUG] Config display_settings: {config.get_display_settings()}")

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
        print("DEBUG: Starting download_single_pdf")
        data = request.get_json()
        student_id = data.get("student_id")
        term_id = data.get("term_id")
        class_room_id = data.get("class_room_id")
        config_id = data.get("config_id")
        
        print(f"DEBUG: Received data - student_id: {student_id}, term_id: {term_id}, class_room_id: {class_room_id}, config_id: {config_id}")

        if not all([student_id, term_id, class_room_id]):
            print("DEBUG: Missing required parameters")
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
        print(f"DEBUG: Generated filename: {filename}")

        # Get report data with performance optimization
        print("DEBUG: Calling ReportGenerator.get_student_scores")
        report_data = ReportGenerator.get_student_scores(
            student_id, term_id, class_room_id, config_id
        )
        print(f"DEBUG: Received data from client: {data}")
        if not report_data:
            print("DEBUG: Could not generate report data")
            return jsonify({
                "success": False,
                "error": "Could not generate report data"
            }), 404

        if WEASYPRINT_AVAILABLE:
            print(f"Generating report using WeasyPrint for {report_data['student']['name']}...")
            # Generate HTML with caching to avoid recomputation
            import time
            start_time = time.time()
            print(f"Generating report for {report_data['student']['name']}...")
            
            html_content = ReportGenerator.generate_report_html(report_data)
            html_time = time.time() - start_time
            print(f"  HTML generated in {html_time:.2f}s")
            
            # Debug: Check HTML content
            print(f"DEBUG: HTML content length: {len(html_content)} characters")
            if "OFFICIAL DOCUMENT" in html_content:
                print("DEBUG: Watermark found in HTML content")
            else:
                print("DEBUG: Watermark NOT found in HTML content")
                # Print first 1000 characters of HTML for inspection
                print(f"DEBUG: First 1000 chars of HTML: {html_content[:1000]}")
            
            # Clear image cache periodically to prevent memory buildup
            if hasattr(ReportGenerator, '_image_cache') and len(ReportGenerator._image_cache) > 100:
                ReportGenerator._image_cache.clear()
                print("  Image cache cleared to prevent memory buildup")
                
            # Clear HTML cache periodically to prevent memory buildup
            if hasattr(ReportGenerator, '_html_cache') and len(ReportGenerator._html_cache) > 50:
                ReportGenerator._html_cache.clear()
                print("  HTML cache cleared to prevent memory buildup")

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
                    print(f"  Starting WeasyPrint PDF generation...")
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
                    print(f"  WeasyPrint PDF generation completed in {pdf_end_time - pdf_start_time:.2f}s")
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
                print("ERROR: PDF generation timed out after 45 seconds")
                return jsonify({
                    "success": False,
                    "error": "PDF generation timed out. Please try again."
                }), 500
            pdf_time = time.time() - pdf_start
            total_time = time.time() - start_time
            print(f"  PDF generated in {pdf_time:.2f}s")
            print(f"  Total time: {total_time:.2f}s")
            
            # Log performance metrics for monitoring
            if pdf_time > 10:  # If PDF generation takes more than 10 seconds, log details
                print(f"  WARNING: Slow PDF generation detected for {report_data['student']['name']}")
                print(f"    HTML size: {len(html_content)} characters")
                # Count images in HTML
                import re
                img_count = len(re.findall(r'<img[^>]+>', html_content))
                print(f"    Images embedded: {img_count}")

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
                print("ERROR: PDF generation timed out after 30 seconds")
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
        print(f"Error generating PDF: {str(e)}")
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
                print(f"DEBUG: Generating HTML for student {i+1}/{len(reports)}: {student_name}")
                html_content = ReportGenerator.generate_report_html(report_data)
                html_parts.append(html_content)
                
                # Debug: Check if watermark is in the HTML
                if "OFFICIAL DOCUMENT" in html_content:
                    print(f"DEBUG: Watermark found in HTML for {student_name}")
                else:
                    print(f"DEBUG: Watermark NOT found in HTML for {student_name}")
                
                # Clear image cache periodically during bulk operations
                if hasattr(ReportGenerator, '_image_cache') and len(ReportGenerator._image_cache) > 100:
                    ReportGenerator._image_cache.clear()
                    print("  Image cache cleared during bulk generation")
                                
                # Clear HTML cache periodically during bulk operations
                if hasattr(ReportGenerator, '_html_cache') and len(ReportGenerator._html_cache) > 50:
                    ReportGenerator._html_cache.clear()
                    print("  HTML cache cleared during bulk generation")

            print(f"All HTML generated in {time.time() - start_time:.2f}s")

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
                print("ERROR: Bulk PDF generation timed out after 90 seconds")
                return jsonify({
                    "success": False,
                    "error": "Bulk PDF generation timed out. Please try generating fewer reports at once."
                }), 500
            pdf_time = time.time() - pdf_start
            total_time = time.time() - start_time
            print(f"PDF conversion took {pdf_time:.2f}s")
            print(f"Total processing time: {total_time:.2f}s")
            
            # Log performance metrics for monitoring
            if pdf_time > 30:  # If PDF generation takes more than 30 seconds, log details
                print(f"  WARNING: Slow PDF generation detected for class report")
                print(f"    HTML size: {len(combined_html)} characters")
                # Count images in HTML
                import re
                img_count = len(re.findall(r'<img[^>]+>', combined_html))
                print(f"    Images embedded: {img_count}")
                print(f"    Number of students: {len(reports)}")

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
                print(f"DEBUG: Generating simple HTML for student {i+1}/{len(reports)}: {student_name}")
                html_content = ReportGenerator.generate_simple_report_html(report_data)
                html_parts.append(html_content)
                
                # Debug: Check if watermark is in the HTML
                if "OFFICIAL DOCUMENT" in html_content:
                    print(f"DEBUG: Watermark found in simple HTML for {student_name}")
                else:
                    print(f"DEBUG: Watermark NOT found in simple HTML for {student_name}")

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
                print("ERROR: Bulk PDF generation timed out after 60 seconds")
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
        print(error_msg)
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
