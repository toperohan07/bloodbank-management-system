"""Blood request management: /api/requests"""
from flask import Blueprint, request

from db import execute, fetch_all, fetch_one
from utils.response import ApiError, paginated, require_row, success
from utils.validation import BLOOD_GROUPS, get_json_body, today, validate

bp = Blueprint("requests", __name__, url_prefix="/api/requests")

URGENCY = ["Low", "Normal", "High", "Critical"]
STATUSES = ["Pending", "Approved", "Fulfilled", "Rejected", "Cancelled"]

REQUEST_SPEC = {
    "patient_id": {"type": "int", "required": True, "min": 1},
    "hospital_id": {"type": "int", "required": True, "min": 1},
    "blood_group": {"required": True, "choices": BLOOD_GROUPS},
    "units_required": {"type": "int", "required": True, "min": 1},
    "request_date": {"type": "date"},
    "urgency": {"max_len": 20, "choices": URGENCY, "default": "Normal"},
    "request_status": {"max_len": 20, "choices": STATUSES, "default": "Pending"},
}

# units_issued is a correlated subquery: total units already issued against each request.
REQUEST_SELECT = (
    "SELECT r.request_id, r.patient_id, p.patient_name, r.hospital_id, h.hospital_name, r.blood_group, "
    "       r.units_required, r.request_date, r.urgency, r.request_status, "
    "       (SELECT COALESCE(SUM(bi.units_issued), 0) FROM bloodissue bi "
    "         WHERE bi.request_id = r.request_id) AS units_issued "
    "FROM bloodrequest r "
    "INNER JOIN patient p ON p.patient_id = r.patient_id "
    "INNER JOIN hospital h ON h.hospital_id = r.hospital_id "
    "WHERE 1=1"
)


def get_request(request_id):
    return require_row(fetch_one(REQUEST_SELECT + " AND r.request_id = %s", (request_id,)), "Blood request not found")


@bp.get("")
def list_requests():
    sql, params = REQUEST_SELECT, []
    for arg in ("blood_group", "urgency", "request_status", "hospital_id"):
        if request.args.get(arg):
            sql += " AND r." + arg + " = %s"  # arg from fixed tuple
            params.append(request.args[arg])
    return paginated("Blood requests retrieved successfully", sql, params, "ORDER BY r.request_id")


@bp.get("/pending")
def pending_requests():
    sql = REQUEST_SELECT + " AND r.request_status = 'Pending'"
    return paginated("Pending requests retrieved successfully", sql, [],
                     "ORDER BY FIELD(r.urgency, 'Critical', 'High', 'Normal', 'Low'), r.request_date, r.request_id")


@bp.get("/summary")
def request_summary():
    def grouped(column):
        return fetch_all(
            "SELECT " + column + " AS label, COUNT(*) AS requests, SUM(units_required) AS units_required "
            "FROM bloodrequest GROUP BY " + column + " ORDER BY " + column)

    total = fetch_one("SELECT COUNT(*) AS total_requests, COALESCE(SUM(units_required), 0) AS total_units_required "
                      "FROM bloodrequest")
    return success("Request summary retrieved successfully", {
        **total,
        "by_status": grouped("request_status"),
        "by_urgency": grouped("urgency"),
        "by_blood_group": grouped("blood_group"),
    })


@bp.get("/<int:request_id>")
def get_one(request_id):
    return success("Blood request retrieved successfully", get_request(request_id))


@bp.post("")
def create_request():
    d = validate(get_json_body(), REQUEST_SPEC)
    d["request_date"] = d["request_date"] or today()
    request_id, _ = execute(
        "INSERT INTO bloodrequest (patient_id, hospital_id, blood_group, units_required, request_date, urgency, "
        "request_status) VALUES (%s, %s, %s, %s, %s, %s, %s)",
        (d["patient_id"], d["hospital_id"], d["blood_group"], d["units_required"], d["request_date"], d["urgency"],
         d["request_status"]))
    return success("Blood request created successfully", {"request_id": request_id}, 201)


@bp.put("/<int:request_id>")
def update_request(request_id):
    current = get_request(request_id)
    d = {**current, **validate(get_json_body(), REQUEST_SPEC, partial=True)}
    if d["units_required"] < current["units_issued"]:
        raise ApiError("units_required cannot be lower than the units already issued", 409)
    execute(
        "UPDATE bloodrequest SET patient_id=%s, hospital_id=%s, blood_group=%s, units_required=%s, "
        "request_date=%s, urgency=%s, request_status=%s WHERE request_id=%s",
        (d["patient_id"], d["hospital_id"], d["blood_group"], d["units_required"], d["request_date"], d["urgency"],
         d["request_status"], request_id))
    return success("Blood request updated successfully", get_request(request_id))


@bp.delete("/<int:request_id>")
def delete_request(request_id):
    get_request(request_id)
    # Fails with 409 if blood has been issued against this request.
    execute("DELETE FROM bloodrequest WHERE request_id = %s", (request_id,))
    return success("Blood request deleted successfully", {"request_id": request_id})
