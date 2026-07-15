from flask import render_template, session, request, jsonify
from models import db, User, Section, School
from models.class_room import ClassRoom
from models.school_term import SchoolTerm
from models.grade import Grade
from models.promotion_rule import PromotionRule
from models.promotion_batch import PromotionBatch
from models.student_promotion import StudentPromotion
from models.student_class_history import StudentClassHistory
from routes.dashboard import admin_required
from datetime import datetime
from sqlalchemy import func


def promotion_routes(app):

    @app.route("/api/sections", methods=["GET"])
    @admin_required
    def list_sections():
        school = School.query.first()
        sections = Section.query.filter_by(school_id=school.school_id, is_active=True).all()
        return jsonify({"sections": [s.to_dict() for s in sections]})

    @app.route("/admin/promotion")
    @admin_required
    def promotion_page():
        current_user = User.query.get(session["user_id"])
        return render_template(
            "admin/promotion.html",
            current_user=current_user,
        )

    # ── Rules CRUD ──────────────────────────────────────────────

    @app.route("/api/promotion/rules", methods=["GET"])
    @admin_required
    def list_promotion_rules():
        school = School.query.first()
        rules = PromotionRule.query.filter_by(school_id=school.school_id).order_by(
            PromotionRule.source_level
        ).all()
        return jsonify({"success": True, "rules": [r.to_dict() for r in rules]})

    @app.route("/api/promotion/rules", methods=["POST"])
    @admin_required
    def create_promotion_rule():
        try:
            school = School.query.first()
            data = request.get_json()
            if not data:
                return jsonify({"success": False, "message": "No data provided"}), 400

            name = data.get("name", "").strip()
            source_section_id = data.get("source_section_id")
            source_level = data.get("source_level")
            dest_section_id = data.get("dest_section_id")
            dest_level = data.get("dest_level")
            min_average = data.get("min_average")
            fail_action = data.get("fail_action", "repeat")

            if not all([name, source_section_id, source_level is not None, dest_section_id, dest_level is not None]):
                return jsonify({"success": False, "message": "Name, source/destination section and level are required"}), 400

            if fail_action not in ("repeat", "withdraw", "manual"):
                return jsonify({"success": False, "message": "Invalid fail_action"}), 400

            rule = PromotionRule(
                name=name,
                source_section_id=source_section_id,
                source_level=int(source_level),
                dest_section_id=dest_section_id,
                dest_level=int(dest_level),
                min_average=float(min_average) if min_average not in (None, "", "null") else None,
                fail_action=fail_action,
                school_id=school.school_id,
            )
            db.session.add(rule)
            db.session.commit()
            return jsonify({"success": True, "rule": rule.to_dict()}), 201

        except Exception as e:
            db.session.rollback()
            return jsonify({"success": False, "message": str(e)}), 500

    @app.route("/api/promotion/rules/<rule_id>", methods=["PUT"])
    @admin_required
    def update_promotion_rule(rule_id):
        try:
            rule = PromotionRule.query.get(rule_id)
            if not rule:
                return jsonify({"success": False, "message": "Rule not found"}), 404

            data = request.get_json()
            if not data:
                return jsonify({"success": False, "message": "No data provided"}), 400

            if "name" in data:
                rule.name = data["name"].strip()
            if "source_section_id" in data:
                rule.source_section_id = data["source_section_id"]
            if "source_level" in data:
                rule.source_level = int(data["source_level"])
            if "dest_section_id" in data:
                rule.dest_section_id = data["dest_section_id"]
            if "dest_level" in data:
                rule.dest_level = int(data["dest_level"])
            if "min_average" in data:
                rule.min_average = float(data["min_average"]) if data["min_average"] not in (None, "", "null") else None
            if "fail_action" in data:
                rule.fail_action = data["fail_action"]
            if "is_active" in data:
                rule.is_active = bool(data["is_active"])

            db.session.commit()
            return jsonify({"success": True, "rule": rule.to_dict()})

        except Exception as e:
            db.session.rollback()
            return jsonify({"success": False, "message": str(e)}), 500

    @app.route("/api/promotion/rules/<rule_id>", methods=["DELETE"])
    @admin_required
    def delete_promotion_rule(rule_id):
        try:
            rule = PromotionRule.query.get(rule_id)
            if not rule:
                return jsonify({"success": False, "message": "Rule not found"}), 404

            db.session.delete(rule)
            db.session.commit()
            return jsonify({"success": True, "message": "Rule deleted"})

        except Exception as e:
            db.session.rollback()
            return jsonify({"success": False, "message": str(e)}), 500

    # ── Preview ─────────────────────────────────────────────────

    def _calculate_student_average(student_id, academic_session):
        """Calculate a student's overall average percentage for a given session."""
        result = db.session.query(
            func.sum(Grade.score),
            func.sum(Grade.max_score),
        ).filter(
            Grade.student_id == student_id,
            Grade.academic_session == academic_session,
            db.or_(Grade.is_published == True, Grade.is_from_cbt == True),
        ).first()

        total_score, total_max = result
        if total_max and total_max > 0:
            return round((total_score / total_max) * 100, 1)
        return None

    def _find_dest_class(source_class, dest_section_id, dest_level, dest_session, school_id):
        """Find or create the destination class for promotion."""
        section = Section.query.get(dest_section_id)
        section_abbrev = section.abbreviation if section else ""

        # Try to find an existing active class matching the criteria
        dest_class = ClassRoom.query.filter(
            ClassRoom.section_id == dest_section_id,
            ClassRoom.level == dest_level,
            ClassRoom.academic_year == dest_session,
            ClassRoom.is_active == True,
            ClassRoom.is_archived == False,
        ).first()

        if dest_class:
            return dest_class

        # Create a new class mirroring naming convention from source
        source_name = source_class.class_room_name
        # Try to replace the level number in the name
        import re
        new_name = re.sub(r'\d+', str(dest_level), source_name, count=1)
        if new_name == source_name:
            new_name = f"{source_name} -> Level {dest_level}"

        # Ensure uniqueness
        existing = ClassRoom.query.filter_by(class_room_name=new_name).first()
        if existing:
            new_name = f"{new_name} ({dest_session})"

        dest_class = ClassRoom(
            class_room_name=new_name,
            level=dest_level,
            section_id=dest_section_id,
            class_capacity=source_class.class_capacity,
            academic_year=dest_session,
            is_active=True,
            is_archived=False,
        )
        db.session.add(dest_class)
        db.session.flush()
        return dest_class

    @app.route("/api/promotion/preview", methods=["POST"])
    @admin_required
    def preview_promotion():
        """
        Dry-run: evaluate all students against rules and return categorized lists.
        Expects JSON: { source_session: "2024-2025", dest_session: "2025-2026" }
        """
        try:
            school = School.query.first()
            data = request.get_json()
            source_session = data.get("source_session")
            dest_session = data.get("dest_session")

            if not source_session or not dest_session:
                return jsonify({"success": False, "message": "source_session and dest_session are required"}), 400

            # Get active promotion rules for this school
            rules = PromotionRule.query.filter_by(
                school_id=school.school_id, is_active=True
            ).all()

            # Build a lookup: (section_id, level) -> rule
            rule_map = {}
            for r in rules:
                rule_map[(r.source_section_id, r.source_level)] = r

            # Get all active, non-archived classes for this school
            # Classes are linked to sections which belong to the school
            classes = ClassRoom.query.join(
                Section, ClassRoom.section_id == Section.section_id
            ).filter(
                Section.school_id == school.school_id,
                ClassRoom.is_active == True,
                ClassRoom.is_archived == False,
            ).all()

            promoted = []
            repeated = []
            withdrawn = []
            no_rule = []

            for class_room in classes:
                rule = rule_map.get((class_room.section_id, class_room.level))

                students = User.query.filter_by(
                    class_room_id=class_room.class_room_id,
                    role="student",
                    is_active=True,
                ).all()

                for student in students:
                    avg = _calculate_student_average(student.id, source_session)

                    entry = {
                        "student_id": student.id,
                        "student_name": student.full_name(),
                        "admission_number": student.student.admission_number if student.student else None,
                        "source_class_id": class_room.class_room_id,
                        "source_class_name": class_room.class_room_name,
                        "average": avg,
                    }

                    if not rule:
                        entry["reason"] = "No promotion rule for this class"
                        no_rule.append(entry)
                        continue

                    entry["rule_id"] = rule.id
                    entry["rule_name"] = rule.name
                    entry["min_average"] = rule.min_average
                    entry["dest_section_id"] = rule.dest_section_id
                    entry["dest_level"] = rule.dest_level
                    entry["fail_action"] = rule.fail_action

                    if avg is None:
                        # No grades — treat as below threshold
                        meets = False
                    elif rule.min_average is not None:
                        meets = avg >= rule.min_average
                    else:
                        meets = True  # No minimum — everyone passes

                    entry["meets_criteria"] = meets

                    if meets:
                        entry["action"] = "promoted"
                        promoted.append(entry)
                    else:
                        if rule.fail_action == "repeat":
                            entry["action"] = "repeated"
                            repeated.append(entry)
                        elif rule.fail_action == "withdraw":
                            entry["action"] = "withdrawn"
                            withdrawn.append(entry)
                        else:
                            entry["action"] = "manual"
                            no_rule.append(entry)

            return jsonify({
                "success": True,
                "promoted": promoted,
                "repeated": repeated,
                "withdrawn": withdrawn,
                "no_rule": no_rule,
                "summary": {
                    "total": len(promoted) + len(repeated) + len(withdrawn) + len(no_rule),
                    "promoted": len(promoted),
                    "repeated": len(repeated),
                    "withdrawn": len(withdrawn),
                    "no_rule": len(no_rule),
                },
            })

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"success": False, "message": str(e)}), 500

    # ── Override ────────────────────────────────────────────────

    @app.route("/api/promotion/override", methods=["POST"])
    @admin_required
    def override_student_promotion():
        """
        Override a single student's promotion decision (before execution).
        Expects JSON: {
            student_id, source_class_id, action: "promoted"|"repeated"|"withdrawn",
            dest_class_id (optional), dest_level (optional), dest_section_id (optional),
            source_session, dest_session, override_reason
        }
        """
        try:
            school = School.query.first()
            data = request.get_json()
            student_id = data.get("student_id")
            source_class_id = data.get("source_class_id")
            action = data.get("action")
            source_session = data.get("source_session")
            dest_session = data.get("dest_session")
            override_reason = data.get("override_reason", "")

            if not all([student_id, source_class_id, action, source_session, dest_session]):
                return jsonify({"success": False, "message": "Missing required fields"}), 400

            if action not in ("promoted", "repeated", "withdrawn"):
                return jsonify({"success": False, "message": "Invalid action"}), 400

            student = User.query.get(student_id)
            source_class = ClassRoom.query.get(source_class_id)
            if not student or not source_class:
                return jsonify({"success": False, "message": "Student or class not found"}), 404

            avg = _calculate_student_average(student_id, source_session)

            # Determine dest class
            dest_class_id = data.get("dest_class_id")
            dest_class = None

            if action == "promoted":
                dest_level = data.get("dest_level")
                dest_section_id = data.get("dest_section_id")
                if dest_class_id:
                    dest_class = ClassRoom.query.get(dest_class_id)
                elif dest_level and dest_section_id:
                    dest_class = _find_dest_class(
                        source_class, dest_section_id, int(dest_level), dest_session, school.school_id
                    )
                else:
                    # Auto-detect from rule
                    rule = PromotionRule.query.filter_by(
                        source_section_id=source_class.section_id,
                        source_level=source_class.level,
                        school_id=school.school_id,
                        is_active=True,
                    ).first()
                    if rule:
                        dest_class = _find_dest_class(
                            source_class, rule.dest_section_id, rule.dest_level, dest_session, school.school_id
                        )

            override_entry = {
                "student_id": student_id,
                "student_name": student.full_name(),
                "admission_number": student.student.admission_number if student.student else None,
                "source_class_id": source_class_id,
                "source_class_name": source_class.class_room_name,
                "average": avg,
                "action": action,
                "meets_criteria": None,
                "is_override": True,
                "override_reason": override_reason,
                "dest_class_id": dest_class.class_room_id if dest_class else None,
                "dest_class_name": dest_class.class_room_name if dest_class else None,
                "dest_level": dest_class.level if dest_class else None,
                "dest_section_id": dest_class.section_id if dest_class else None,
            }

            return jsonify({"success": True, "override": override_entry})

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"success": False, "message": str(e)}), 500

    # ── Execute ─────────────────────────────────────────────────

    @app.route("/api/promotion/execute", methods=["POST"])
    @admin_required
    def execute_promotion():
        """
        Execute promotion. Expects JSON: {
            source_session, dest_session,
            decisions: [
                { student_id, source_class_id, action, dest_class_id (opt), rule_id (opt), ... }
            ]
        }
        """
        try:
            school = School.query.first()
            current_user = User.query.get(session["user_id"])
            data = request.get_json()
            source_session = data.get("source_session")
            dest_session = data.get("dest_session")
            decisions = data.get("decisions", [])

            if not source_session or not dest_session:
                return jsonify({"success": False, "message": "source_session and dest_session are required"}), 400

            if not decisions:
                return jsonify({"success": False, "message": "No decisions to process"}), 400

            # Create the batch
            batch = PromotionBatch(
                name=f"{source_session} -> {dest_session}",
                source_session=source_session,
                dest_session=dest_session,
                school_id=school.school_id,
                status="draft",
                total_students=len(decisions),
                executed_by=current_user.id,
            )
            db.session.add(batch)
            db.session.flush()

            promoted_count = 0
            repeated_count = 0
            withdrawn_count = 0
            archived_classes = set()

            for d in decisions:
                student_id = d.get("student_id")
                source_class_id = d.get("source_class_id")
                action = d.get("action")
                rule_id = d.get("rule_id")
                dest_class_id = d.get("dest_class_id")
                override_reason = d.get("override_reason")
                is_override = d.get("is_override", False)

                student = User.query.get(student_id)
                source_class = ClassRoom.query.get(source_class_id)
                if not student or not source_class:
                    continue

                avg = _calculate_student_average(student_id, source_session)

                # Resolve destination class
                dest_class = None
                if action == "promoted" and dest_class_id:
                    dest_class = ClassRoom.query.get(dest_class_id)
                elif action == "promoted" and not dest_class_id:
                    # Auto-resolve from rule
                    rule = PromotionRule.query.get(rule_id) if rule_id else None
                    if rule:
                        dest_class = _find_dest_class(
                            source_class, rule.dest_section_id, rule.dest_level,
                            dest_session, school.school_id
                        )

                # Create StudentPromotion record
                sp = StudentPromotion(
                    batch_id=batch.id,
                    student_id=student_id,
                    rule_id=rule_id,
                    source_class_id=source_class_id,
                    source_session=source_session,
                    dest_class_id=dest_class.class_room_id if dest_class else None,
                    dest_session=dest_session,
                    action=action,
                    average_score=avg,
                    meets_criteria=d.get("meets_criteria"),
                    is_override=is_override,
                    override_reason=override_reason,
                )
                db.session.add(sp)

                # Apply the action
                if action == "promoted" and dest_class:
                    # Move student to destination class
                    old_class_id = student.class_room_id
                    student.class_room_id = dest_class.class_room_id
                    promoted_count += 1

                    # Record history
                    history = StudentClassHistory(
                        student_id=student_id,
                        class_room_id=old_class_id,
                        academic_session=source_session,
                        status="promoted",
                        promoted_by=current_user.id,
                        notes=f"Promoted to {dest_class.class_room_name} ({dest_session})" + (f" — Override: {override_reason}" if is_override else ""),
                    )
                    db.session.add(history)

                elif action == "repeated":
                    repeated_count += 1
                    history = StudentClassHistory(
                        student_id=student_id,
                        class_room_id=source_class_id,
                        academic_session=source_session,
                        status="repeated",
                        promoted_by=current_user.id,
                        notes=f"Repeated in {source_class.class_room_name}" + (f" — Override: {override_reason}" if is_override else ""),
                    )
                    db.session.add(history)

                elif action == "withdrawn":
                    student.is_active = False
                    withdrawn_count += 1
                    history = StudentClassHistory(
                        student_id=student_id,
                        class_room_id=source_class_id,
                        academic_session=source_session,
                        status="withdrawn",
                        promoted_by=current_user.id,
                        notes=f"Withdrawn from {source_class.class_room_name}" + (f" — Override: {override_reason}" if is_override else ""),
                    )
                    db.session.add(history)

                # Track source classes for archiving
                archived_classes.add(source_class_id)

            # Archive source classes
            for cls_id in archived_classes:
                cls = ClassRoom.query.get(cls_id)
                if cls:
                    cls.is_active = False
                    cls.is_archived = True
                    cls.archived_at = datetime.utcnow()

            # Update batch
            batch.status = "completed"
            batch.promoted_count = promoted_count
            batch.repeated_count = repeated_count
            batch.withdrawn_count = withdrawn_count
            batch.executed_at = datetime.utcnow()

            # Update school session
            if school:
                school.current_session = dest_session

            # Update student counts for affected classes
            affected_class_ids = set()
            for d in decisions:
                if d.get("source_class_id"):
                    affected_class_ids.add(d["source_class_id"])
                if d.get("dest_class_id"):
                    affected_class_ids.add(d["dest_class_id"])
            for cls_id in affected_class_ids:
                cls = ClassRoom.query.get(cls_id)
                if cls:
                    cls.update_student_count()

            db.session.commit()

            return jsonify({
                "success": True,
                "message": f"Promotion completed: {promoted_count} promoted, {repeated_count} repeated, {withdrawn_count} withdrawn",
                "batch": batch.to_dict(),
            })

        except Exception as e:
            db.session.rollback()
            import traceback
            traceback.print_exc()
            return jsonify({"success": False, "message": str(e)}), 500

    # ── History ─────────────────────────────────────────────────

    @app.route("/api/promotion/history", methods=["GET"])
    @admin_required
    def list_promotion_history():
        school = School.query.first()
        batches = PromotionBatch.query.filter_by(
            school_id=school.school_id
        ).order_by(PromotionBatch.created_at.desc()).all()
        return jsonify({"success": True, "batches": [b.to_dict() for b in batches]})

    @app.route("/api/promotion/history/<batch_id>", methods=["GET"])
    @admin_required
    def get_promotion_batch(batch_id):
        batch = PromotionBatch.query.get(batch_id)
        if not batch:
            return jsonify({"success": False, "message": "Batch not found"}), 404

        promotions = StudentPromotion.query.filter_by(batch_id=batch_id).all()
        return jsonify({
            "success": True,
            "batch": batch.to_dict(),
            "promotions": [p.to_dict() for p in promotions],
        })

    # ── Reverse ─────────────────────────────────────────────────

    @app.route("/api/promotion/reverse/<batch_id>", methods=["POST"])
    @admin_required
    def reverse_promotion(batch_id):
        """Reverse a completed promotion batch — restore old class assignments."""
        try:
            batch = PromotionBatch.query.get(batch_id)
            if not batch:
                return jsonify({"success": False, "message": "Batch not found"}), 404
            if batch.status != "completed":
                return jsonify({"success": False, "message": "Only completed batches can be reversed"}), 400

            promotions = StudentPromotion.query.filter_by(batch_id=batch_id).all()

            for sp in promotions:
                student = User.query.get(sp.student_id)
                if not student:
                    continue

                if sp.action == "promoted":
                    # Move back to source class
                    student.class_room_id = sp.source_class_id
                elif sp.action == "withdrawn":
                    # Reactivate student
                    student.is_active = True

                # Remove the history records for this session
                StudentClassHistory.query.filter(
                    StudentClassHistory.student_id == sp.student_id,
                    StudentClassHistory.academic_session == sp.dest_session,
                ).delete()

            # Unarchive source classes
            source_class_ids = set(sp.source_class_id for sp in promotions)
            for cls_id in source_class_ids:
                cls = ClassRoom.query.get(cls_id)
                if cls:
                    cls.is_active = True
                    cls.is_archived = False
                    cls.archived_at = None

            # Update batch status
            batch.status = "reversed"
            batch.reversed_at = datetime.utcnow()

            # Restore school session
            school = School.query.get(batch.school_id)
            if school:
                school.current_session = batch.source_session

            # Update student counts
            for cls_id in source_class_ids:
                cls = ClassRoom.query.get(cls_id)
                if cls:
                    cls.update_student_count()

            db.session.commit()
            return jsonify({"success": True, "message": "Promotion batch reversed"})

        except Exception as e:
            db.session.rollback()
            import traceback
            traceback.print_exc()
            return jsonify({"success": False, "message": str(e)}), 500
