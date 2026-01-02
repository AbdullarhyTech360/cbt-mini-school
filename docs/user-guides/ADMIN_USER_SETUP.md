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

The system automatically creates default users when it first starts up. This happens through the `initialize_default_data()` function in `utils/initialize_defaults.py`. The process includes:

1. Creating a default admin user
2. Creating a demo student user
3. Setting up basic permissions and roles

## Manual Admin User Creation

If you need to create an admin user manually (for example, if the default one was deleted), you have several options:

### Option 1: Using the Command Line

1. Open a terminal in your project directory
2. Run the following Python command:

```bash
python -c "
from app import app
from models.user import User
from models import db

with app.app_context():
    # Check if admin already exists
    admin = User.query.filter_by(username='admin').first()
    if not admin:
        # Create admin user
        admin = User(
            username='admin',
            email='admin@example.com',
            first_name='System',
            last_name='Administrator',
            role='admin',
            is_active=True
        )
        admin.set_password('aaaa')
        db.session.add(admin)
        db.session.commit()
        print('Admin user created successfully')
    else:
        print('Admin user already exists')
"
```

### Option 2: Using the Admin Interface (if another admin exists)

1. Log in with an existing admin account
2. Navigate to "User Management"
3. Click "Add New User"
4. Fill in the user details
5. Set the role to "admin"
6. Save the user

### Option 3: Direct Database Access

As a last resort, you can create an admin user directly in the database:

1. Access your database
2. Insert a new user record with role='admin'
3. Make sure to hash the password properly

## Changing Default Admin Password

For security reasons, you should change the default admin password as soon as possible:

1. Log in as admin
2. Go to "Profile" or "User Management"
3. Select the admin user
4. Change the password
5. Save the changes

## Troubleshooting

### Admin User Not Created

If the admin user is not automatically created:

1. Check the server logs for any errors during initialization
2. Verify the database connection is working
3. Manually run the initialization script:

```bash
python -c "from app import app; from utils.initialize_defaults import initialize_default_data; app.app_context().push(); initialize_default_data()"
```

### Can't Log In With Default Credentials

If you can't log in with the default credentials:

1. Verify the admin user exists in the database
2. Check if the password is correctly hashed
3. Reset the password using the command line method above

### Permissions Issues

If the admin user exists but doesn't have proper permissions:

1. Check the user's role is set to 'admin'
2. Verify the permissions are correctly assigned
3. Check if there are any permission-related errors in the logs

## Best Practices

1. **Change Default Password**: Always change the default admin password immediately
2. **Create Multiple Admins**: Consider having at least two admin accounts
3. **Use Strong Passwords**: Follow password best practices for admin accounts
4. **Regular Audits**: Periodically review admin accounts and their permissions
5. **Document Changes**: Keep track of admin account changes for security purposes

## Security Considerations

1. **Limit Admin Access**: Only grant admin access to trusted personnel
2. **Regular Password Changes**: Implement a policy for regular password changes
3. **Two-Factor Authentication**: Consider implementing 2FA for admin accounts
4. **Audit Logs**: Enable and regularly review admin activity logs
5. **Secure Connection**: Always use HTTPS when accessing admin functions

## Recovery Options

If you lose access to all admin accounts:

1. Use the command line method to create a new admin
2. Restore from a recent database backup
3. Contact technical support for assistance

Remember to keep your admin credentials secure and change them regularly to maintain system security.
