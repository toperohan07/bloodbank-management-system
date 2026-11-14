"""Database helpers. All SQL is written by hand in the route files and
executed here through MySQL Connector/Python (no ORM)."""
import logging
from contextlib import contextmanager

import mysql.connector
from mysql.connector import errors as mysql_errors

from config import Config

log = logging.getLogger("bloodbank.db")


class DatabaseUnavailable(Exception):
    """Raised when we cannot connect to MySQL."""


def get_connection():
    """Open a new connection to the existing bloodbankdb database."""
    try:
        return mysql.connector.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            port=Config.DB_PORT,
            connection_timeout=5,
        )
    except mysql_errors.Error as exc:
        # Log only the error number/host - never the password.
        log.error("MySQL connection failed (errno=%s, host=%s)", getattr(exc, "errno", "?"), Config.DB_HOST)
        raise DatabaseUnavailable() from exc


def fetch_all(sql, params=None):
    """Run a SELECT and return a list of dicts."""
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute(sql, params or ())
            return cur.fetchall()
        finally:
            cur.close()
    finally:
        conn.close()


def fetch_one(sql, params=None):
    """Run a SELECT and return the first row as a dict (or None)."""
    rows = fetch_all(sql, params)
    return rows[0] if rows else None


def execute(sql, params=None):
    """Run one INSERT/UPDATE/DELETE and commit. Returns (last_insert_id, rows_affected)."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        try:
            cur.execute(sql, params or ())
            conn.commit()
            return cur.lastrowid, cur.rowcount
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()
    finally:
        conn.close()


@contextmanager
def transaction():
    """Run several statements as ONE transaction.

        with transaction() as cur:
            cur.execute(...)
            cur.execute(...)

    Commits when the block finishes, rolls back if any exception is raised.
    The cursor returns dictionaries.
    """
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()
