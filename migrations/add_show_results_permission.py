"""
Migration: Add "Show Results Immediately" permission
This migration adds a new permission that controls whether students
can see their exam results immediately after submission
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from models.permissions import Permission
from services.generate_uuid import generate_uuid
from datetime import datetime

def run_migration():
    """Add show results immediately permission"""
    with app.app_context():
        try:
            print("Starting migration: Add 'Show Results Immediately' permission...")
            
            # Check if permission already exists
            existing = Permission.query.filter_by(
                permission_name="show_results_immediately"
            ).first()
            
            if existing:
                print("✓ Permission already exists")
                print(f"  Current status: {'Active' if existing.is_active else 'Inactive'}")
                return True
            
            # Create new permission
            permission = Permission(
                permission_id=generate_uuid(),
                permission_name="show_results_immediately",
                permission_description="Allow students to see exam results immediately after submission",
                is_active=False,  # Default to disabled for security
                created_for="student",
                permission_created_at=datetime.utcnow(),
                permission_updated_at=datetime.utcnow()
            )
            
            db.session.add(permission)
            db.session.commit()
            
            print("✓ Permission created successfully!")
            print(f"  Name: {permission.permission_name}")
            print(f"  Description: {permission.permission_description}")
            print(f"  Created for: {permission.created_for}")
            print(f"  Status: {'Active' if permission.is_active else 'Inactive (default)'}")
            print("\nNote: This permission is disabled by default.")
            print("Admins can enable it in Settings → Permissions")
            
            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"✗ Migration failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    success = run_migration()
    if success:
        print("\n✓ Migration completed successfully!")
        print("\nNext steps:")
        print("1. Restart your server")
        print("2. Go to Admin → Settings → Permissions")
        print("3. Enable 'Show Results Immediately' if desired")
        print("4. Students will see results after submission when enabled")
    else:
        print("\n✗ Migration failed!")
