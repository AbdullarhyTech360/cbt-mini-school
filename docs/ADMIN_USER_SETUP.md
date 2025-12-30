# Admin User Setup Guide

## Overview

This guide explains how to ensure an admin user exists in the CBT Minischool system. The system is designed to automatically create a default admin user when it starts for the first time, but you can also manually create one if needed.

## Default Credentials

When the system initializes for the first time, it automatically creates default users with the following credentials:

### Admin User
- **Username:** `admin`
- **Password:** `aaaa`

### Demo User
- **Username:** `demo001`
- **Password:** `demo`

## Automatic Initialization

The system automatically initializes default data including the admin user when you start the application for the first time. This happens in the `app.py` file within the application context.

If you're encountering a "username not found" error when trying to log in as admin, it likely means the initialization hasn't run properly or the database was reset without reinitializing.

## Manual User Creation Scripts

We've created dedicated scripts for creating users manually. These scripts can be run separately to ensure users are available for testing.

### Script 1: Create Both Admin and Demo Users

Run the following command from the project root directory to create both users:

```bash
python scripts/create_default_users.py
```

This script will:
1. Check if an admin user already exists, create one if not
2. Check if a demo user already exists, create one if not
3. Associate users with appropriate classes

### Script 2: Create Only Admin User

To create just the admin user:

```bash
python scripts/create_admin_user.py
```

### Script 3: Create Only Demo User

To create just the demo user:

```bash
python scripts/create_demo_user.py
```

### Script 4: Verify Users Exist

To check if both users exist:

```bash
python scripts/verify_default_users.py
```

## Manual Creation via Python Shell

You can also create users manually using the Python shell:

### Creating Admin User
```bash
# Start Python shell
python

# In the Python shell:
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from models.user import User, generate_uuid
from models.teacher import Teacher
from datetime import date

# Create application context
with app.app_context():
    # Get default class
    from models.class_room import ClassRoom
    default_class = ClassRoom.query.filter_by(class_room_name="Primary 1").first()
    if not default_class:
        default_class = ClassRoom.query.first()
    
    # Create admin user
    admin = User(
        id=generate_uuid(),
        username="admin",
        first_name="System",
        last_name="Administrator",
        email="admin@demoschool.com",
        gender="Male",
        dob=date(1990, 1, 1),
        class_room_id=default_class.class_room_id if default_class else None,
        role="admin",
        is_active=True
    )
    admin.set_password("aaaa")  # Set password
    db.session.add(admin)
    db.session.flush()
    
    # Create corresponding Teacher record
    teacher = Teacher(
        id=admin.id,
        user_id=admin.id,
        employee_id="ADM001",
        specialization="System Administration"
    )
    db.session.add(teacher)
    
    db.session.commit()
    # print("Admin user created successfully!")
```

### Creating Demo User
```bash
# Start Python shell
python

# In the Python shell:
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from models.user import User, generate_uuid
from models.student import Student
from datetime import date

# Create application context
with app.app_context():
    # Get a class to assign
    from models.class_room import ClassRoom
    class_room = ClassRoom.query.first()
    if not class_room:
        # print("ERROR: No classes found. Please create a class first.")
    else:
        # Create demo user
        user = User(
            id=generate_uuid(),
            username='demo001',
            first_name='Demo',
            last_name='User',
            email=None,
            gender='Male',
            dob=date(2005, 1, 1),
            register_number='DEMO001',
            class_room_id=class_room.class_room_id,
            role='student',
        )
        user.set_password('demo')
        db.session.add(user)
        db.session.flush()
        
        # Create student profile
        student = Student(
            id=user.id,
            user_id=user.id,
            admission_number='demo001',
            admission_date=user.dob,
            parent_name='Demo Parent',
            parent_phone='0000000000',
            parent_email='demo@example.com',
            blood_group='O+',
            address='Demo Address'
        )
        db.session.add(student)
        
        db.session.commit()
        # print("Demo user created successfully!")
```

## Verifying Users Exist

To check if users exist in your database:

```bash
# Start Python shell
python

# In the Python shell:
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from models.user import User

# Create application context
with app.app_context():
    # Check admin user
    admin = User.query.filter_by(role="admin").first()
    if admin:
        # print(f"Admin user exists: {admin.username}")
    else:
        # print("No admin user found")
    
    # Check demo user
    demo = User.query.filter_by(username="demo001").first()
    if demo:
        # print(f"Demo user exists: {demo.username}")
    else:
        # print("No demo user found")
```

## Changing User Passwords

To change passwords after login:

1. Log in as the user
2. Navigate to the user management section (if available)
3. Or use the "Forgot Password" feature on the login page
4. Or manually update via Python shell:

### Changing Admin Password
```bash
# Start Python shell
python

# In the Python shell:
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from models.user import User

# Create application context
with app.app_context():
    admin = User.query.filter_by(username="admin").first()
    if admin:
        admin.set_password("your_new_password")
        db.session.commit()
        # print("Admin password updated successfully!")
    else:
        # print("Admin user not found")
```

### Changing Demo Password
```bash
# Start Python shell
python

# In the Python shell:
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from models.user import User

# Create application context
with app.app_context():
    demo = User.query.filter_by(username="demo001").first()
    if demo:
        demo.set_password("your_new_password")
        db.session.commit()
        # print("Demo password updated successfully!")
    else:
        # print("Demo user not found")
```

## Troubleshooting

### Issue: "Username not found" when logging in

**Solution:**
1. Run the manual user creation script:
   ```bash
   python scripts/create_default_users.py
   ```
2. Verify the database connection is working properly
3. Check that the database tables have been created

### Issue: Cannot access admin panel after login

**Solution:**
1. Ensure the logged in user has the "admin" role
2. Check database records to verify user role:
   ```sql
   SELECT username, role FROM user WHERE username = 'admin';
   ```

### Issue: Forgot user password

**Solution:**
1. Use the "Forgot Password" feature on the login page
2. Or reset via Python shell (see "Changing User Passwords" section above)

## Security Recommendations

1. **Change default passwords** immediately after first login
2. **Use strong passwords** with at least 8 characters including numbers and symbols
3. **Limit admin accounts** - only create additional admin accounts when absolutely necessary
4. **Regular audits** - periodically review who has admin access

## Need Help?

If you continue to experience issues with user setup:

1. Check the application logs for error messages
2. Verify database connectivity
3. Ensure all migrations have been run
4. Contact support with detailed error information

---
**Note:** The default passwords (`aaaa` for admin and `demo` for demo user) are intentionally simple for initial setup but should be changed immediately for security reasons.