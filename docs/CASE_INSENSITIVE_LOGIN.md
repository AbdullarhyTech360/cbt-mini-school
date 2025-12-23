# Case-Insensitive Login Implementation

## Changes Made - November 22, 2025

### Problem
Username login was case-sensitive, requiring exact match. Users had to type usernames exactly as stored (e.g., "ADMIN001" vs "admin001").

### Solution
Implemented case-insensitive username and email lookups using SQLAlchemy's `func.lower()` function.

## Modified Sections in `routes/auth_routes.py`

### 1. Login Route (`/login`)
**Before:**
```python
user = User.query.filter_by(username=username).first() or \
       User.query.filter_by(username=username.lower()).first() or \
       User.query.filter_by(username=username.upper()).first()
```

**After:**
```python
user = User.query.filter(db.func.lower(User.username) == username.lower()).first()
```

### 2. Check User Route (`/check_user`)

#### For Students:
```python
user = User.query.filter(
    db.func.lower(User.username) == message.lower(),
    User.role == "student"
).first()
```

#### For Staff/Admin:
```python
user = User.query.filter(
    db.func.lower(User.username) == message.lower(),
    User.role.in_(["staff", "admin"])
).first()
```

#### For Unknown Role:
```python
user = User.query.filter(
    db.or_(
        db.func.lower(User.username) == message.lower(),
        db.func.lower(User.email) == message.lower()
    )
).first()
```

### 3. Forgot Password Route (`/forgot_password`)
```python
user = User.query.filter(
    db.or_(
        db.func.lower(User.username) == username_or_email.lower(),
        db.func.lower(User.email) == username_or_email.lower()
    )
).first()
```

## Benefits

1. ✅ **Better UX**: Users can type username in any case
2. ✅ **More Efficient**: Single database query instead of multiple attempts
3. ✅ **Consistent**: All authentication routes use same approach
4. ✅ **Database-Level**: Uses SQL LOWER() function for optimal performance

## Examples

Now all these work for username "ADMIN001":
- `admin001`
- `ADMIN001`
- `Admin001`
- `aDmIn001`

Same applies to email addresses for staff/admin users.
