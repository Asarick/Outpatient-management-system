"""Platform-admin workspace: review hospital applications, read inquiries, manage FAQs."""
import os
from datetime import datetime

from flask import Blueprint, current_app, g, request, send_file

from ..extensions import db
from ..models import Faq, HospitalApplication, Inquiry, User
from ..services import provision_organization
from ..utils import ApiError, auth, body, iso, ok, text

bp = Blueprint("applications", __name__)
PLATFORM = ["platform_admin"]


def application_row(a: HospitalApplication, detail: bool = False) -> dict:
    row = {"id": a.id, "reference": a.reference, "status": a.status, "facility_name": a.facility_name,
           "facility_type": a.facility_type, "county": a.county, "town": a.town, "admin_name": a.admin_name,
           "admin_email": a.admin_email, "license_number": a.license_number, "created_at": iso(a.created_at)}
    if detail:
        row.update({
            "ownership": a.ownership, "year_established": a.year_established, "services": a.services,
            "staff_estimate": a.staff_estimate, "address": a.address, "phone": a.phone, "email": a.email,
            "website": a.website, "licensing_body": a.licensing_body, "license_expiry": iso(a.license_expiry),
            "has_document": bool(a.license_document), "document_name": a.license_document_name,
            "admin_title": a.admin_title, "admin_phone": a.admin_phone, "review_note": a.review_note,
            "reviewed_at": iso(a.reviewed_at), "organization_id": a.organization_id,
        })
    return row


def _get_application(app_id: int) -> HospitalApplication:
    a = db.session.get(HospitalApplication, app_id)
    if not a:
        raise ApiError("That application could not be found.", 404)
    return a


# ---------------------------------------------------------------- applications
@bp.get("/platform/applications")
@auth(PLATFORM)
def list_applications():
    q = HospitalApplication.query
    status = request.args.get("status")
    if status in ("pending", "approved", "rejected"):
        q = q.filter_by(status=status)
    rows = q.order_by(HospitalApplication.created_at.desc(), HospitalApplication.id.desc()).all()
    counts = dict(db.session.query(HospitalApplication.status, db.func.count(HospitalApplication.id))
                  .group_by(HospitalApplication.status).all())
    return ok(applications=[application_row(a) for a in rows],
              counts={s: int(counts.get(s, 0)) for s in ("pending", "approved", "rejected")})


@bp.get("/platform/applications/<int:app_id>")
@auth(PLATFORM)
def application_detail(app_id):
    return ok(application=application_row(_get_application(app_id), detail=True))


@bp.get("/platform/applications/<int:app_id>/document")
@auth(PLATFORM)
def application_document(app_id):
    a = _get_application(app_id)
    if not a.license_document:
        raise ApiError("No licence document was uploaded.", 404)
    path = os.path.join(current_app.config["UPLOAD_DIR"], "applications", os.path.basename(a.license_document))
    if not os.path.isfile(path):
        raise ApiError("The uploaded file is missing from storage.", 404)
    return send_file(path, download_name=a.license_document_name or a.license_document)


@bp.post("/platform/applications/<int:app_id>/approve")
@auth(PLATFORM)
def approve_application(app_id):
    a = _get_application(app_id)
    if a.status != "pending":
        raise ApiError("This application has already been reviewed.", 409)
    if User.query.filter(db.func.lower(User.email) == a.admin_email.lower()).first():
        raise ApiError("An account already uses the administrator's email address, so this cannot be approved as is.", 409)
    note = text(body() if request.data else {}, "note", "Note", 1000, required=False)
    org, _ = provision_organization(
        name=a.facility_name, admin_name=a.admin_name, admin_email=a.admin_email,
        password_hash=a.admin_password_hash, must_change_password=False,  # they already chose their own password
        org_email=a.email, phone=a.phone, address=f"{a.address}, {a.town}, {a.county}"[:500])
    a.status, a.reviewed_by, a.reviewed_at = "approved", g.user.id, datetime.now()
    a.review_note, a.organization_id, a.admin_password_hash = note or None, org.id, None
    db.session.commit()
    return ok(message=f"{a.facility_name} approved. The administrator can now sign in with the password they chose.")


