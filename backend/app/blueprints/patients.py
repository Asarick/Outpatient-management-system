from datetime import date, datetime

from flask import Blueprint, g, request
from sqlalchemy import func

from ..extensions import db
from ..models import Patient, Visit
from ..utils import EMAIL_RE, ApiError, auth, body, integer, iso, ok, org_id, text

bp = Blueprint("patients", __name__)

HOSPITAL_ROLES = ("receptionist", "nurse", "doctor", "billing", "admin")


def patient_row(p: Patient, latest: Visit | None) -> dict:
    return {
        "id": p.id,
        "patient_number": p.patient_number,
        "full_name": p.full_name,
        "date_of_birth": iso(p.date_of_birth),
        "gender": p.gender,
        "phone": p.phone,
        "email": p.email,
        "visit_id": latest.id if latest else None,
        "visit_status": latest.status if latest else None,
        "visit_created": iso(latest.created_at) if latest else None,
    }


@bp.get("/patients")
@auth(HOSPITAL_ROLES)
def list_patients():
    q = (request.args.get("q") or "").strip()
    query = Patient.query.filter_by(organization_id=org_id())
    if q:
        like = f"%{q}%"
        query = query.filter(db.or_(Patient.full_name.like(like), Patient.patient_number.like(like), Patient.phone.like(like)))
    patients = query.order_by(Patient.created_at.desc(), Patient.id.desc()).limit(100).all()
    latest = {}
    if patients:
        for v in (Visit.query.filter(Visit.patient_id.in_([p.id for p in patients]))
                  .order_by(Visit.created_at, Visit.id).all()):
            latest[v.patient_id] = v  # ascending order -> last write is the latest
    return ok(patients=[patient_row(p, latest.get(p.id)) for p in patients], can_register=g.user.role == "receptionist")


@bp.post("/patients")
@auth(["receptionist"])
def register_patient():
    data = body()
    name = text(data, "name", "Patient name", 160)
    dob = text(data, "date_of_birth", "Date of birth", 10)
    gender = text(data, "gender", "Gender", 20)
    phone = text(data, "phone", "Phone", 40)
    email = text(data, "email", "Email", 190, required=False)
    address = text(data, "address", "Address", 500, required=False)
    reason = text(data, "reason", "Reason for visit", 500)
    if gender not in ("Female", "Male", "Other"):
        raise ApiError("Select a valid gender.")
    try:
        dob_date = datetime.strptime(dob, "%Y-%m-%d").date()
    except ValueError:
        raise ApiError("Enter a valid date of birth.")
    if dob_date > date.today():
        raise ApiError("Enter a valid date of birth.")
    if email and not EMAIL_RE.match(email):
        raise ApiError("Enter a valid email address.")

    p = Patient(organization_id=org_id(), full_name=name, date_of_birth=dob_date, gender=gender,
                phone=phone, email=email or None, address=address or None)
    db.session.add(p)
    db.session.flush()
    p.patient_number = f"VH-{p.id:08d}"
    v = Visit(patient_id=p.id, organization_id=org_id(), checked_in_by=g.user.id, reason=reason, status="checked_in")
    db.session.add(v)
    db.session.commit()
    return ok(message=f"Patient registered and checked in. Visit #{v.id} is ready for triage.", visit_id=v.id), 201


@bp.post("/patients/<int:patient_id>/check-in")
@auth(["receptionist"])
def check_in(patient_id):
    reason = text(body(), "reason", "Reason for visit", 500)
    p = Patient.query.filter_by(id=patient_id, organization_id=org_id()).first()
    if not p:
        raise ApiError("That patient could not be found.", 404)
    v = Visit(patient_id=p.id, organization_id=org_id(), checked_in_by=g.user.id, reason=reason, status="checked_in")
    db.session.add(v)
    db.session.commit()
    return ok(message=f"Patient checked in. Visit #{v.id} is ready for triage.", visit_id=v.id), 201
