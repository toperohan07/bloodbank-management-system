"""Hospital management: /api/hospitals"""
from flask import Blueprint, request

from db import execute, fetch_all, fetch_one
from utils.response import paginated, require_row, success
from utils.validation import get_json_body, validate

bp = Blueprint("hospitals", __name__, url_prefix="/api/hospitals")

HOSPITAL_SPEC = {
    "hospital_name": {"required": True, "max_len": 100},
    "address": {"max_len": 200},
    "city": {"max_len": 50},
    "contact_number": {"type": "phone", "max_len": 15},
    "email": {"type": "email", "max_len": 100},
}
COLUMNS = "hospital_id, hospital_name, address, city, contact_number, email"


def get_hospital(hospital_id):
    return require_row(fetch_one("SELECT " + COLUMNS + " FROM hospital WHERE hospital_id = %s", (hospital_id,)),
                       "Hospital not found")


@bp.get("")
def list_hospitals():
    sql = "SELECT " + COLUMNS + " FROM hospital WHERE 1=1"
    params = []
    if request.args.get("city"):
        sql += " AND city = %s"
        params.append(request.args["city"])
    if request.args.get("search"):
        sql += " AND hospital_name LIKE %s"
        params.append("%" + request.args["search"] + "%")
    return paginated("Hospitals retrieved successfully", sql, params, "ORDER BY hospital_id")


@bp.get("/<int:hospital_id>")
def get_one(hospital_id):
    return success("Hospital retrieved successfully", get_hospital(hospital_id))


@bp.post("")
def create_hospital():
    d = validate(get_json_body(), HOSPITAL_SPEC)
    hospital_id, _ = execute(
        "INSERT INTO hospital (hospital_name, address, city, contact_number, email) VALUES (%s, %s, %s, %s, %s)",
        (d["hospital_name"], d["address"], d["city"], d["contact_number"], d["email"]))
    return success("Hospital created successfully", {"hospital_id": hospital_id}, 201)


@bp.put("/<int:hospital_id>")
def update_hospital(hospital_id):
    d = {**get_hospital(hospital_id), **validate(get_json_body(), HOSPITAL_SPEC, partial=True)}
    execute(
        "UPDATE hospital SET hospital_name=%s, address=%s, city=%s, contact_number=%s, email=%s "
        "WHERE hospital_id=%s",
        (d["hospital_name"], d["address"], d["city"], d["contact_number"], d["email"], hospital_id))
    return success("Hospital updated successfully", get_hospital(hospital_id))


@bp.delete("/<int:hospital_id>")
def delete_hospital(hospital_id):
    get_hospital(hospital_id)
    # Fails with 409 if the hospital has blood requests.
    execute("DELETE FROM hospital WHERE hospital_id = %s", (hospital_id,))
    return success("Hospital deleted successfully", {"hospital_id": hospital_id})


@bp.get("/<int:hospital_id>/requests")
def hospital_requests(hospital_id):
    get_hospital(hospital_id)
    rows = fetch_all(
        "SELECT r.request_id, r.patient_id, p.patient_name, r.blood_group, r.units_required, "
        "       r.request_date, r.urgency, r.request_status "
        "FROM bloodrequest r INNER JOIN patient p ON p.patient_id = r.patient_id "
        "WHERE r.hospital_id = %s ORDER BY r.request_date DESC, r.request_id DESC", (hospital_id,))
    return success("Hospital requests retrieved successfully", rows)
