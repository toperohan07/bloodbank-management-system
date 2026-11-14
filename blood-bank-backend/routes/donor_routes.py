"""Donor management: /api/donors"""
from flask import Blueprint, request

from db import execute, fetch_all, fetch_one
from utils.response import paginated, require_row, success
from utils.validation import BLOOD_GROUPS, get_json_body, validate

bp = Blueprint("donors", __name__, url_prefix="/api/donors")

DONOR_SPEC = {
    "donor_name": {"required": True, "max_len": 100},
    "age": {"type": "int", "min": 18, "max": 65},  # same range as the donor_chk_1 CHECK constraint
    "gender": {"max_len": 10, "choices": ["Male", "Female", "Other"]},
    "blood_group": {"required": True, "choices": BLOOD_GROUPS},
    "phone": {"type": "phone", "max_len": 15},
    "email": {"type": "email", "max_len": 100},
    "city": {"max_len": 50},
    "last_donation_date": {"type": "date"},
}

DONOR_COLUMNS = ("donor_id, donor_name, age, gender, blood_group, phone, email, city, last_donation_date")


def get_donor(donor_id):
    row = fetch_one("SELECT " + DONOR_COLUMNS + " FROM donor WHERE donor_id = %s", (donor_id,))
    return require_row(row, "Donor not found")


@bp.get("")
def list_donors():
    sql = "SELECT " + DONOR_COLUMNS + " FROM donor WHERE 1=1"
    params = []
    if request.args.get("blood_group"):
        sql += " AND blood_group = %s"
        params.append(request.args["blood_group"])
    if request.args.get("city"):
        sql += " AND city = %s"
        params.append(request.args["city"])
    if request.args.get("search"):
        sql += " AND donor_name LIKE %s"
        params.append("%" + request.args["search"] + "%")
    return paginated("Donors retrieved successfully", sql, params, "ORDER BY donor_id")


@bp.get("/<int:donor_id>")
def get_one(donor_id):
    return success("Donor retrieved successfully", get_donor(donor_id))


@bp.post("")
def create_donor():
    d = validate(get_json_body(), DONOR_SPEC)
    donor_id, _ = execute(
        "INSERT INTO donor (donor_name, age, gender, blood_group, phone, email, city, last_donation_date) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
        (d["donor_name"], d["age"], d["gender"], d["blood_group"], d["phone"], d["email"], d["city"],
         d["last_donation_date"]),
    )
    return success("Donor registered successfully", {"donor_id": donor_id}, 201)


@bp.put("/<int:donor_id>")
def update_donor(donor_id):
    current = get_donor(donor_id)
    d = {**current, **validate(get_json_body(), DONOR_SPEC, partial=True)}
    execute(
        "UPDATE donor SET donor_name=%s, age=%s, gender=%s, blood_group=%s, phone=%s, email=%s, city=%s, "
        "last_donation_date=%s WHERE donor_id=%s",
        (d["donor_name"], d["age"], d["gender"], d["blood_group"], d["phone"], d["email"], d["city"],
         d["last_donation_date"], donor_id),
    )
    return success("Donor updated successfully", get_donor(donor_id))


@bp.delete("/<int:donor_id>")
def delete_donor(donor_id):
    get_donor(donor_id)
    # Fails with a foreign-key error (-> 409) if the donor has donations.
    execute("DELETE FROM donor WHERE donor_id = %s", (donor_id,))
    return success("Donor deleted successfully", {"donor_id": donor_id})


@bp.get("/<int:donor_id>/donations")
def donor_donations(donor_id):
    get_donor(donor_id)
    rows = fetch_all(
        "SELECT dn.donation_id, dn.donation_date, dn.quantity_ml, dn.donation_status, "
        "       b.bank_id, b.bank_name, s.staff_id, s.staff_name "
        "FROM donation dn "
        "INNER JOIN bloodbank b ON b.bank_id = dn.bank_id "
        "INNER JOIN staff s ON s.staff_id = dn.staff_id "
        "WHERE dn.donor_id = %s ORDER BY dn.donation_date DESC, dn.donation_id DESC",
        (donor_id,),
    )
    return success("Donation history retrieved successfully", rows)
