"""Public, unauthenticated endpoints: FAQs, contact form, hospital application and application status."""
import os
import secrets
import re
from datetime import date, datetime

from flask import Blueprint, current_app, request

from ..extensions import db
from ..models import Faq, HospitalApplication, Inquiry, User
from ..security import hash_password
from ..utils import EMAIL_RE, ApiError, body, integer, iso, ok, rate_limit, text

bp = Blueprint("public", __name__)

FACILITY_TYPES = ("hospital", "clinic", "health_centre", "dispensary", "specialist_centre", "other")
OWNERSHIPS = ("public", "private", "faith_based", "ngo", "other")
PHONE_RE = re.compile(r"^\+?[0-9][0-9 ()-]{6,24}$")
MAX_DOC_BYTES = 5 * 1024 * 1024
# extension -> required leading bytes, so a renamed .exe cannot be uploaded as a licence
DOC_SIGNATURES = {".pdf": (b"%PDF",), ".png": (b"\x89PNG",), ".jpg": (b"\xff\xd8\xff",), ".jpeg": (b"\xff\xd8\xff",)}


@bp.get("/public/faqs")
def faqs():
    rows = Faq.query.filter_by(is_published=True).order_by(Faq.sort_order, Faq.id).all()
    return ok(faqs=[{"id": f.id, "category": f.category, "question": f.question, "answer": f.answer} for f in rows])


@bp.post("/public/inquiries")
def create_inquiry():
    rate_limit("inquiry", 5, 3600)
    data = body()
    if data.get("hp"):  # honeypot field: real visitors never fill it in
        return ok(message="Thank you. Your message has been received."), 201
    name = text(data, "name", "Your name", 160)
    email = text(data, "email", "Your email", 190).lower()
    subject = text(data, "subject", "Subject", 200)
    message = text(data, "message", "Message", 4000)
    if not EMAIL_RE.match(email):
        raise ApiError("Enter a valid email address.")
    if len(message) < 10:
        raise ApiError("Please write a little more so we can help.")
    db.session.add(Inquiry(name=name, email=email, subject=subject, message=message))
    db.session.commit()
    return ok(message="Thank you. Your message has been received and the VitalHub team will follow up by email."), 201


def _flag(value) -> bool:
    return str(value).strip().lower() in ("1", "true", "on", "yes")


def _save_document(file) -> tuple[str, str]:
    if not file or not file.filename:
        raise ApiError("Attach a copy of your facility licence (PDF, PNG or JPG).")
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in DOC_SIGNATURES:
        raise ApiError("The licence document must be a PDF, PNG or JPG file.")
    content = file.read(MAX_DOC_BYTES + 1)
    if len(content) > MAX_DOC_BYTES:
        raise ApiError("The licence document is larger than 5 MB.")
    if not content.startswith(DOC_SIGNATURES[ext]):
        raise ApiError("The licence document does not look like a valid " + ext[1:].upper() + " file.")
    folder = os.path.join(current_app.config["UPLOAD_DIR"], "applications")
    os.makedirs(folder, exist_ok=True)
    stored = secrets.token_hex(16) + ext
    with open(os.path.join(folder, stored), "wb") as fh:
        fh.write(content)
    return stored, os.path.basename(file.filename)[:255]


