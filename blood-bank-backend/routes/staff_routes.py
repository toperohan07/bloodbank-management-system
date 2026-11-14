"""Staff management: /api/staff"""
from flask import Blueprint, request

from db import execute, fetch_all, fetch_one
from utils.response import paginated, require_row, success
from utils.validation import get_json_body, validate

bp = Blueprint("staff", __name__, url_prefix="/api/staff")

STAFF_SPEC = {
    "staff_name": {"required": True, "max_len": 100},
    "designation": {"max_len": 50},
    "phone": {"type": "phone", "max_len": 15},
    "email": {"type": "email", "max_len": 100},
    "bank_id": {"type": "int", "min": 1},
}
COLUMNS = "staff_id, staff_name, designation, phone, email, bank_id"


def get_staff(staff_id):
    return require_row(fetch_one("SELECT " + COLUMNS + " FROM staff WHERE staff_id = %s", (staff_id,)),
                       "Staff member not found")


@bp.get("")
def list_staff():
    sql = "SELECT " + COLUMNS + " FROM staff WHERE 1=1"
    params = []
    if request.args.get("bank_id"):
        sql += " AND bank_id = %s"
        params.append(request.args["bank_id"])
    if request.args.get("designation"):
        sql += " AND designation = %s"
        params.append(request.args["designation"])
    if request.args.get("search"):
        sql += " AND staff_name LIKE %s"
        params.append("%" + request.args["search"] + "%")
    return paginated("Staff retrieved successfully", sql, params, "ORDER BY staff_id")


@bp.get("/<int:staff_id>")
def get_one(staff_id):
    return success("Staff member retrieved successfully", get_staff(staff_id))


@bp.post("")
def create_staff():
    d = validate(get_json_body(), STAFF_SPEC)
    staff_id, _ = execute(
        "INSERT INTO staff (staff_name, designation, phone, email, bank_id) VALUES (%s, %s, %s, %s, %s)",
        (d["staff_name"], d["designation"], d["phone"], d["email"], d["bank_id"]))
    return success("Staff member created successfully", {"staff_id": staff_id}, 201)


@bp.put("/<int:staff_id>")
def update_staff(staff_id):
    d = {**get_staff(staff_id), **validate(get_json_body(), STAFF_SPEC, partial=True)}
    execute(
        "UPDATE staff SET staff_name=%s, designation=%s, phone=%s, email=%s, bank_id=%s WHERE staff_id=%s",
        (d["staff_name"], d["designation"], d["phone"], d["email"], d["bank_id"], staff_id))
    return success("Staff member updated successfully", get_staff(staff_id))


@bp.delete("/<int:staff_id>")
def delete_staff(staff_id):
    get_staff(staff_id)
    # Fails with 409 if the staff member handled donations or issues.
    execute("DELETE FROM staff WHERE staff_id = %s", (staff_id,))
    return success("Staff member deleted successfully", {"staff_id": staff_id})


@bp.get("/<int:staff_id>/donations")
def staff_donations(staff_id):
    get_staff(staff_id)
    rows = fetch_all(
        "SELECT dn.donation_id, dn.donation_date, dn.quantity_ml, dn.donation_status, "
        "       d.donor_id, d.donor_name, d.blood_group, b.bank_id, b.bank_name "
        "FROM donation dn "
        "INNER JOIN donor d ON d.donor_id = dn.donor_id "
        "INNER JOIN bloodbank b ON b.bank_id = dn.bank_id "
        "WHERE dn.staff_id = %s ORDER BY dn.donation_date DESC, dn.donation_id DESC", (staff_id,))
    return success("Staff donations retrieved successfully", rows)
