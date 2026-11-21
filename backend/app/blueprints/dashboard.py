from datetime import date

from flask import Blueprint, g
from sqlalchemy import func

from ..extensions import db
from ..models import Bill, Patient, Triage, Visit
from ..utils import STATUS_LABELS, auth, ok, org_id
from .visits import queue_statuses, visit_row

bp = Blueprint("dashboard", __name__)

HOSPITAL_ROLES = ("receptionist", "nurse", "doctor", "billing", "admin")


@bp.get("/dashboard")
@auth(HOSPITAL_ROLES)
def dashboard():
    oid = org_id()
    today = date.today()
    counts = {
        "patients": Patient.query.filter_by(organization_id=oid).count(),
        "today_visits": Visit.query.filter(Visit.organization_id == oid, func.date(Visit.created_at) == today).count(),
        "active_queue": Visit.query.filter(Visit.organization_id == oid, Visit.status.in_(["checked_in", "triaged"])).count(),
        "open_bills": db.session.query(Bill).join(Visit, Visit.id == Bill.visit_id)
        .filter(Visit.organization_id == oid, Bill.status.in_(["pending", "partial"])).count(),
    }
    rows = (
        db.session.query(Visit)
        .outerjoin(Triage, Triage.visit_id == Visit.id)
        .filter(Visit.organization_id == oid, Visit.status.in_(queue_statuses(g.user.role, dashboard=True)))
        .order_by(func.coalesce(Triage.triage_level, 6), Visit.created_at)
        .limit(6)
        .all()
    )
    return ok(counts=counts, queue=[visit_row(v, brief=True) for v in rows], status_labels=STATUS_LABELS)
