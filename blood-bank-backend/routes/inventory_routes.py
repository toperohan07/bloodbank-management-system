"""Blood inventory: /api/inventory

Expiry rules (based on bloodinventory.expiry_date and today's date):
    expired       expiry_date <  today
    expiring_soon today <= expiry_date <= today + N days   (N = ?days=, default EXPIRY_ALERT_DAYS)
    valid         expiry_date >  today + N days
    unknown       expiry_date is NULL  (never treated as available for issue)
"""
from flask import Blueprint, request

from config import Config
from db import execute, fetch_all, fetch_one
from utils.response import ApiError, paginated, require_row, success
from utils.validation import BLOOD_GROUPS, get_json_body, validate

bp = Blueprint("inventory", __name__, url_prefix="/api/inventory")

INVENTORY_SPEC = {
    "donation_id": {"type": "int", "required": True, "min": 1},
    "bank_id": {"type": "int", "required": True, "min": 1},
    "blood_group": {"required": True, "choices": BLOOD_GROUPS},
    "component_type": {"max_len": 30},
    "units_available": {"type": "int", "required": True, "min": 0},
    "collection_date": {"type": "date"},
    "expiry_date": {"type": "date"},
}

# The first %s in this statement is the "expiring soon" window in days.
INVENTORY_SELECT = (
    "SELECT i.inventory_id, i.donation_id, i.bank_id, bk.bank_name, i.blood_group, i.component_type, "
    "       i.units_available, i.collection_date, i.expiry_date, "
    "       CASE WHEN i.expiry_date IS NULL THEN 'unknown' "
    "            WHEN i.expiry_date < CURDATE() THEN 'expired' "
    "            WHEN i.expiry_date <= DATE_ADD(CURDATE(), INTERVAL %s DAY) THEN 'expiring_soon' "
    "            ELSE 'valid' END AS expiry_status, "
    "       t.overall_status AS test_status "
    "FROM bloodinventory i "
    "INNER JOIN bloodbank bk ON bk.bank_id = i.bank_id "
    "LEFT JOIN bloodtest t ON t.donation_id = i.donation_id "
    "WHERE 1=1"
)


def get_days():
    """The ?days= window for 'expiring soon'."""
    try:
        days = int(request.args.get("days", Config.EXPIRY_ALERT_DAYS))
    except ValueError:
        raise ApiError("days must be an integer")
    if days < 0:
        raise ApiError("days must not be negative")
    return days


def inventory_filters(sql, params, days, include_bank=True):
    """Optional filters shared with /api/bloodbanks/<id>/inventory (which sets include_bank=False)."""
    columns = ("blood_group", "component_type", "bank_id") if include_bank else ("blood_group", "component_type")
    for arg in columns:
        if request.args.get(arg):
            sql += " AND i." + arg + " = %s"  # arg is from this fixed tuple, never user text
            params.append(request.args[arg])
    status = request.args.get("expiry_status")
    if status:
        if status == "expired":
            sql += " AND i.expiry_date < CURDATE()"
        elif status == "expiring_soon":
            sql += " AND i.expiry_date >= CURDATE() AND i.expiry_date <= DATE_ADD(CURDATE(), INTERVAL %s DAY)"
            params.append(days)
        elif status == "valid":
            sql += " AND i.expiry_date > DATE_ADD(CURDATE(), INTERVAL %s DAY)"
            params.append(days)
        else:
            raise ApiError("expiry_status must be one of: expired, expiring_soon, valid")
    return sql


def get_inventory(inventory_id):
    row = fetch_one(INVENTORY_SELECT + " AND i.inventory_id = %s", (Config.EXPIRY_ALERT_DAYS, inventory_id))
    return require_row(row, "Inventory record not found")


def check_inventory_rules(d):
    """Business rules that go beyond field validation."""
    if d["collection_date"] and d["expiry_date"] and str(d["expiry_date"]) < str(d["collection_date"]):
        raise ApiError("expiry_date must not be before collection_date")
    donor = fetch_one(
        "SELECT dr.blood_group FROM donation dn INNER JOIN donor dr ON dr.donor_id = dn.donor_id "
        "WHERE dn.donation_id = %s", (d["donation_id"],))
    if donor is None:
        raise ApiError("Referenced donation does not exist", 409)
    if donor["blood_group"] != d["blood_group"]:
        raise ApiError("blood_group does not match the blood group of the donor who made this donation")


@bp.get("")
def list_inventory():
    days = get_days()
    params = [days]
    sql = inventory_filters(INVENTORY_SELECT, params, days)
    return paginated("Inventory retrieved successfully", sql, params, "ORDER BY i.inventory_id")


