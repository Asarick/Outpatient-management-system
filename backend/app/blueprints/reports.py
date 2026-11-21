from flask import Blueprint

from ..models import Visit
from ..utils import STATUS_LABELS, ApiError, auth, cents_of, from_cents, iso, money, ok, org_id
from .billing import paid_cents
from .visits import age_of, triage_row

bp = Blueprint("reports", __name__)


@bp.get("/visits/<int:visit_id>/report")
@auth(["receptionist", "nurse", "doctor", "billing", "admin"])
def visit_report(visit_id):
    v = Visit.query.filter_by(id=visit_id, organization_id=org_id()).first()
    if not v:
        raise ApiError("The visit report is unavailable.", 404)
    p, c, b = v.patient, v.consultation, v.bill
    data = {
        "organization_name": v.patient and p.organization_id and _org_name(v),
        "visit": {"id": v.id, "created_at": iso(v.created_at), "reason": v.reason, "status": v.status,
                  "status_label": STATUS_LABELS.get(v.status)},
        "patient": {"full_name": p.full_name, "patient_number": p.patient_number, "gender": p.gender,
                    "age": age_of(p.date_of_birth), "phone": p.phone, "email": p.email},
        "triage": triage_row(v.triage),
        "consultation": None,
        "prescriptions": [],
        "bill": None,
    }
    if c:
        data["consultation"] = {"doctor_name": c.doctor.name if c.doctor else None, "diagnosis": c.diagnosis,
                                "notes": c.notes, "created_at": iso(c.created_at)}
        data["prescriptions"] = [{"medication": x.medication, "dosage": x.dosage, "frequency": x.frequency,
                                  "duration": x.duration, "instructions": x.instructions} for x in c.prescriptions]
    if b:
        paid = paid_cents(b.id)
        total = cents_of(b.total_amount)
        data["bill"] = {
            "status": b.status, "total_amount": money(b.total_amount), "paid_amount": str(from_cents(paid)),
            "balance": str(from_cents(max(0, total - paid))),
            "items": [{"description": i.description, "quantity": i.quantity, "unit_price": money(i.unit_price),
                       "line_total": money(i.line_total)} for i in b.items],
            "payments": [{"amount": money(x.amount), "method": x.method, "reference": x.reference,
                          "created_at": iso(x.created_at)} for x in b.payments],
        }
    return ok(data)


def _org_name(v: Visit) -> str:
    from ..extensions import db
    from ..models import Organization

    return db.session.get(Organization, v.organization_id).name
