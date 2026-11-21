from datetime import date

from flask import Blueprint, g
from sqlalchemy import func

from ..extensions import db
from ..models import Bill, BillItem, Consultation, Payment, ServiceCatalog, Visit
from ..utils import (ApiError, auth, body, cents_of, from_cents, integer, iso, money, ok, org_id, text, to_cents,
                     STATUS_LABELS)

bp = Blueprint("billing", __name__)

BILLERS = ("billing", "receptionist", "admin")


def paid_cents(bill_id: int) -> int:
    total = db.session.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.bill_id == bill_id).scalar()
    return cents_of(total)


@bp.get("/billing")
@auth(BILLERS)
def billing_overview():
    oid = org_id()
    ready = (Visit.query.join(Visit.patient).outerjoin(Consultation, Consultation.visit_id == Visit.id)
             .filter(Visit.organization_id == oid, Visit.status == "awaiting_billing")
             .order_by(Visit.created_at).all())
    ready_rows = [{"visit_id": v.id, "reason": v.reason, "created_at": iso(v.created_at), "full_name": v.patient.full_name,
                   "patient_number": v.patient.patient_number,
                   "diagnosis": v.consultation.diagnosis if v.consultation else None} for v in ready]

    services = ServiceCatalog.query.filter_by(organization_id=oid, is_active=True).order_by(ServiceCatalog.name).all()

    open_bills = (Bill.query.join(Visit, Visit.id == Bill.visit_id)
                  .filter(Visit.organization_id == oid, Bill.status.in_(["pending", "partial"]))
                  .order_by(Bill.created_at).all())
    bill_rows = []
    for b in open_bills:
        paid = paid_cents(b.id)
        total = cents_of(b.total_amount)
        bill_rows.append({
            "id": b.id, "visit_id": b.visit_id, "status": b.status, "created_at": iso(b.created_at),
            "full_name": b.visit.patient.full_name, "patient_number": b.visit.patient.patient_number,
            "total_amount": money(b.total_amount), "paid_amount": str(from_cents(paid)),
            "balance": str(from_cents(max(0, total - paid))),
            "item_summary": ", ".join(f"{i.quantity} × {i.description}" for i in b.items),
        })

    reports = (Visit.query.join(Consultation, Consultation.visit_id == Visit.id)
               .filter(Visit.organization_id == oid).order_by(Visit.created_at.desc()).limit(20).all())
    report_rows = [{"visit_id": v.id, "created_at": iso(v.created_at), "status": v.status,
                    "status_label": STATUS_LABELS.get(v.status), "full_name": v.patient.full_name,
                    "patient_number": v.patient.patient_number, "bill_status": v.bill.status if v.bill else None}
                   for v in reports]

    collected = (db.session.query(func.coalesce(func.sum(Payment.amount), 0))
                 .join(Bill, Bill.id == Payment.bill_id).join(Visit, Visit.id == Bill.visit_id)
                 .filter(Visit.organization_id == oid, func.date(Payment.created_at) == date.today()).scalar())

    return ok(ready=ready_rows,
              services=[{"id": s.id, "name": s.name, "unit_price": money(s.unit_price)} for s in services],
              bills=bill_rows, reports=report_rows, collected_today=money(collected))


@bp.post("/visits/<int:visit_id>/bill")
@auth(BILLERS)
def create_bill(visit_id):
    data = body()
    raw = data.get("items")
    if not isinstance(raw, list):
        raise ApiError("Bill line items are invalid.")
    items = []
    for entry in raw[:8]:
        if not isinstance(entry, dict):
            raise ApiError("Bill line items are invalid.")
        if entry.get("service_id") in (None, ""):
            continue
        sid = integer(entry.get("service_id"), "Service", 1, 2**62)
        qty = integer(entry.get("quantity"), "Quantity", 1, 999)
        items.append((sid, qty))
    if not items:
        raise ApiError("Add at least one bill item.")

    v = (Visit.query.filter_by(id=visit_id, organization_id=org_id(), status="awaiting_billing")
         .with_for_update().first())
    if not v:
        raise ApiError("This visit is no longer waiting for billing.", 409)

    bill = Bill(visit_id=v.id, status="pending", total_amount=0)
    db.session.add(bill)
    db.session.flush()
    total = 0
    for sid, qty in items:
        s = ServiceCatalog.query.filter_by(id=sid, organization_id=org_id(), is_active=True).with_for_update().first()
        if not s:
            raise ApiError("A selected service is no longer available. Refresh and try again.", 409)
        unit = cents_of(s.unit_price)
        line = unit * qty
        total += line
        if line > 9999999999 or total > 9999999999:
            raise ApiError("The bill exceeds the maximum supported amount.")
        db.session.add(BillItem(bill_id=bill.id, description=s.name, quantity=qty,
                                unit_price=from_cents(unit), line_total=from_cents(line)))
    bill.total_amount = from_cents(total)
    v.status = "awaiting_payment"
    db.session.commit()
    return ok(message="Bill created and is ready for payment.", bill_id=bill.id), 201


@bp.post("/bills/<int:bill_id>/payments")
@auth(BILLERS)
def process_payment(bill_id):
    data = body()
    amount = to_cents(text(data, "amount", "Payment amount", 20))
    method = text(data, "method", "Payment method", 20)
    reference = text(data, "reference", "Reference", 120, required=False)
    if method not in ("cash", "card", "insurance") or amount < 1:
        raise ApiError("Select a valid payment method and amount.")
    if method == "insurance" and not reference:
        raise ApiError("An insurance claim or reference number is required.")

    bill = (Bill.query.join(Visit, Visit.id == Bill.visit_id)
            .filter(Bill.id == bill_id, Visit.organization_id == org_id()).with_for_update().first())
    if not bill or bill.status == "paid":
        raise ApiError("This bill is already paid or could not be found.", 409)
    due = cents_of(bill.total_amount) - paid_cents(bill.id)
    if amount > due:
        raise ApiError("Payment cannot exceed the remaining balance.")
    db.session.add(Payment(bill_id=bill.id, received_by=g.user.id, amount=from_cents(amount),
                           method=method, reference=reference or None))
    bill.status = "paid" if amount == due else "partial"
    if bill.status == "paid":
        bill.visit.status = "completed"
    db.session.commit()
    return ok(message="Payment recorded successfully.", status=bill.status), 201
