"""Patient management: /api/patients"""
from flask import Blueprint, request

from db import execute, fetch_one
from utils.response import paginated, require_row, success
from utils.validation import BLOOD_GROUPS, get_json_body, validate

bp = Blueprint("patients", __name__, url_prefix="/api/patients")

PATIENT_SPEC = {
    "patient_name": {"required": True, "max_len": 100},
    "age": {"type": "int", "min": 0, "max": 120},
    "gender": {"max_len": 10, "choices": ["Male", "Female", "Other"]},
    "blood_group": {"required": True, "choices": BLOOD_GROUPS},
    "contact_number": {"type": "phone", "max_len": 15},
    "city": {"max_len": 50},
}
COLUMNS = "patient_id, patient_name, age, gender, blood_group, contact_number, city"


def get_patient(patient_id):
    return require_row(fetch_one("SELECT " + COLUMNS + " FROM patient WHERE patient_id = %s", (patient_id,)),
                       "Patient not found")


@bp.get("")
def list_patients():
    sql = "SELECT " + COLUMNS + " FROM patient WHERE 1=1"
    params = []
    if request.args.get("blood_group"):
        sql += " AND blood_group = %s"
        params.append(request.args["blood_group"])
    if request.args.get("city"):
        sql += " AND city = %s"
        params.append(request.args["city"])
    if request.args.get("search"):
        sql += " AND patient_name LIKE %s"
        params.append("%" + request.args["search"] + "%")
    return paginated("Patients retrieved successfully", sql, params, "ORDER BY patient_id")


@bp.get("/<int:patient_id>")
def get_one(patient_id):
    return success("Patient retrieved successfully", get_patient(patient_id))


@bp.post("")
def create_patient():
    d = validate(get_json_body(), PATIENT_SPEC)
    patient_id, _ = execute(
        "INSERT INTO patient (patient_name, age, gender, blood_group, contact_number, city) "
        "VALUES (%s, %s, %s, %s, %s, %s)",
        (d["patient_name"], d["age"], d["gender"], d["blood_group"], d["contact_number"], d["city"]))
    return success("Patient registered successfully", {"patient_id": patient_id}, 201)


@bp.put("/<int:patient_id>")
def update_patient(patient_id):
    d = {**get_patient(patient_id), **validate(get_json_body(), PATIENT_SPEC, partial=True)}
    execute(
        "UPDATE patient SET patient_name=%s, age=%s, gender=%s, blood_group=%s, contact_number=%s, city=%s "
        "WHERE patient_id=%s",
        (d["patient_name"], d["age"], d["gender"], d["blood_group"], d["contact_number"], d["city"], patient_id))
    return success("Patient updated successfully", get_patient(patient_id))


@bp.delete("/<int:patient_id>")
def delete_patient(patient_id):
    get_patient(patient_id)
    # Fails with 409 if the patient has blood requests.
    execute("DELETE FROM patient WHERE patient_id = %s", (patient_id,))
    return success("Patient deleted successfully", {"patient_id": patient_id})
