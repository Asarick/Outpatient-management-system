"""Business operations shared by more than one blueprint."""
import re
import secrets
import unicodedata

from .extensions import db
from .models import Organization, ServiceCatalog, User
from .utils import DEFAULT_SERVICES


def provision_organization(*, name, admin_name, admin_email, password_hash, must_change_password,
                           org_email=None, phone=None, address=None):
    """Create a hospital workspace, its default price list and its first administrator.

    Does not commit - the caller owns the transaction. Used by the platform admin's manual
    create endpoint and by application approval, so both produce identical hospitals.
    """
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode() or name
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_name.lower()).strip("-")[:150] + "-" + secrets.token_hex(4)
    org = Organization(name=name, slug=slug, email=org_email or admin_email, phone=phone or None, address=address or None)
    db.session.add(org)
    db.session.flush()
    for service, price in DEFAULT_SERVICES:
        db.session.add(ServiceCatalog(organization_id=org.id, name=service, unit_price=price))
    user = User(organization_id=org.id, name=admin_name, email=admin_email, role="admin",
                password_hash=password_hash, must_change_password=must_change_password)
    db.session.add(user)
    db.session.flush()
    return org, user