@bp.get("/summary")
def inventory_summary():
    def grouped(column, table_join=""):
        return fetch_all(
            "SELECT " + column + " AS label, COUNT(*) AS records, "
            "       COALESCE(SUM(i.units_available), 0) AS units, "
            "       COALESCE(SUM(CASE WHEN i.expiry_date >= CURDATE() THEN i.units_available ELSE 0 END), 0) AS usable_units "
            "FROM bloodinventory i " + table_join + " GROUP BY " + column + " ORDER BY " + column)

    totals = fetch_one(
        "SELECT COUNT(*) AS records, COALESCE(SUM(units_available), 0) AS total_units, "
        "       COALESCE(SUM(CASE WHEN expiry_date >= CURDATE() THEN units_available ELSE 0 END), 0) AS usable_units, "
        "       COALESCE(SUM(CASE WHEN expiry_date < CURDATE() THEN units_available ELSE 0 END), 0) AS expired_units "
        "FROM bloodinventory")
    data = {
        "total_units": totals["total_units"],
        "usable_units": totals["usable_units"],   # not expired
        "expired_units": totals["expired_units"],
        "records": totals["records"],
        "by_blood_group": grouped("i.blood_group"),
        "by_component_type": grouped("i.component_type"),
        "by_blood_bank": fetch_all(
            "SELECT bk.bank_id, bk.bank_name AS label, COUNT(*) AS records, "
            "       COALESCE(SUM(i.units_available), 0) AS units, "
            "       COALESCE(SUM(CASE WHEN i.expiry_date >= CURDATE() THEN i.units_available ELSE 0 END), 0) AS usable_units "
            "FROM bloodinventory i INNER JOIN bloodbank bk ON bk.bank_id = i.bank_id "
            "GROUP BY bk.bank_id, bk.bank_name ORDER BY bk.bank_id"),
    }
    return success("Inventory summary retrieved successfully", data)


@bp.get("/expiring")
def expiring_inventory():
    days = get_days()
    sql = (INVENTORY_SELECT + " AND i.expiry_date >= CURDATE() "
           "AND i.expiry_date <= DATE_ADD(CURDATE(), INTERVAL %s DAY)")
    return paginated("Expiring inventory retrieved successfully", sql, [days, days], "ORDER BY i.expiry_date, i.inventory_id")


@bp.get("/expired")
def expired_inventory():
    sql = INVENTORY_SELECT + " AND i.expiry_date < CURDATE()"
    return paginated("Expired inventory retrieved successfully", sql, [get_days()], "ORDER BY i.expiry_date, i.inventory_id")


@bp.get("/<int:inventory_id>")
def get_one(inventory_id):
    return success("Inventory record retrieved successfully", get_inventory(inventory_id))


@bp.post("")
def create_inventory():
    d = validate(get_json_body(), INVENTORY_SPEC)
    check_inventory_rules(d)
    inventory_id, _ = execute(
        "INSERT INTO bloodinventory (donation_id, bank_id, blood_group, component_type, units_available, "
        "collection_date, expiry_date) VALUES (%s, %s, %s, %s, %s, %s, %s)",
        (d["donation_id"], d["bank_id"], d["blood_group"], d["component_type"], d["units_available"],
         d["collection_date"], d["expiry_date"]),
    )
    return success("Inventory record added successfully", {"inventory_id": inventory_id}, 201)


@bp.put("/<int:inventory_id>")
def update_inventory(inventory_id):
    current = get_inventory(inventory_id)
    d = {**current, **validate(get_json_body(), INVENTORY_SPEC, partial=True)}
    check_inventory_rules(d)
    execute(
        "UPDATE bloodinventory SET donation_id=%s, bank_id=%s, blood_group=%s, component_type=%s, "
        "units_available=%s, collection_date=%s, expiry_date=%s WHERE inventory_id=%s",
        (d["donation_id"], d["bank_id"], d["blood_group"], d["component_type"], d["units_available"],
         d["collection_date"], d["expiry_date"], inventory_id),
    )
    return success("Inventory record updated successfully", get_inventory(inventory_id))


@bp.delete("/<int:inventory_id>")
def delete_inventory(inventory_id):
    get_inventory(inventory_id)
    # Fails with 409 if a blood issue references this inventory row.
    execute("DELETE FROM bloodinventory WHERE inventory_id = %s", (inventory_id,))
    return success("Inventory record deleted successfully", {"inventory_id": inventory_id})