@bp.post("/platform/applications/<int:app_id>/reject")
@auth(PLATFORM)
def reject_application(app_id):
    a = _get_application(app_id)
    if a.status != "pending":
        raise ApiError("This application has already been reviewed.", 409)
    note = text(body(), "note", "Reason for declining", 1000)
    a.status, a.reviewed_by, a.reviewed_at = "rejected", g.user.id, datetime.now()
    a.review_note, a.admin_password_hash = note, None
    db.session.commit()
    return ok(message="Application declined. The applicant will see your reason on the status page.")


# ------------------------------------------------------------------- inquiries
def inquiry_row(i: Inquiry) -> dict:
    return {"id": i.id, "name": i.name, "email": i.email, "subject": i.subject, "message": i.message,
            "status": i.status, "admin_note": i.admin_note, "created_at": iso(i.created_at),
            "handled_at": iso(i.handled_at)}


@bp.get("/platform/inquiries")
@auth(PLATFORM)
def list_inquiries():
    q = Inquiry.query
    status = request.args.get("status")
    if status in ("new", "read", "resolved"):
        q = q.filter_by(status=status)
    rows = q.order_by(Inquiry.created_at.desc(), Inquiry.id.desc()).limit(500).all()
    counts = dict(db.session.query(Inquiry.status, db.func.count(Inquiry.id)).group_by(Inquiry.status).all())
    return ok(inquiries=[inquiry_row(i) for i in rows], counts={s: int(counts.get(s, 0)) for s in ("new", "read", "resolved")})


@bp.put("/platform/inquiries/<int:inquiry_id>")
@auth(PLATFORM)
def update_inquiry(inquiry_id):
    i = db.session.get(Inquiry, inquiry_id)
    if not i:
        raise ApiError("That inquiry could not be found.", 404)
    data = body()
    status = data.get("status", i.status)
    if status not in ("new", "read", "resolved"):
        raise ApiError("Select a valid status.")
    i.status = status
    i.admin_note = text(data, "admin_note", "Note", 1000, required=False) or None
    i.handled_by, i.handled_at = g.user.id, datetime.now()
    db.session.commit()
    return ok(message="Inquiry updated.", inquiry=inquiry_row(i))


@bp.delete("/platform/inquiries/<int:inquiry_id>")
@auth(PLATFORM)
def delete_inquiry(inquiry_id):
    i = db.session.get(Inquiry, inquiry_id)
    if not i:
        raise ApiError("That inquiry could not be found.", 404)
    db.session.delete(i)
    db.session.commit()
    return ok(message="Inquiry deleted.")


# ------------------------------------------------------------------------ FAQs
def faq_row(f: Faq) -> dict:
    return {"id": f.id, "category": f.category, "question": f.question, "answer": f.answer,
            "sort_order": f.sort_order, "is_published": bool(f.is_published)}


def _faq_fields(data: dict):
    published = data.get("is_published", True)
    if published not in (True, False, 0, 1):
        raise ApiError("Select a valid published status.")
    order = data.get("sort_order", 0)
    try:
        order = int(order)
    except (TypeError, ValueError):
        raise ApiError("Sort order must be a whole number.")
    return (text(data, "category", "Category", 60), text(data, "question", "Question", 300),
            text(data, "answer", "Answer", 4000), order, bool(published))


@bp.get("/platform/faqs")
@auth(PLATFORM)
def list_faqs():
    rows = Faq.query.order_by(Faq.sort_order, Faq.id).all()
    return ok(faqs=[faq_row(f) for f in rows])


@bp.post("/platform/faqs")
@auth(PLATFORM)
def add_faq():
    category, question, answer, order, published = _faq_fields(body())
    db.session.add(Faq(category=category, question=question, answer=answer, sort_order=order, is_published=published))
    db.session.commit()
    return ok(message="FAQ added."), 201


@bp.put("/platform/faqs/<int:faq_id>")
@auth(PLATFORM)
def update_faq(faq_id):
    f = db.session.get(Faq, faq_id)
    if not f:
        raise ApiError("That FAQ could not be found.", 404)
    f.category, f.question, f.answer, f.sort_order, f.is_published = _faq_fields(body())
    db.session.commit()
    return ok(message="FAQ updated.")


@bp.delete("/platform/faqs/<int:faq_id>")
@auth(PLATFORM)
def delete_faq(faq_id):
    f = db.session.get(Faq, faq_id)
    if not f:
        raise ApiError("That FAQ could not be found.", 404)
    db.session.delete(f)
    db.session.commit()
    return ok(message="FAQ deleted.")
