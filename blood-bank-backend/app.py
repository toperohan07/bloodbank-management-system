"""Flask entry point for the Blood Bank and Donor Management System backend."""
import logging
import re
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from flask import Flask
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS
from mysql.connector import errors as mysql_errors
from werkzeug.exceptions import HTTPException

from config import Config
from db import DatabaseUnavailable, fetch_one
from utils.response import ApiError, error, success

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("bloodbank")


class JsonProvider(DefaultJSONProvider):
    """Dates become 'YYYY-MM-DD' and DECIMAL (from SUM/AVG) becomes a number."""

    @staticmethod
    def default(o):
        if isinstance(o, (datetime, date)):
            return o.isoformat()
        if isinstance(o, (time, timedelta)):
            return str(o)
        if isinstance(o, Decimal):
            return int(o) if o == o.to_integral_value() else float(o)
        return DefaultJSONProvider.default(o)


def create_app():
    app = Flask(__name__)
    app.json = JsonProvider(app)
    app.json.sort_keys = False
    origins = [o.strip() for o in Config.CORS_ORIGINS.split(",")]
    CORS(app, resources={r"/*": {"origins": origins if origins != ["*"] else "*"}})

    register_blueprints(app)
    register_error_handlers(app)
    register_general_routes(app)
    return app


def register_blueprints(app):
    from routes.bloodbank_routes import bp as bloodbank_bp
    from routes.bloodissue_routes import bp as bloodissue_bp
    from routes.bloodrequest_routes import bp as bloodrequest_bp
    from routes.bloodtest_routes import bp as bloodtest_bp
    from routes.dashboard_routes import bp as dashboard_bp
    from routes.donation_routes import bp as donation_bp
    from routes.donor_routes import bp as donor_bp
    from routes.hospital_routes import bp as hospital_bp
    from routes.inventory_routes import bp as inventory_bp
    from routes.patient_routes import bp as patient_bp
    from routes.staff_routes import bp as staff_bp

    for bp in (donor_bp, donation_bp, inventory_bp, bloodbank_bp, hospital_bp, patient_bp,
               staff_bp, bloodrequest_bp, bloodissue_bp, bloodtest_bp, dashboard_bp):
        app.register_blueprint(bp)


def register_general_routes(app):
    @app.get("/")
    def root():
        return success("Backend is running", {
            "app": Config.APP_NAME, "status": "running", "version": Config.API_VERSION,
        })

    @app.get("/api/health")
    def health():
        fetch_one("SELECT 1 AS ok")  # raises DatabaseUnavailable if MySQL is down
        return success("Flask and MySQL are running", {"flask": "ok", "mysql": "connected"})


def _duplicate_field(exc):
    """Turn  "Duplicate entry 'x' for key 'donor.email'"  into 'email' (no values leaked)."""
    match = re.search(r"for key '(?:\w+\.)?(\w+)'", str(exc))
    return match.group(1) if match else "a unique field"


def register_error_handlers(app):
    @app.errorhandler(ApiError)
    def handle_api_error(exc):
        return error(exc.message, exc.status)

    @app.errorhandler(DatabaseUnavailable)
    def handle_db_down(exc):
        return error("Database is unavailable", 503)

    @app.errorhandler(mysql_errors.Error)
    def handle_mysql_error(exc):
        errno = getattr(exc, "errno", None)
        if errno == 1062:
            return error(f"Duplicate record: a record with this {_duplicate_field(exc)} already exists", 409)
        if errno == 1451:
            return error("Cannot delete or change this record because other records depend on it", 409)
        if errno == 1452:
            return error("Referenced record does not exist (invalid foreign key)", 409)
        if errno == 3819:
            return error("A value violates a database rule (for example age 18-65, or quantity must be positive)", 400)
        if errno in (1406, 1264, 1366, 1292):
            return error("A value is too long or has the wrong format", 400)
        log.error("MySQL error errno=%s", errno)  # details stay in the server log only
        return error("Internal server error", 500)

    @app.errorhandler(HTTPException)
    def handle_http_error(exc):
        return error(exc.description or exc.name, exc.code)

    @app.errorhandler(Exception)
    def handle_unexpected(exc):
        log.exception("Unhandled error")
        return error("Internal server error", 500)


app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=Config.PORT, debug=Config.DEBUG)
