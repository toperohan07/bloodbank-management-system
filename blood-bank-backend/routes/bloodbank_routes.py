"""Blood bank management: /api/bloodbanks"""
from flask import Blueprint, request

from db import execute, fetch_all, fetch_one
from routes.inventory_routes import INVENTORY_SELECT, get_days, inventory_filters
from utils.response import paginated, require_row, success
from utils.validation import get_json_body, validate

bp = Blueprint("bloodbanks", __name__, url_prefix="/api/bloodbanks")

BANK_SPEC = {
    "bank_name": {"required": True, "max_len": 100},
    "address": {"max_len": 200},
    "city": {"max_len": 50},
    "contact_number": {"type": "phone", "max_len": 15},
    "email": {"type": "email", "max_len": 100},
}
COLUMNS = "bank_id, bank_name, address, city, contact_number, email"


def get_bank(bank_id):
    return require_row(fetch_one("SELECT " + COLUMNS + " FROM bloodbank WHERE bank_id = %s", (bank_id,)),
                       "Blood bank not found")


@bp.get("")
def list_banks():
    sql = "SELECT " + COLUMNS + " FROM bloodbank WHERE 1=1"
    params = []
    if request.args.get("city"):
        sql += " AND city = %s"
        params.append(request.args["city"])
    if request.args.get("search"):
        sql += " AND bank_name LIKE %s"
        params.append("%" + request.args["search"] + "%")
    return paginated("Blood banks retrieved successfully", sql, params, "ORDER BY bank_id")


@bp.get("/<int:bank_id>")
def get_one(bank_id):
    return success("Blood bank retrieved successfully", get_bank(bank_id))


@bp.post("")
def create_bank():
    d = validate(get_json_body(), BANK_SPEC)
    bank_id, _ = execute(
        "INSERT INTO bloodbank (bank_name, address, city, contact_number, email) VALUES (%s, %s, %s, %s, %s)",
        (d["bank_name"], d["address"], d["city"], d["contact_number"], d["email"]))
    return success("Blood bank created successfully", {"bank_id": bank_id}, 201)


@bp.put("/<int:bank_id>")
def update_bank(bank_id):
    d = {**get_bank(bank_id), **validate(get_json_body(), BANK_SPEC, partial=True)}
    execute(
        "UPDATE bloodbank SET bank_name=%s, address=%s, city=%s, contact_number=%s, email=%s WHERE bank_id=%s",
        (d["bank_name"], d["address"], d["city"], d["contact_number"], d["email"], bank_id))
    return success("Blood bank updated successfully", get_bank(bank_id))


@bp.delete("/<int:bank_id>")
def delete_bank(bank_id):
    get_bank(bank_id)
    # Fails with 409 if staff, donations or inventory belong to this bank.
    execute("DELETE FROM bloodbank WHERE bank_id = %s", (bank_id,))
    return success("Blood bank deleted successfully", {"bank_id": bank_id})


@bp.get("/<int:bank_id>/inventory")
def bank_inventory(bank_id):
    get_bank(bank_id)
    days = get_days()
    params = [days, bank_id]
    # Same filters as /api/inventory, but the bank is fixed by the URL.
    sql = inventory_filters(INVENTORY_SELECT + " AND i.bank_id = %s", params, days, include_bank=False)
    return paginated("Blood bank inventory retrieved successfully", sql, params, "ORDER BY i.inventory_id")


@bp.get("/<int:bank_id>/staff")
def bank_staff(bank_id):
    get_bank(bank_id)
    rows = fetch_all(
        "SELECT staff_id, staff_name, designation, phone, email, bank_id FROM staff "
        "WHERE bank_id = %s ORDER BY staff_id", (bank_id,))
    return success("Blood bank staff retrieved successfully", rows)
