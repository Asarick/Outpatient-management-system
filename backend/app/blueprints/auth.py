from flask import Blueprint, g
from flask_jwt_extended import create_access_token

from ..extensions import db
from ..models import User
from ..security import hash_password, verify_password
from ..utils import EMAIL_RE, ApiError, auth, body, ok, text, user_payload

bp = Blueprint("auth", __name__)


@bp.post("/auth/login")
def login():
    data = body()
    email = text(data, "email", "Email", 190).lower()
    password = data.get("password", "")
    if not EMAIL_RE.match(email) or not isinstance(password, str) or not password or len(password) > 1024:
        raise ApiError("Enter a valid email and password.")

    u = User.query.filter(db.func.lower(User.email) == email, User.is_active.is_(True)).first()
    bad = (
        not u
        or not verify_password(password, u.password_hash)
        or (u.role != "platform_admin" and (u.organization_id is None or not u.organization.is_active))
        or (u.role == "platform_admin" and u.organization_id is not None)
    )
    if bad:
        raise ApiError("The email or password is incorrect.", 401)
    token = create_access_token(identity=str(u.id))
    return ok(token=token, user=user_payload(u))


@bp.get("/auth/me")
@auth(allow_password_change=True)
def me():
    return ok(user=user_payload(g.user))


@bp.post("/auth/change-password")
@auth(allow_password_change=True)
def change_password():
    data = body()
    current = data.get("current_password", "")
    if not isinstance(current, str) or not current or len(current) > 1024:
        raise ApiError("Enter your current temporary password.")
    new = text(data, "new_password", "New password", 1024)
    confirm = text(data, "confirm_password", "Confirm password", 1024)
    if len(new) < 12:
        raise ApiError("Your new password must be at least 12 characters.")
    if new != confirm:
        raise ApiError("The new passwords do not match.")
    if not verify_password(current, g.user.password_hash):
        raise ApiError("Your current password is incorrect.")
    g.user.password_hash = hash_password(new)
    g.user.must_change_password = False
    db.session.commit()
    return ok(message="Your password has been changed.", user=user_payload(g.user))
