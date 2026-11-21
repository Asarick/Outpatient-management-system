"""Platform-admin workspace: create and list hospitals (organizations)."""
from flask import Blueprint

from ..extensions import db
from ..models import Organization, User
from ..security import hash_password
from ..services import provision_organization
from ..utils import EMAIL_RE, ApiError, auth, body, iso, ok, temp_password, text

bp = Blueprint("platform", __name__)


@bp.get("/platform/organizations")
@auth(["platform_admin"])
def list_orgs():
    rows = (db.session.query(Organization, db.func.count(User.id),
                             db.func.sum(db.case(((User.role == "admin") & (User.is_active.is_(True)), 1), else_=0)))
            .outerjoin(User, User.organization_id == Organization.id)
            .group_by(Organization.id).order_by(Organization.created_at.desc(), Organization.id.desc()).all())
    return ok(organizations=[{"id": o.id, "name": o.name, "slug": o.slug, "email": o.email, "phone": o.phone,
                              "is_active": bool(o.is_active), "created_at": iso(o.created_at),
                              "staff_count": int(n or 0), "admin_count": int(a or 0)} for o, n, a in rows])


@bp.post("/platform/organizations")
@auth(["platform_admin"])
def create_org():
    data = body()
    name = text(data, "organization_name", "Organization name", 180)
    admin_name = text(data, "admin_name", "Organization admin name", 160)
    email = text(data, "admin_email", "Organization admin email", 190).lower()
    phone = text(data, "organization_phone", "Phone", 40, required=False)
    address = text(data, "organization_address", "Address", 500, required=False)
    if not EMAIL_RE.match(email):
        raise ApiError("Enter a valid organization admin email.")
    if User.query.filter(db.func.lower(User.email) == email).first():
        raise ApiError("An account already uses that email address.", 409)

    password = temp_password()
    org, _ = provision_organization(name=name, admin_name=admin_name, admin_email=email,
                                    password_hash=hash_password(password), must_change_password=True,
                                    phone=phone, address=address)
    db.session.commit()
    return ok(message=f"Organization created. Admin login: {email}.", temporary_password=password, slug=org.slug), 201
