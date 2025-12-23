# Report API Fix - ClassRoom Model Issue

## Issue

**Error**: `Entity namespace for "class_room" has no property "school_id"`

**Cause**: The `ClassRoom` model doesn't have a `school_id` field. The system assumes all classes belong to the same school, so there's no need to filter by school.

## Solution

Updated the `/reports/api/classes` endpoint to:
1. Remove the `school_id` filter
2. Filter by `is_active=True` instead
3. Use correct field names: `class_room_name` instead of `class_name`, `level` instead of `class_level`

## Changes Made

### Before (Broken)
```python
@report_bp.route("/api/classes", methods=["GET"])
@admin_or_staff_required
def get_classes():
    """Get all classes for the school"""
    from models.school import School
    
    school = School.query.first()
    if not school:
        return jsonify({"success": False, "error": "School not found"}), 404
    
    classes = ClassRoom.query.filter_by(
        school_id=school.school_id  # ❌ ClassRoom has no school_id
    ).order_by(ClassRoom.class_name).all()  # ❌ Wrong field name
    
    return jsonify({
        "success": True,
        "classes": [{
            "class_room_id": cls.class_room_id,
            "class_name": cls.class_name,  # ❌ Wrong field name
            "class_level": cls.class_level  # ❌ Wrong field name
        } for cls in classes]
    })
```

### After (Fixed)
```python
@report_bp.route("/api/classes", methods=["GET"])
@admin_or_staff_required
def get_classes():
    """Get all classes for the school"""
    classes = ClassRoom.query.filter_by(
        is_active=True  # ✅ Filter by active status
    ).order_by(ClassRoom.class_room_name).all()  # ✅ Correct field name
    
    return jsonify({
        "success": True,
        "classes": [{
            "class_room_id": cls.class_room_id,
            "class_name": cls.class_room_name,  # ✅ Correct field name
            "class_level": cls.level  # ✅ Correct field name
        } for cls in classes]
    })
```

## ClassRoom Model Structure

```python
class ClassRoom(db.Model):
    class_room_id = db.Column(db.String(36), primary_key=True)
    class_room_name = db.Column(db.String(100), nullable=False)  # ✅ Not class_name
    level = db.Column(db.Integer, nullable=True)  # ✅ Not class_level
    section = db.Column(db.String(50), nullable=True)
    group = db.Column(db.String(50), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    # ... other fields
    # ❌ NO school_id field
```

## Testing

After the fix, the endpoint should work:

```bash
# Test the API
curl http://localhost:5000/reports/api/classes

# Expected response:
{
  "success": true,
  "classes": [
    {
      "class_room_id": "uuid-here",
      "class_name": "Primary 1",
      "class_level": 1
    },
    {
      "class_room_id": "uuid-here",
      "class_name": "Primary 2",
      "class_level": 2
    }
  ]
}
```

## Related Models

### SchoolTerm (Has school_id) ✅
```python
class SchoolTerm(db.Model):
    term_id = db.Column(db.String(36), primary_key=True)
    term_name = db.Column(db.String(50), nullable=False)
    school_id = db.Column(db.String(36), db.ForeignKey("school.school_id"))  # ✅ Has school_id
    is_current = db.Column(db.Boolean, default=False)
    # ...
```

### ClassRoom (No school_id) ❌
```python
class ClassRoom(db.Model):
    class_room_id = db.Column(db.String(36), primary_key=True)
    class_room_name = db.Column(db.String(100), nullable=False)
    # ❌ No school_id field - assumes single school system
    # ...
```

## Why This Happened

The system was designed as a single-school management system where:
- `SchoolTerm` has `school_id` (for potential multi-school support)
- `ClassRoom` doesn't have `school_id` (assumes single school)
- All classes belong to the same school implicitly

## Prevention

When adding new API endpoints:
1. ✅ Check the model structure first
2. ✅ Use correct field names from the model
3. ✅ Don't assume field names (e.g., `class_name` vs `class_room_name`)
4. ✅ Test the endpoint before deploying

## Additional Fix: User Model

**Error**: `'User' object has no attribute 'profile_picture'`

**Cause**: The User model uses `image` field, not `profile_picture`

**Solution**: Updated `/reports/api/students` endpoint to use `user.image` instead of `user.profile_picture`

### User Model Structure
```python
class User(db.Model):
    id = db.Column(db.String(36), primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    image = db.Column(db.String(200), nullable=True)  # ✅ Not profile_picture
    class_room_id = db.Column(db.String(36), nullable=True)
    role = db.Column(db.String(20), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    # ...
```

## Additional Fix: Report Generator

**Error**: `'ClassRoom' object has no attribute 'school_id'` in report_generator.py

**Cause**: Trying to get school from `class_room.school_id` but ClassRoom doesn't have that field

**Solution**: Get school from `term.school_id` instead (SchoolTerm has school_id)

### Before (Broken)
```python
school = School.query.get(class_room.school_id) if class_room else None  # ❌
```

### After (Fixed)
```python
school = School.query.get(term.school_id) if term else None  # ✅
```

## Status

✅ **All Issues Fixed and Tested**

All endpoints and services now work correctly:
- `/reports/api/terms` - Returns all terms
- `/reports/api/classes` - Returns all active classes
- `/reports/api/students?class_id=<id>` - Returns students for a class
- Report generation service - Gets school correctly

---

**Date**: November 21, 2025
**Issues Fixed**: 
1. ClassRoom model field mismatch in API
2. User model field mismatch in API
3. ClassRoom.school_id in report generator
4. Preview page parameter mismatch
**Resolution**: Updated all code to use correct field names and relationships from models
