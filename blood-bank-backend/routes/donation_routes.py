"""Donation management: /api/donations"""
from flask import Blueprint, request

from db import execute, fetch_one, transaction
from utils.response import paginated, require_row, success
from utils.validation import get_json_body, validate

bp = Blueprint("donations", __name__, url_prefix="/api/donations")

DONATION_SPEC = {
    "donor_id": {"type": "int", "required": True, "min": 1},
    "bank_id": {"type": "int", "required": True, "min": 1},
    "staff_id": {"type": "int", "required": True, "min": 1},
    "donation_date": {"type": "date", "required": True},
    "quantity_ml": {"type": "int", "min": 1, "max": 2000},
    "donation_status": {"max_len": 20, "choices": ["Pending", "Accepted", "Rejected", "Deferred"],
                        "default": "Pending"},
}

COLUMNS = "donation_id, donor_id, bank_id, staff_id, donation_date, quantity_ml, donation_status"


def get_donation(donation_id):
    row = fetch_one("SELECT " + COLUMNS + " FROM donation WHERE donation_id = %s", (donation_id,))
    return require_row(row, "Donation not found")


def date_filters(sql, params, column="dn.donation_date"):
    """Optional ?from_date= & ?to_date= filters (YYYY-MM-DD)."""
    if request.args.get("from_date"):
        sql += " AND " + column + " >= %s"
        params.append(request.args["from_date"])
    if request.args.get("to_date"):
        sql += " AND " + column + " <= %s"
        params.append(request.args["to_date"])
    return sql


@bp.get("")
def list_donations():
    sql = ("SELECT dn.donation_id, dn.donor_id, dn.bank_id, dn.staff_id, dn.donation_date, dn.quantity_ml, "
           "dn.donation_status FROM donation dn WHERE 1=1")
    params = []
    for arg in ("donor_id", "bank_id", "staff_id", "donation_status"):
        if request.args.get(arg):
            sql += " AND dn." + arg + " = %s"  # arg comes from the fixed tuple above, never from the user
            params.append(request.args[arg])
    sql = date_filters(sql, params)
    return paginated("Donations retrieved successfully", sql, params, "ORDER BY dn.donation_date DESC, dn.donation_id DESC")


@bp.get("/history")
def donation_history():
    """Donation + donor + blood bank + staff using INNER JOINs."""
    sql = (
        "SELECT dn.donation_id, dn.donation_date, dn.quantity_ml, dn.donation_status, "
        "       d.donor_id, d.donor_name, d.blood_group, "
        "       b.bank_id, b.bank_name, s.staff_id, s.staff_name "
        "FROM donation dn "
        "INNER JOIN donor d ON d.donor_id = dn.donor_id "
        "INNER JOIN bloodbank b ON b.bank_id = dn.bank_id "
        "INNER JOIN staff s ON s.staff_id = dn.staff_id WHERE 1=1"
    )
    params = []
    if request.args.get("bank_id"):
        sql += " AND dn.bank_id = %s"
        params.append(request.args["bank_id"])
    if request.args.get("blood_group"):
        sql += " AND d.blood_group = %s"
        params.append(request.args["blood_group"])
    sql = date_filters(sql, params)
    return paginated("Donation history retrieved successfully", sql, params,
                     "ORDER BY dn.donation_date DESC, dn.donation_id DESC")


@bp.get("/<int:donation_id>")
def get_one(donation_id):
    return success("Donation retrieved successfully", get_donation(donation_id))


@bp.post("")
def create_donation():
    d = validate(get_json_body(), DONATION_SPEC)
    # Two statements, one transaction: record the donation AND refresh the donor's last_donation_date.
    with transaction() as cur:
        cur.execute(
            "INSERT INTO donation (donor_id, bank_id, staff_id, donation_date, quantity_ml, donation_status) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (d["donor_id"], d["bank_id"], d["staff_id"], d["donation_date"], d["quantity_ml"], d["donation_status"]),
        )
        donation_id = cur.lastrowid
        cur.execute(
            "UPDATE donor SET last_donation_date = %s "
            "WHERE donor_id = %s AND (last_donation_date IS NULL OR last_donation_date < %s)",
            (d["donation_date"], d["donor_id"], d["donation_date"]),
        )
    return success("Donation registered successfully", {"donation_id": donation_id}, 201)


@bp.put("/<int:donation_id>")
def update_donation(donation_id):
    current = get_donation(donation_id)
    d = {**current, **validate(get_json_body(), DONATION_SPEC, partial=True)}
    execute(
        "UPDATE donation SET donor_id=%s, bank_id=%s, staff_id=%s, donation_date=%s, quantity_ml=%s, "
        "donation_status=%s WHERE donation_id=%s",
        (d["donor_id"], d["bank_id"], d["staff_id"], d["donation_date"], d["quantity_ml"], d["donation_status"],
         donation_id),
    )
    return success("Donation updated successfully", get_donation(donation_id))


@bp.delete("/<int:donation_id>")
def delete_donation(donation_id):
    get_donation(donation_id)
    # Fails with 409 if inventory or a blood test references this donation.
    execute("DELETE FROM donation WHERE donation_id = %s", (donation_id,))
    return success("Donation deleted successfully", {"donation_id": donation_id})
