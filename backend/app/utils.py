"""Shared helpers: validation, money, auth decorators, serializers."""
import re
import secrets
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from functools import wraps

from flask import g, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from .extensions import db
from .models import User

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

DEFAULT_SERVICES = [
    ("General outpatient consultation", "1500.00"),
    ("Specialist consultation", "3000.00"),
    ("Follow-up consultation", "1000.00"),
    ("Psychiatrist consultation", "7000.00"),
    ("Nursing assessment and triage", "500.00"),
    ("Injection administration", "300.00"),
    ("Wound dressing", "800.00"),
    ("Nebulization treatment", "1000.00"),
    ("Complete blood count (CBC)", "1500.00"),
    ("Blood glucose test", "300.00"),
    ("Urinalysis", "500.00"),
    ("Malaria rapid test", "500.00"),
    ("ECG", "1500.00"),
]

STATUS_LABELS = {
    "checked_in": "Waiting for triage",
    "triaged": "Waiting for doctor",
    "awaiting_billing": "Ready for billing",
    "awaiting_payment": "Payment due",
    "completed": "Completed",
}


class ApiError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


def temp_password() -> str:
    return secrets.token_urlsafe(24)


def body() -> dict:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("Send a JSON body.")
    return data


def text(data: dict, key: str, label: str, max_len: int = 500, required: bool = True) -> str:
    value = data.get(key, "")
    if value is None:
        value = ""
    if not isinstance(value, str):
        raise ApiError("One of the submitted fields is invalid.")
    value = value.strip()
    if len(value) > max_len:
        raise ApiError(f"{label} is too long.")
    if required and not value:
        raise ApiError(f"{label} is required.")
    return value


def integer(value, label: str, lo: int, hi: int) -> int:
    try:
        if isinstance(value, bool) or (isinstance(value, float) and not value.is_integer()):
            raise ValueError
        number = int(str(value).strip())
    except (TypeError, ValueError):
        raise ApiError(f"{label} is invalid.")
    if number < lo or number > hi:
        raise ApiError(f"{label} is out of range.")
    return number


def to_cents(value) -> int:
    value = str(value).strip()
    if not re.fullmatch(r"\d{1,8}(\.\d{1,2})?", value):
        raise ApiError("Enter a valid amount with up to two decimal places.")
    whole, _, frac = value.partition(".")
    return int(whole) * 100 + int(frac.ljust(2, "0") or 0)


def from_cents(cents: int) -> Decimal:
    return (Decimal(cents) / 100).quantize(Decimal("0.01"))


def cents_of(value) -> int:
    try:
        return int((Decimal(str(value)) * 100).to_integral_value())
    except InvalidOperation:
        return 0


def money(value) -> str:
    return str(Decimal(str(value or 0)).quantize(Decimal("0.01")))


def iso(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def user_payload(u: User) -> dict:
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "organization_id": u.organization_id,
        "organization_name": u.organization.name if u.organization else None,
        "must_change_password": bool(u.must_change_password),
    }


def _load_user():
    """Equivalent of vh_refresh_session_user(): re-check the account on every request."""
    u = db.session.get(User, int(get_jwt_identity()))
    if not u or not u.is_active:
        raise ApiError("Your account or organization is inactive. Contact your platform administrator.", 401)
    if u.role == "platform_admin":
        if u.organization_id is not None:
            raise ApiError("Your account or organization is inactive. Contact your platform administrator.", 401)
    elif u.organization_id is None or not u.organization or not u.organization.is_active:
        raise ApiError("Your account or organization is inactive. Contact your platform administrator.", 401)
    return u


def auth(roles=None, allow_password_change=False):
    """Require a valid JWT, an active account and (optionally) one of `roles`."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user = _load_user()
            if user.must_change_password and not allow_password_change:
                raise ApiError("You must change your temporary password first.", 403)
            if roles and user.role not in roles:
                raise ApiError("You do not have permission to perform this action.", 403)
            g.user = user
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def org_id() -> int:
    if g.user.organization_id is None:
        raise ApiError("This action requires an organization account.", 403)
    return g.user.organization_id


def ok(payload=None, **extra):
    data = dict(payload or {})
    data.update(extra)
    return jsonify(data)


_HITS: dict = {}


def rate_limit(bucket: str, limit: int, window_seconds: int) -> None:
    """Tiny in-memory per-IP limiter for public forms (per process; use a shared store behind many workers)."""
    from flask import current_app

    if not current_app.config.get("RATE_LIMIT_ENABLED", True):
        return
    import time

    now = time.time()
    key = (bucket, request.remote_addr or "unknown")
    hits = [t for t in _HITS.get(key, []) if now - t < window_seconds]
    if len(hits) >= limit:
        raise ApiError("Too many requests from this device. Please wait a while and try again.", 429)
    hits.append(now)
    _HITS[key] = hits
