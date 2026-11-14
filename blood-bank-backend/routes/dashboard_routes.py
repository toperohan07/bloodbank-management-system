"""Dashboard and analytics: /api/dashboard"""
from flask import Blueprint, request

from db import fetch_all, fetch_one
from routes.inventory_routes import INVENTORY_SELECT, get_days
from utils.response import ApiError, success

bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


def get_limit(default=10):
    try:
        return min(max(int(request.args.get("limit", default)), 1), 100)
    except ValueError:
        raise ApiError("limit must be an integer")


@bp.get("/summary")
def summary():
    data = fetch_one(
        "SELECT (SELECT COUNT(*) FROM donor) AS total_donors, "
        "       (SELECT COUNT(*) FROM donation) AS total_donations, "
        "       (SELECT COUNT(*) FROM bloodbank) AS total_blood_banks, "
        "       (SELECT COUNT(*) FROM hospital) AS total_hospitals, "
        "       (SELECT COUNT(*) FROM patient) AS total_patients, "
        "       (SELECT COUNT(*) FROM staff) AS total_staff, "
        "       (SELECT COALESCE(SUM(units_available), 0) FROM bloodinventory) AS total_inventory_units, "
        "       (SELECT COALESCE(SUM(units_available), 0) FROM bloodinventory "
        "         WHERE expiry_date >= CURDATE()) AS usable_inventory_units, "
        "       (SELECT COUNT(*) FROM bloodrequest WHERE request_status = 'Pending') AS total_pending_requests, "
        "       (SELECT COALESCE(SUM(units_issued), 0) FROM bloodissue) AS total_issued_units")
    return success("Dashboard summary retrieved successfully", data)


@bp.get("/blood-groups")
def blood_groups():
    rows = fetch_all(
        "SELECT blood_group, COALESCE(SUM(units_available), 0) AS units, "
        "       COALESCE(SUM(CASE WHEN expiry_date >= CURDATE() THEN units_available ELSE 0 END), 0) AS usable_units "
        "FROM bloodinventory GROUP BY blood_group ORDER BY blood_group")
    return success("Blood group inventory retrieved successfully", rows)


@bp.get("/recent-donations")
def recent_donations():
    rows = fetch_all(
        "SELECT dn.donation_id, dn.donation_date, dn.quantity_ml, dn.donation_status, "
        "       d.donor_id, d.donor_name, d.blood_group, b.bank_id, b.bank_name "
        "FROM donation dn INNER JOIN donor d ON d.donor_id = dn.donor_id "
        "INNER JOIN bloodbank b ON b.bank_id = dn.bank_id "
        "ORDER BY dn.donation_date DESC, dn.donation_id DESC LIMIT %s", (get_limit(),))
    return success("Recent donations retrieved successfully", rows)


@bp.get("/recent-requests")
def recent_requests():
    rows = fetch_all(
        "SELECT r.request_id, r.request_date, r.blood_group, r.units_required, r.urgency, r.request_status, "
        "       p.patient_name, h.hospital_name "
        "FROM bloodrequest r INNER JOIN patient p ON p.patient_id = r.patient_id "
        "INNER JOIN hospital h ON h.hospital_id = r.hospital_id "
        "ORDER BY r.request_date DESC, r.request_id DESC LIMIT %s", (get_limit(),))
    return success("Recent requests retrieved successfully", rows)


@bp.get("/expiry-alerts")
def expiry_alerts():
    days = get_days()
    rows = fetch_all(
        INVENTORY_SELECT + " AND i.expiry_date >= CURDATE() AND i.expiry_date <= DATE_ADD(CURDATE(), INTERVAL %s DAY) "
        "ORDER BY i.expiry_date, i.inventory_id", (days, days))
    return success("Expiry alerts retrieved successfully", rows)


@bp.get("/donation-statistics")
def donation_statistics():
    group_by = request.args.get("group_by", "month")
    if group_by == "month":
        sql = ("SELECT DATE_FORMAT(donation_date, '%Y-%m') AS period, COUNT(*) AS donations, "
               "COALESCE(SUM(quantity_ml), 0) AS total_ml FROM donation GROUP BY period ORDER BY period")
    elif group_by == "date":
        sql = ("SELECT donation_date AS period, COUNT(*) AS donations, "
               "COALESCE(SUM(quantity_ml), 0) AS total_ml FROM donation GROUP BY donation_date ORDER BY donation_date")
    else:
        raise ApiError("group_by must be 'month' or 'date'")
    return success("Donation statistics retrieved successfully", fetch_all(sql))
