from werkzeug.security import check_password_hash, generate_password_hash


def hash_password(password: str) -> str:
    return generate_password_hash(password)


def verify_password(password: str, stored: str) -> bool:
    """Verifies new Werkzeug hashes and bcrypt ($2y$) hashes created by the old PHP app."""
    if stored.startswith(("$2y$", "$2a$", "$2b$")):
        try:
            import bcrypt

            return bcrypt.checkpw(password.encode(), stored.replace("$2y$", "$2b$", 1).encode())
        except Exception:
            return False
    return check_password_hash(stored, password)
