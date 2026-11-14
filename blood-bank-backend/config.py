"""Configuration loaded from environment variables (.env file)."""
import os

from dotenv import load_dotenv

load_dotenv()  # reads .env in the project folder, if present


class Config:
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "bloodbankdb")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))

    # Local development only. Set FLASK_DEBUG=false for anything else.
    DEBUG = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    PORT = int(os.getenv("PORT", "5000"))

    # "*" allows any origin (fine for a college project). Comma-separate to restrict.
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")

    # Inventory expiring within this many days is "expiring soon".
    EXPIRY_ALERT_DAYS = int(os.getenv("EXPIRY_ALERT_DAYS", "30"))

    API_VERSION = "1.0.0"
    APP_NAME = "Blood Bank and Donor Management System"
