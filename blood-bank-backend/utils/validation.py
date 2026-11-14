"""Small request-body validator. No external libraries."""
import re
from datetime import date, datetime

from flask import request

from utils.response import ApiError

BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_RE = re.compile(r"^\+?[0-9]{7,15}$")


def get_json_body():
    """Return the JSON object sent by the client or raise a 400."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("Request body must be a JSON object")
    return data


def _check(name, value, rule):
    """Validate one value; return the cleaned value."""
    kind = rule.get("type", "str")
    if kind == "int":
        if isinstance(value, bool) or not isinstance(value, int):
            raise ApiError(f"{name} must be an integer")
        if "min" in rule and value < rule["min"]:
            raise ApiError(f"{name} must be at least {rule['min']}")
        if "max" in rule and value > rule["max"]:
            raise ApiError(f"{name} must be at most {rule['max']}")
        return value
    if kind == "date":
        if not isinstance(value, str):
            raise ApiError(f"{name} must be a date string YYYY-MM-DD")
        try:
            return datetime.strptime(value, "%Y-%m-%d").date().isoformat()
        except ValueError:
            raise ApiError(f"{name} must be a valid date in YYYY-MM-DD format")
    # everything else is a string
    if not isinstance(value, str):
        raise ApiError(f"{name} must be a string")
    value = value.strip()
    if not value:
        raise ApiError(f"{name} must not be empty")
    if len(value) > rule.get("max_len", 255):
        raise ApiError(f"{name} must be at most {rule.get('max_len', 255)} characters")
    if kind == "email" and not EMAIL_RE.match(value):
        raise ApiError(f"{name} is not a valid email address")
    if kind == "phone" and not PHONE_RE.match(value):
        raise ApiError(f"{name} must be 7-15 digits (optional leading +)")
    if "choices" in rule and value not in rule["choices"]:
        raise ApiError(f"{name} must be one of: {', '.join(rule['choices'])}")
    return value


def validate(data, spec, partial=False):
    """Validate `data` against `spec`.

    spec = {"field": {"type": "str|int|date|email|phone", "required": True, ...}}
    - partial=False (POST): required fields must exist; missing optional fields become None.
    - partial=True  (PUT): only the fields that were sent are validated/returned.
    Sending null for an optional field clears it. Unknown fields are ignored.
    """
    clean = {}
    for name, rule in spec.items():
        if name not in data:
            if rule.get("required") and not partial:
                raise ApiError(f"{name} is required")
            if not partial:
                clean[name] = rule.get("default")
            continue
        value = data[name]
        if value is None:
            if rule.get("required"):
                raise ApiError(f"{name} must not be null")
            clean[name] = None
            continue
        clean[name] = _check(name, value, rule)
    return clean


def today():
    return date.today().isoformat()
