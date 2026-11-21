"""Hospital-admin workspace: staff accounts and the service price list."""
from flask import Blueprint, g
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import STAFF_ROLES, ServiceCatalog, User
from ..security import hash_password
from ..utils import EMAIL_RE, ApiError, auth, body, from_cents, iso, money, ok, org_id, temp_password, text, to_cents

bp = Blueprint("admin", __name__)


def staff_row(u: User) -> dict:
    return {"id": u.id, "name": u.name, "email": u.email, "role": u.role, "is_active": bool(u.is_active),
            "must_change_password": bool(u.must_change_password), "created_at": iso(u.created_at)}


def service_row(s: ServiceCatalog) -> dict:
    return {"id": s.id, "name": s.name, "unit_price": money(s.unit_price), "is_active": bool(s.is_active)}


@bp.get("/admin/overview")
@auth(["admin"])
def overview():
    oid = org_id()
    staff = User.query.filter_by(organization_id=oid).order_by(User.is_active.desc(), User.role, User.name).all()
    services = ServiceCatalog.query.filter_by(organization_id=oid).order_by(ServiceCatalog.is_active.desc(), ServiceCatalog.name).all()
    return ok(staff=[staff_row(u) for u in staff], services=[service_row(s) for s in services],
              active_admins=sum(1 for u in staff if u.role == "admin" and u.is_active))


@bp.post("/admin/staff")
@auth(["admin"])
def create_staff():
    data = body()
    name = text(data, "name", "Staff name", 160)
    email = text(data, "email", "Email", 190).lower()
    role = text(data, "role", "Role", 20)
    if not EMAIL_RE.match(email) or role not in STAFF_ROLES:
        raise ApiError("Enter a valid email address and staff role.")
    if User.query.filter(db.func.lower(User.email) == email).first():
        raise ApiError("An account already uses that email address.", 409)
    password = temp_password()
    db.session.add(User(organization_id=org_id(), name=name, email=email, role=role,
                        password_hash=hash_password(password), must_change_password=True))
    db.session.commit()
    return ok(message=f"Account created for {email}.", temporary_password=password), 201


@bp.post("/admin/staff/<int:user_id>/deactivate")
@auth(["admin"])
def deactivate_staff(user_id):
    if user_id == g.user.id:
        raise ApiError("You cannot deactivate your own account.")
    u = User.query.filter_by(id=user_id, organization_id=org_id()).first()
    if not u or not u.is_active:
        raise ApiError("That active staff account could not be found.", 404)
    if u.role == "admin":
        admins = User.query.filter_by(organization_id=org_id(), role="admin", is_active=True).count()
        if admins <= 1:
            raise ApiError("The last active admin account cannot be deactivated.")
    u.is_active = False
    db.session.commit()
    return ok(message="Staff account deactivated.")


def _service_fields(data: dict):
    name = text(data, "name", "Service name", 200)
    cents = to_cents(text(data, "unit_price", "Service price", 20))
    if cents < 1:
        raise ApiError("Service price must be greater than zero.")
    active = data.get("is_active", True)
    if active not in (True, False, 0, 1, "0", "1"):
        raise ApiError("Select a valid service status.")
    return name, from_cents(cents), active in (True, 1, "1")


@bp.post("/admin/services")
@auth(["admin"])
def add_service():
    name, price, active = _service_fields(body())
    try:
        db.session.add(ServiceCatalog(organization_id=org_id(), name=name, unit_price=price, is_active=active))
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError("A service with that name already exists in your price list.", 409)
    return ok(message="Service added to your price list."), 201


@bp.put("/admin/services/<int:service_id>")
@auth(["admin"])
def update_service(service_id):
    s = ServiceCatalog.query.filter_by(id=service_id, organization_id=org_id()).first()
    if not s:
        raise ApiError("That service could not be found in your price list.", 404)
    s.name, s.unit_price, s.is_active = _service_fields(body())
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError("A service with that name already exists in your price list.", 409)
    return ok(message="Service price list updated.")
