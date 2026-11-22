import os
from datetime import timedelta

import click
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_jwt_extended.exceptions import JWTExtendedException
from jwt.exceptions import PyJWTError
from sqlalchemy.exc import IntegrityError

from .extensions import cors, db, jwt
from .security import hash_password
from .utils import ApiError, temp_password

load_dotenv()


def database_uri() -> str:
    if os.getenv("DATABASE_URL"):  
        return os.environ["DATABASE_URL"]
    user = os.getenv("DB_USER", "root")
    password = os.getenv("DB_PASSWORD", "")
    host = os.getenv("DB_HOST", "127.0.0.1")
    port = os.getenv("DB_PORT", "3306")
    name = os.getenv("DB_NAME", "vitalhub")
    from urllib.parse import quote_plus

    return f"mysql+pymysql://{quote_plus(user)}:{quote_plus(password)}@{host}:{port}/{name}?charset=utf8mb4"


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.update(
        SQLALCHEMY_DATABASE_URI=database_uri(),
        SQLALCHEMY_ENGINE_OPTIONS={"pool_pre_ping": True},
        JWT_SECRET_KEY=os.getenv("JWT_SECRET_KEY", "dev-only-change-me-please-32-bytes-min!"),
        JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=int(os.getenv("JWT_EXPIRES_HOURS", "8"))),
        JSON_SORT_KEYS=False,
        MAX_CONTENT_LENGTH=6 * 1024 * 1024,  
        UPLOAD_DIR=os.getenv("UPLOAD_DIR", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")),
        RATE_LIMIT_ENABLED=True,
    )
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")}})

    from .blueprints import admin, applications, auth, billing, dashboard, patients, platform, public, reports, visits

    for module in (auth, dashboard, patients, visits, billing, reports, admin, platform, applications, public):
        app.register_blueprint(module.bp, url_prefix="/api")

    @app.errorhandler(ApiError)
    def api_error(e):
        return jsonify(error=e.message), e.status

    @app.errorhandler(IntegrityError)
    def integrity(e):
        db.session.rollback()
        return jsonify(error="That record conflicts with an existing one."), 409

    @app.errorhandler(413)
    def too_large(_):
        return jsonify(error="That upload is too large. The licence document must be under 5 MB."), 413

    @app.errorhandler(404)
    def not_found(_):
        return jsonify(error="Not found."), 404

    @app.errorhandler(405)
    def not_allowed(_):
        return jsonify(error="Method not allowed."), 405

    @app.errorhandler(Exception)
    def unhandled(e):
        if isinstance(e, (JWTExtendedException, PyJWTError)):
            return jsonify(error="Please sign in again."), 401
        db.session.rollback()
        app.logger.exception(e)
        return jsonify(error="Something went wrong on the server."), 500

    @jwt.unauthorized_loader
    @jwt.invalid_token_loader
    def bad_token(reason):
        return jsonify(error="Please sign in again."), 401

    @jwt.expired_token_loader
    def expired(_h, _p):
        return jsonify(error="Your session expired. Please sign in again."), 401

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    register_cli(app)
    return app


def register_cli(app: Flask) -> None:
    @app.cli.command("init-db")
    def init_db():
        """Create tables from the models (alternative to importing database/schema.sql)."""
        db.create_all()
        click.echo("Tables created.")

    @app.cli.command("seed-faqs")
    def seed_faqs():
        """Insert the starter FAQs (only if there are none yet)."""
        from .seed import seed_default_faqs

        click.echo(f"Inserted {seed_default_faqs()} FAQs.")

    @app.cli.command("create-platform-admin")
    @click.argument("email", default="platform@vitalhub.local")
    def create_platform_admin(email):
        """Equivalent of `php bin/create-admin.php`."""
        from .models import User

        if User.query.filter_by(email=email).first():
            raise click.ClickException(f"An account already uses {email}. No account was changed.")
        password = temp_password()
        db.session.add(User(name="VitalHub Platform Administrator", email=email, role="platform_admin",
                            organization_id=None, must_change_password=True, password_hash=hash_password(password)))
        db.session.commit()
        click.echo("VitalHub platform administrator created.")
        click.echo(f"Login email: {email}")
        click.echo(f"Temporary password (shown once): {password}")
        click.echo("You must change this password at first sign-in.")

    @app.cli.command("create-user")
    @click.argument("org_slug")
    @click.argument("name")
    @click.argument("email")
    @click.argument("role", type=click.Choice(["receptionist", "nurse", "doctor", "billing", "admin"]))
    def create_user(org_slug, name, email, role):
        """Equivalent of `php bin/create-user.php`."""
        from .models import Organization, User

        org = Organization.query.filter_by(slug=org_slug, is_active=True).first()
        if not org:
            raise click.ClickException("Organization not found.")
        if User.query.filter_by(email=email).first():
            raise click.ClickException(f"An account already uses {email}.")
        password = temp_password()
        db.session.add(User(organization_id=org.id, name=name, email=email, role=role,
                            must_change_password=True, password_hash=hash_password(password)))
        db.session.commit()
        click.echo(f"Account created for {email}. Temporary password (shown once): {password}")
