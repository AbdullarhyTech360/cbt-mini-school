
def generate_username(last_class_number: int, role: str) -> str:
    if role == "student":
        return f"ST{last_class_number}"
    elif role == "teacher":
        return f"TE{last_class_number}"
    elif role == "admin":
        return f"AD{last_class_number}"