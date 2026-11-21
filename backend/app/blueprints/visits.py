"""Visit queue, triage (nurse) and consultation (doctor)."""
import re
from datetime import date

from flask import Blueprint, g
from sqlalchemy import func

from ..extensions import db
from ..models import Consultation, Prescription, Triage, Visit
from ..utils import STATUS_LABELS, ApiError, auth, body, integer, iso, ok, org_id, text

bp = Blueprint("visits", __name__)

HOSPITAL_ROLES = ("receptionist", "nurse", "doctor", "billing", "admin")
ALL_ACTIVE = ["checked_in", "triaged", "awaiting_billing", "awaiting_payment"]


def queue_statuses(role: str, dashboard: bool = False) -> list[str]:
    if role == "nurse":
        return ["checked_in"]
    if role == "doctor":
        return ["triaged"]
    if dashboard and role in ("billing", "receptionist"):
        return ["awaiting_billing", "awaiting_payment"]
    return ALL_ACTIVE


def age_of(dob: date) -> int:
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def triage_row(t: Triage | None):
    if not t:
        return None
    return {
        "triage_level": t.triage_level,
        "temperature": str(t.temperature),
        "blood_pressure": t.blood_pressure,
        "heart_rate": t.heart_rate,
        "respiratory_rate": t.respiratory_rate,
        "oxygen_saturation": t.oxygen_saturation,
        "weight": str(t.weight) if t.weight is not None else None,
        "notes": t.notes,
        "created_at": iso(t.created_at),
    }


def visit_row(v: Visit, brief: bool = False) -> dict:
    p = v.patient
    row = {
        "id": v.id,
        "created_at": iso(v.created_at),
        "reason": v.reason,
        "status": v.status,
        "status_label": STATUS_LABELS.get(v.status, v.status),
        "full_name": p.full_name,
        "patient_number": p.patient_number,
        "triage_level": v.triage.triage_level if v.triage else None,
    }
    if not brief:
        row.update(patient_id=p.id, gender=p.gender, phone=p.phone, age=age_of(p.date_of_birth), triage=triage_row(v.triage))
    return row


@bp.get("/queue")
@auth(["receptionist", "nurse", "doctor", "billing", "admin"])
def queue():
    rows = (
        db.session.query(Visit)
        .outerjoin(Triage, Triage.visit_id == Visit.id)
        .filter(Visit.organization_id == org_id(), Visit.status.in_(queue_statuses(g.user.role)))
        .order_by(func.coalesce(Triage.triage_level, 6), Visit.created_at)
        .all()
    )
    return ok(visits=[visit_row(v) for v in rows], role=g.user.role)


def _locked_visit(visit_id: int, status: str) -> Visit:
    v = (Visit.query.filter_by(id=visit_id, organization_id=org_id(), status=status).with_for_update().first())
    return v


@bp.post("/visits/<int:visit_id>/triage")
@auth(["nurse"])
def save_triage(visit_id):
    data = body()
    try:
        level = integer(data.get("triage_level"), "Triage level", 1, 5)
        hr = integer(data.get("heart_rate"), "Heart rate", 1, 300)
        rr = integer(data.get("respiratory_rate"), "Respiratory rate", 1, 100)
        o2 = integer(data.get("oxygen_saturation"), "Oxygen saturation", 1, 100)
    except ApiError:
        raise ApiError("Enter valid vital signs and a triage level from 1 to 5.")
    temp = text(data, "temperature", "Temperature", 10)
    bp_value = text(data, "blood_pressure", "Blood pressure", 20)
    weight = text(data, "weight", "Weight", 10, required=False)
    notes = text(data, "notes", "Notes", 1000, required=False)
    if (not re.fullmatch(r"(?:[2-4]\d|50)(?:\.\d)?", temp)
            or not re.fullmatch(r"\d{2,3}/\d{2,3}", bp_value)
            or (weight and not re.fullmatch(r"\d{1,3}(?:\.\d)?", weight))):
        raise ApiError("Enter valid vital signs and a triage level from 1 to 5.")

    v = _locked_visit(visit_id, "checked_in")
    if not v:
        raise ApiError("This visit is no longer waiting for triage.", 409)
    db.session.add(Triage(visit_id=v.id, nurse_id=g.user.id, triage_level=level, temperature=temp,
                          blood_pressure=bp_value, heart_rate=hr, respiratory_rate=rr, oxygen_saturation=o2,
                          weight=weight or None, notes=notes or None))
    v.status = "triaged"
    db.session.commit()
    return ok(message="Vitals saved. The patient is now in the doctor queue.")


@bp.post("/visits/<int:visit_id>/consultation")
@auth(["doctor"])
def save_consultation(visit_id):
    data = body()
    notes = text(data, "notes", "Consultation notes", 5000)
    diagnosis = text(data, "diagnosis", "Diagnosis", 1000)
    raw = data.get("prescriptions") or []
    if not isinstance(raw, list):
        raise ApiError("Prescription details are invalid.")
    items = []
    for entry in raw[:5]:
        if not isinstance(entry, dict):
            raise ApiError("Prescription details are invalid.")
        med = text(entry, "medication", "Medication", 160, required=False)
        if not med:
            continue
        items.append((med, text(entry, "dosage", "Dosage", 100, False) or None,
                      text(entry, "frequency", "Frequency", 100, False) or None,
                      text(entry, "duration", "Duration", 100, False) or None,
                      text(entry, "instructions", "Instructions", 500, False) or None))

    v = _locked_visit(visit_id, "triaged")
    if not v:
        raise ApiError("This visit is no longer waiting for a consultation.", 409)
    c = Consultation(visit_id=v.id, doctor_id=g.user.id, notes=notes, diagnosis=diagnosis)
    db.session.add(c)
    db.session.flush()
    for med, dosage, freq, dur, ins in items:
        db.session.add(Prescription(consultation_id=c.id, medication=med, dosage=dosage, frequency=freq,
                                    duration=dur, instructions=ins))
    v.status = "awaiting_billing"
    db.session.commit()
    return ok(message="Consultation saved. The visit is now ready for billing.")