@bp.post("/public/applications")
def apply():
    """Multipart form: hospital details + licence document + the administrator's chosen password."""
    rate_limit("application", 5, 3600)
    data = request.form.to_dict()
    if data.get("hp"):
        raise ApiError("Your application could not be submitted.")

    facility_name = text(data, "facility_name", "Hospital name", 180)
    facility_type = text(data, "facility_type", "Facility type", 40)
    ownership = text(data, "ownership", "Ownership", 40)
    if facility_type not in FACILITY_TYPES or ownership not in OWNERSHIPS:
        raise ApiError("Select a valid facility type and ownership.")
    services = text(data, "services", "Services offered", 1000, required=False)
    year = None
    if data.get("year_established", "").strip():
        year = integer(data["year_established"], "Year established", 1850, date.today().year)
    staff = None
    if data.get("staff_estimate", "").strip():
        staff = integer(data["staff_estimate"], "Number of staff", 1, 100000)

    county = text(data, "county", "County", 80)
    town = text(data, "town", "Town or city", 120)
    address = text(data, "address", "Physical address", 500)
    phone = text(data, "phone", "Hospital phone", 40)
    email = text(data, "email", "Hospital email", 190).lower()
    website = text(data, "website", "Website", 255, required=False)
    if not PHONE_RE.match(phone) or not EMAIL_RE.match(email):
        raise ApiError("Enter a valid hospital phone number and email address.")
    if website and not website.lower().startswith(("http://", "https://")):
        raise ApiError("The website must start with http:// or https://.")

    license_number = text(data, "license_number", "Licence number", 80)
    licensing_body = text(data, "licensing_body", "Licensing body", 160)
    try:
        expiry = date.fromisoformat(text(data, "license_expiry", "Licence expiry date", 10))
    except ValueError:
        raise ApiError("Enter the licence expiry date as a valid date.")
    if expiry <= date.today():
        raise ApiError("The facility licence must still be valid. Check the expiry date.")

    admin_name = text(data, "admin_name", "Administrator full name", 160)
    admin_title = text(data, "admin_title", "Administrator job title", 120)
    admin_email = text(data, "admin_email", "Administrator email", 190).lower()
    admin_phone = text(data, "admin_phone", "Administrator phone", 40)
    if not EMAIL_RE.match(admin_email) or not PHONE_RE.match(admin_phone):
        raise ApiError("Enter a valid administrator email address and phone number.")
    password = data.get("password", "")
    if len(password) < 12 or len(password) > 1024:
        raise ApiError("Your password must be at least 12 characters.")
    if password != data.get("confirm_password", ""):
        raise ApiError("The passwords do not match.")
    if not _flag(data.get("declaration")):
        raise ApiError("Confirm the declaration to submit your application.")

    if User.query.filter(db.func.lower(User.email) == admin_email).first():
        raise ApiError("An account already uses that administrator email. Sign in instead, or use another email.", 409)
    clash = HospitalApplication.query.filter(
        HospitalApplication.status.in_(["pending", "approved"]),
        db.or_(db.func.lower(HospitalApplication.admin_email) == admin_email,
               db.func.lower(HospitalApplication.license_number) == license_number.lower())).first()
    if clash:
        raise ApiError("An application with that administrator email or licence number is already on file. "
                       "Use the application status page to check it.", 409)

    stored, original = _save_document(request.files.get("license_document"))
    reference = "VH-" + secrets.token_hex(4).upper()
    db.session.add(HospitalApplication(
        reference=reference, facility_name=facility_name, facility_type=facility_type, ownership=ownership,
        year_established=year, services=services or None, staff_estimate=staff, county=county, town=town,
        address=address, phone=phone, email=email, website=website or None, license_number=license_number,
        licensing_body=licensing_body, license_expiry=expiry, license_document=stored, license_document_name=original,
        admin_name=admin_name, admin_title=admin_title, admin_email=admin_email, admin_phone=admin_phone,
        admin_password_hash=hash_password(password), declaration_accepted=True))
    db.session.commit()
    return ok(message="Your application has been submitted.", reference=reference), 201


@bp.post("/public/applications/status")
def application_status():
    """POST (not GET) so the applicant's email never lands in URLs or access logs."""
    rate_limit("application-status", 10, 3600)
    data = body()
    reference = text(data, "reference", "Reference code", 20).upper()
    email = text(data, "email", "Administrator email", 190).lower()
    a = HospitalApplication.query.filter(HospitalApplication.reference == reference,
                                         db.func.lower(HospitalApplication.admin_email) == email).first()
    if not a:
        raise ApiError("No application matches that reference code and email.", 404)
    return ok(status=a.status, facility_name=a.facility_name, submitted_at=iso(a.created_at),
              reviewed_at=iso(a.reviewed_at), note=a.review_note if a.status == "rejected" else None)
