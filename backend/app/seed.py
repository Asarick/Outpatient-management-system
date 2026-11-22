"""Starter FAQ content. Seeded once with:  flask --app run seed-faqs  (platform admins can edit it afterwards)."""
from .extensions import db
from .models import Faq

DEFAULT_FAQS = [
    ("About VitalHub", "What is VitalHub?",
     "VitalHub is an outpatient hospital management platform. It connects registration, triage, consultation, "
     "prescriptions and billing in one live workflow so every team member sees the same visit."),
    ("About VitalHub", "Who is VitalHub for?",
     "Hospitals and clinics that run outpatient services: receptionists, nurses, doctors, billing staff and the "
     "hospital administrators who manage them."),
    ("How it works", "How does a patient visit move through VitalHub?",
     "The receptionist registers the patient and checks them in. A nurse records vitals and a triage level from 1 to 5. "
     "The doctor records the consultation and prescriptions. Billing then raises an itemised bill and records payment, "
     "and a printable visit report is available."),
    ("How it works", "Which roles can my hospital use?",
     "Each hospital has receptionist, nurse, doctor, billing and administrator roles. Staff only see the pages their role needs."),
    ("How it works", "Can we set our own prices?",
     "Yes. Each hospital administrator manages their own service price list in Kenya shillings. Bills are built from that list."),
    ("Registering a hospital", "How do I get an account for my hospital?",
     "Select Apply on the website and complete the hospital application, including your licence details and a copy of "
     "your licence. The VitalHub team reviews every application before an account is created."),
    ("Registering a hospital", "How long does approval take, and how will I know the result?",
     "Use the reference code you receive after applying, together with your administrator email, on the application status "
     "page to see whether your application is pending, approved or declined."),
    ("Registering a hospital", "How do I sign in after approval?",
     "Once approved, sign in with the administrator email and the password you chose when you applied."),
    ("Security and data", "Can other hospitals see our patient records?",
     "No. Every hospital has its own separate workspace, staff directory and patient records. Platform administrators "
     "manage hospital accounts but do not see clinical records."),
    ("Security and data", "What happens if a staff member leaves?",
     "Your hospital administrator can deactivate their account so they can no longer sign in."),
]


def seed_default_faqs() -> int:
    """Insert the starter FAQs if the table is empty. Returns the number inserted."""
    if Faq.query.count():
        return 0
    for i, (category, question, answer) in enumerate(DEFAULT_FAQS, start=1):
        db.session.add(Faq(category=category, question=question, answer=answer, sort_order=i * 10))
    db.session.commit()
    return len(DEFAULT_FAQS)
