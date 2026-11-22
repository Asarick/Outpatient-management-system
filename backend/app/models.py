"""SQLAlchemy models. They mirror database/schema.sql exactly."""
from datetime import datetime

from .extensions import db

ROLES = ("platform_admin", "receptionist", "nurse", "doctor", "billing", "admin")
STAFF_ROLES = ("receptionist", "nurse", "doctor", "billing", "admin")
VISIT_STATUSES = ("checked_in", "triaged", "awaiting_billing", "awaiting_payment", "completed")


class TimestampMixin:
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)


class Organization(TimestampMixin, db.Model):
    __tablename__ = "organizations"
    id = db.Column(db.BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True)
    name = db.Column(db.String(180), nullable=False)
    slug = db.Column(db.String(180), nullable=False, unique=True)
    email = db.Column(db.String(190))
    phone = db.Column(db.String(40))
    address = db.Column(db.String(500))
    is_active = db.Column(db.Boolean, nullable=False, default=True)


class ServiceCatalog(TimestampMixin, db.Model):
    __tablename__ = "service_catalog"
    id = db.Column(db.BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True)
    organization_id = db.Column(db.ForeignKey("organizations.id"), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    __table_args__ = (db.UniqueConstraint("organization_id", "name", name="uq_service_catalog_organization_name"),)


class User(TimestampMixin, db.Model):
    __tablename__ = "users"
    id = db.Column(db.BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    email = db.Column(db.String(190), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    organization_id = db.Column(db.ForeignKey("organizations.id"))
    role = db.Column(db.Enum(*ROLES, name="user_role"), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    must_change_password = db.Column(db.Boolean, nullable=False, default=False)
    organization = db.relationship("Organization")


class Patient(TimestampMixin, db.Model):
    __tablename__ = "patients"
    id = db.Column(db.BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True)
    organization_id = db.Column(db.ForeignKey("organizations.id"), nullable=False)
    patient_number = db.Column(db.String(20), unique=True)
    full_name = db.Column(db.String(160), nullable=False, index=True)
    date_of_birth = db.Column(db.Date, nullable=False)
    gender = db.Column(db.Enum("Female", "Male", "Other", name="gender"), nullable=False)
    phone = db.Column(db.String(40), nullable=False, index=True)
    email = db.Column(db.String(190))
    address = db.Column(db.String(500))


class Visit(TimestampMixin, db.Model):
    __tablename__ = "visits"
    id = db.Column(db.BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True)
    patient_id = db.Column(db.ForeignKey("patients.id"), nullable=False)
    organization_id = db.Column(db.ForeignKey("organizations.id"), nullable=False)
    checked_in_by = db.Column(db.ForeignKey("users.id"), nullable=False)
    reason = db.Column(db.String(500), nullable=False)
    status = db.Column(db.Enum(*VISIT_STATUSES, name="visit_status"), nullable=False, default="checked_in")
    patient = db.relationship("Patient")
    triage = db.relationship("Triage", uselist=False, back_populates="visit")
    consultation = db.relationship("Consultation", uselist=False, back_populates="visit")
    bill = db.relationship("Bill", uselist=False, back_populates="visit")


class Triage(db.Model):
    __tablename__ = "triage"
    id = db.Column(db.BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True)
    visit_id = db.Column(db.ForeignKey("visits.id"), nullable=False, unique=True)
    nurse_id = db.Column(db.ForeignKey("users.id"), nullable=False)
    triage_level = db.Column(db.SmallInteger, nullable=False)
    temperature = db.Column(db.Numeric(4, 1), nullable=False)
    blood_pressure = db.Column(db.String(20), nullable=False)
    heart_rate = db.Column(db.SmallInteger, nullable=False)
    respiratory_rate = db.Column(db.SmallInteger, nullable=False)
    oxygen_saturation = db.Column(db.SmallInteger, nullable=False)
    weight = db.Column(db.Numeric(5, 1))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now)
    visit = db.relationship("Visit", back_populates="triage")


class Consultation(TimestampMixin, db.Model):
    __tablename__ = "consultations"
    id = db.Column(db.BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True)
    visit_id = db.Column(db.ForeignKey("visits.id"), nullable=False, unique=True)
    doctor_id = db.Column(db.ForeignKey("users.id"), nullable=False)
    notes = db.Column(db.Text, nullable=False)
    diagnosis = db.Column(db.String(1000), nullable=False)
    visit = db.relationship("Visit", back_populates="consultation")
    doctor = db.relationship("User")
    prescriptions = db.relationship("Prescription", order_by="Prescription.id")


class Prescription(db.Model):
    __tablename__ = "prescriptions"
    id = db.Column(db.BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True)
    consultation_id = db.Column(db.ForeignKey("consultations.id"), nullable=False, index=True)
    medication = db.Column(db.String(160), nullable=False)
    dosage = db.Column(db.String(100))
    frequency = db.Column(db.String(100))
    duration = db.Column(db.String(100))
    instructions = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now)


class Bill(TimestampMixin, db.Model):
    __tablename__ = "bills"
    id = db.Column(db.BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True)
    visit_id = db.Column(db.ForeignKey("visits.id"), nullable=False, unique=True)
    status = db.Column(db.Enum("pending", "partial", "paid", name="bill_status"), nullable=False, default="pending")
    total_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    visit = db.relationship("Visit", back_populates="bill")
    items = db.relationship("BillItem", order_by="BillItem.id")
    payments = db.relationship("Payment", order_by="Payment.id")


class BillItem(db.Model):
    __tablename__ = "bill_items"
    id = db.Column(db.BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True)
    bill_id = db.Column(db.ForeignKey("bills.id"), nullable=False, index=True)
    description = db.Column(db.String(200), nullable=False)
    quantity = db.Column(db.SmallInteger, nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    line_total = db.Column(db.Numeric(10, 2), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now)


class Payment(db.Model):
    __tablename__ = "payments"
    id = db.Column(db.BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True)
    bill_id = db.Column(db.ForeignKey("bills.id"), nullable=False, index=True)
    received_by = db.Column(db.ForeignKey("users.id"), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    method = db.Column(db.Enum("cash", "card", "insurance", name="payment_method"), nullable=False)
    reference = db.Column(db.String(120))
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now, index=True)


APPLICATION_STATUSES = ("pending", "approved", "rejected")
INQUIRY_STATUSES = ("new", "read", "resolved")


class HospitalApplication(TimestampMixin, db.Model):
    __tablename__ = "hospital_applications"
    id = db.Column(db.BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True)
    reference = db.Column(db.String(20), nullable=False, unique=True)
    status = db.Column(db.Enum(*APPLICATION_STATUSES, name="application_status"), nullable=False, default="pending")

    facility_name = db.Column(db.String(180), nullable=False)
    facility_type = db.Column(db.String(40), nullable=False)
    ownership = db.Column(db.String(40), nullable=False)
    year_established = db.Column(db.SmallInteger)
    services = db.Column(db.String(1000))
    staff_estimate = db.Column(db.Integer)

    county = db.Column(db.String(80), nullable=False)
    town = db.Column(db.String(120), nullable=False)
    address = db.Column(db.String(500), nullable=False)
    phone = db.Column(db.String(40), nullable=False)
    email = db.Column(db.String(190), nullable=False)
    website = db.Column(db.String(255))

    license_number = db.Column(db.String(80), nullable=False, index=True)
    licensing_body = db.Column(db.String(160), nullable=False)
    license_expiry = db.Column(db.Date, nullable=False)
    license_document = db.Column(db.String(255))
    license_document_name = db.Column(db.String(255))

    admin_name = db.Column(db.String(160), nullable=False)
    admin_title = db.Column(db.String(120), nullable=False)
    admin_email = db.Column(db.String(190), nullable=False, index=True)
    admin_phone = db.Column(db.String(40), nullable=False)
    admin_password_hash = db.Column(db.String(255))  # cleared as soon as the application is reviewed
    declaration_accepted = db.Column(db.Boolean, nullable=False, default=False)

    review_note = db.Column(db.String(1000))
    reviewed_by = db.Column(db.ForeignKey("users.id"))
    reviewed_at = db.Column(db.DateTime)
    organization_id = db.Column(db.ForeignKey("organizations.id"))


class Inquiry(TimestampMixin, db.Model):
    __tablename__ = "inquiries"
    id = db.Column(db.BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    email = db.Column(db.String(190), nullable=False)
    subject = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    status = db.Column(db.Enum(*INQUIRY_STATUSES, name="inquiry_status"), nullable=False, default="new")
    admin_note = db.Column(db.String(1000))
    handled_by = db.Column(db.ForeignKey("users.id"))
    handled_at = db.Column(db.DateTime)


class Faq(TimestampMixin, db.Model):
    __tablename__ = "faqs"
    id = db.Column(db.BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True)
    question = db.Column(db.String(300), nullable=False)
    answer = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(60), nullable=False, default="General")
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    is_published = db.Column(db.Boolean, nullable=False, default=True)
