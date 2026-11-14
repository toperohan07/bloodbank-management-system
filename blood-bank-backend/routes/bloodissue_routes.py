"""Blood issue management: /api/issues

POST /api/issues is a single database transaction (see issue_blood()).
"""
from flask import Blueprint, request

from db import execute, fetch_one, transaction
from utils.response import ApiError, paginated, require_row, success
from utils.validation import get_json_body, today, validate

bp = Blueprint("issues", __name__, url_prefix="/api/issues")

ISSUE_SPEC = {
    "request_id": {"type": "int", "required": True, "min": 1},
    "inventory_id": {"type": "int", "required": True, "min": 1},
    "staff_id": {"type": "int", "required": True, "min": 1},
    "units_issued": {"type": "int", "required": True, "min": 1},
    "issue_date": {"type": "date"},
}
# Only these fields may be edited later. Changing units_issued would require re-adjusting stock,
# so a wrong quantity cannot be edited through the API.
ISSUE_UPDATE_SPEC = {
    "staff_id": {"type": "int", "min": 1},
    "issue_date": {"type": "date"},
}

CLOSED_STATUSES = ("Fulfilled", "Rejected", "Cancelled")

ISSUE_SELECT = (
    "SELECT bi.issue_id, bi.request_id, bi.inventory_id, bi.staff_id, bi.issue_date, bi.units_issued "
    "FROM bloodissue bi WHERE 1=1"
)

HISTORY_SELECT = (
    "SELECT bi.issue_id, bi.issue_date, bi.units_issued, "
    "       r.request_id, r.blood_group AS requested_blood_group, r.units_required, r.urgency, r.request_status, "
    "       h.hospital_id, h.hospital_name, h.city AS hospital_city, "
    "       p.patient_id, p.patient_name, "
    "       i.inventory_id, i.blood_group AS inventory_blood_group, i.component_type, i.expiry_date, "
    "       bk.bank_id, bk.bank_name, s.staff_id, s.staff_name "
    "FROM bloodissue bi "
    "INNER JOIN bloodrequest r ON r.request_id = bi.request_id "
    "INNER JOIN hospital h ON h.hospital_id = r.hospital_id "
    "INNER JOIN patient p ON p.patient_id = r.patient_id "
    "INNER JOIN bloodinventory i ON i.inventory_id = bi.inventory_id "
    "INNER JOIN bloodbank bk ON bk.bank_id = i.bank_id "
    "INNER JOIN staff s ON s.staff_id = bi.staff_id WHERE 1=1"
)


def get_issue(issue_id):
    return require_row(fetch_one(ISSUE_SELECT + " AND bi.issue_id = %s", (issue_id,)), "Issue record not found")


def issue_filters(sql, params):
    for arg in ("request_id", "inventory_id", "staff_id"):
        if request.args.get(arg):
            sql += " AND bi." + arg + " = %s"  # arg from fixed tuple
            params.append(request.args[arg])
    return sql


@bp.get("")
def list_issues():
    params = []
    sql = issue_filters(ISSUE_SELECT, params)
    return paginated("Issues retrieved successfully", sql, params, "ORDER BY bi.issue_id")


@bp.get("/history")
def issue_history():
    params = []
    sql = issue_filters(HISTORY_SELECT, params)
    return paginated("Issue history retrieved successfully", sql, params, "ORDER BY bi.issue_date DESC, bi.issue_id DESC")


@bp.get("/<int:issue_id>")
def get_one(issue_id):
    return success("Issue retrieved successfully", get_issue(issue_id))


@bp.post("")
def issue_blood():
    d = validate(get_json_body(), ISSUE_SPEC)
    issue_date = d["issue_date"] or today()

    # 1. START TRANSACTION (done by transaction(); COMMIT on success, ROLLBACK on any exception)
    with transaction() as cur:
        # 2. Lock the inventory row. Concurrent issues for the same stock wait here.
        cur.execute(
            "SELECT inventory_id, donation_id, blood_group, units_available, "
            "       (expiry_date IS NOT NULL AND expiry_date >= CURDATE()) AS not_expired "
            "FROM bloodinventory WHERE inventory_id = %s FOR UPDATE", (d["inventory_id"],))
        inv = require_row(cur.fetchone(), "Inventory record not found")

        # Lock the request row too, so the same request cannot be over-issued concurrently.
        cur.execute(
            "SELECT request_id, blood_group, units_required, request_status "
            "FROM bloodrequest WHERE request_id = %s FOR UPDATE", (d["request_id"],))
        req = require_row(cur.fetchone(), "Blood request not found")

        # 3-6. Business checks (any failure raises -> rollback)
        if req["request_status"] in CLOSED_STATUSES:
            raise ApiError(f"Request is already {req['request_status']}", 409)
        if inv["blood_group"] != req["blood_group"]:
            raise ApiError("Inventory blood group does not match the requested blood group", 409)
        if not inv["not_expired"]:
            raise ApiError("Inventory is expired (or has no expiry date) and cannot be issued", 409)
        cur.execute("SELECT overall_status FROM bloodtest WHERE donation_id = %s", (inv["donation_id"],))
        test = cur.fetchone()
        if test is None or test["overall_status"] != "Safe":
            raise ApiError("Inventory has no blood test marked 'Safe' and cannot be issued", 409)
        if inv["units_available"] is None or inv["units_available"] < d["units_issued"]:
            raise ApiError(f"Insufficient inventory: {inv['units_available'] or 0} unit(s) available", 409)
        cur.execute("SELECT COALESCE(SUM(units_issued), 0) AS issued FROM bloodissue WHERE request_id = %s",
                    (d["request_id"],))
        already = int(cur.fetchone()["issued"])
        if already + d["units_issued"] > req["units_required"]:
            raise ApiError(f"Request needs only {req['units_required'] - already} more unit(s)", 409)

        # 7. Insert the issue record (a bad staff_id raises an FK error -> rollback)
        cur.execute(
            "INSERT INTO bloodissue (request_id, inventory_id, staff_id, issue_date, units_issued) "
            "VALUES (%s, %s, %s, %s, %s)",
            (d["request_id"], d["inventory_id"], d["staff_id"], issue_date, d["units_issued"]))
        issue_id = cur.lastrowid

        # 8. Reduce stock
        cur.execute("UPDATE bloodinventory SET units_available = units_available - %s WHERE inventory_id = %s",
                    (d["units_issued"], d["inventory_id"]))

        # Mark the request Fulfilled once all required units are issued
        if already + d["units_issued"] == req["units_required"]:
            cur.execute("UPDATE bloodrequest SET request_status = 'Fulfilled' WHERE request_id = %s",
                        (d["request_id"],))
    # 9. COMMIT happened when the with-block ended without an exception.
    return success("Blood issued successfully", {
        "issue_id": issue_id,
        "units_remaining_in_inventory": inv["units_available"] - d["units_issued"],
        "request_fulfilled": already + d["units_issued"] == req["units_required"],
    }, 201)


@bp.put("/<int:issue_id>")
def update_issue(issue_id):
    current = get_issue(issue_id)
    d = {**current, **validate(get_json_body(), ISSUE_UPDATE_SPEC, partial=True)}
    execute("UPDATE bloodissue SET staff_id=%s, issue_date=%s WHERE issue_id=%s",
            (d["staff_id"], d["issue_date"], issue_id))
    return success("Issue updated successfully", get_issue(issue_id))
