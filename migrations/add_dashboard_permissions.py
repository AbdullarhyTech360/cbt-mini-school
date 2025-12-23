"""
Migration to add dashboard visibility permissions for different user roles.
This allows admins to control whether teachers, students, and staff can access their dashboards.
"""
from models import db
from models.permissions import Permission
from services.generate_uuid import generate_uuid


def add_dashboard_permissions():
    """Add dashboard visibility permissions for teachers, students, and staff"""
    
    permissions_data = [
        {
            "permission_name": "teachers_can_view_dashboard",
            "permission_description": "Allow teachers to access their dashboard",
            "is_active": True,
            "created_for": "teacher"
        },
        {
            "permission_name": "students_can_view_dashboard",
            "permission_description": "Allow students to access their dashboard",
            "is_active": True,
            "created_for": "student"
        },
        {
            "permission_name": "staff_can_view_dashboard",
            "permission_description": "Allow staff to access their dashboard",
            "is_active": True,
            "created_for": "staff"
        }
    ]
    
    created_count = 0
    updated_count = 0
    
    for perm_data in permissions_data:
        # Check if permission already exists
        existing = Permission.query.filter_by(
            permission_name=perm_data["permission_name"]
        ).first()
        
        if not existing:
            # Create new permission
            permission = Permission(
                permission_id=generate_uuid(),
                permission_name=perm_data["permission_name"],
                permission_description=perm_data["permission_description"],
                is_active=perm_data["is_active"],
                created_for=perm_data["created_for"]
            )
            db.session.add(permission)
            created_count += 1
            print(f"✓ Created permission: {perm_data['permission_name']}")
        else:
            # Update existing permission
            existing.permission_description = perm_data["permission_description"]
            existing.is_active = perm_data["is_active"]
            existing.created_for = perm_data["created_for"]
            updated_count += 1
            print(f"✓ Updated permission: {perm_data['permission_name']}")
    
    db.session.commit()
    
    print(f"\n{'='*60}")
    print("DASHBOARD PERMISSIONS MIGRATION SUMMARY:")
    print(f"{'='*60}")
    print(f"Permissions created: {created_count}")
    print(f"Permissions updated: {updated_count}")
    print(f"{'='*60}\n")
    
    return {
        "created": created_count,
        "updated": updated_count
    }


if __name__ == "__main__":
    print("This migration should be run from app.py")
    print("Usage: from migrations.add_dashboard_permissions import add_dashboard_permissions")
    print("       add_dashboard_permissions()")
