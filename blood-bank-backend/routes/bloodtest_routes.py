"""Blood test records: /api/bloodtests

These are academic demonstration records, not clinical diagnoses.
"""
from flask import Blueprint, request

from db import execute, fetch_one
from utils.response import ApiError, paginated, require_row, success
from utils.validation import get_json_body, validate

bp = Blueprint("bloodtests", __name__, url_prefix="/api/bloodtests")

RESULTS = ["Negative", "Positive", "Pending"]
TEST_SPEC = {
    "donation_id": {"type": "int", "required": True, "min": 1},
    "test_date": {"type": "date"},
    "hiv_result": {"max_len": 20, "choices": RESULTS, "default": "Pending"},
    "hepatitis_result": {"max_len": 20, "choices": RESULTS, "default": "Pending"},
    "malaria_result": {"max_len": 20, "choices": RESULTS, "default": "Pending"},
    "overall_status": {"max_len": 20, "choices": ["Safe", "Unsafe", "Pending"], "default": "Pending"},
}

TEST_SELECT = (
    "SELECT t.test_id, t.donation_id, d.donor_id, d.donor_name, t.test_date, t.hiv_result, t.hepatitis_result, "
    "       t.malaria_result, t.overall_status "
    "FROM bloodtest t "
    "INNER JOIN donation dn ON dn.donation_id = t.donation_id "
    "INNER JOIN donor d ON d.donor_id = dn.donor_id WHERE 1=1"
)


def get_test(test_id):
    return require_row(fetch_one(TEST_SELECT + " AND t.test_id = %s", (test_id,)), "Blood test not found")


def check_rules(d):
    """'Safe' is only allowed when all three results are Negative."""
    if d["overall_status"] == "Safe" and not (
            d["hiv_result"] == d["hepatitis_result"] == d["malaria_result"] == "Negative"):
        raise ApiError("overall_status can be 'Safe' only when hiv_result, hepatitis_result and malaria_result "
                       "are all 'Negative'")


def list_with(extra_where, message):
    sql, params = TEST_SELECT + extra_where, []
    if request.args.get("donation_id"):
        sql += " AND t.donation_id = %s"
        params.append(request.args["donation_id"])
    return paginated(message, sql, params, "ORDER BY t.test_id")


@bp.get("")
def list_tests():
    return list_with("", "Blood tests retrieved successfully")


@bp.get("/safe")
def safe_tests():
    return list_with(" AND t.overall_status = 'Safe'", "Safe blood tests retrieved successfully")


@bp.get("/unsafe")
def unsafe_tests():
    return list_with(" AND (t.overall_status <> 'Safe' OR t.overall_status IS NULL)",
                     "Not-safe blood tests retrieved successfully")


@bp.get("/<int:test_id>")
def get_one(test_id):
    return success("Blood test retrieved successfully", get_test(test_id))


@bp.post("")
def create_test():
    d = validate(get_json_body(), TEST_SPEC)
    check_rules(d)
    test_id, _ = execute(
        "INSERT INTO bloodtest (donation_id, test_date, hiv_result, hepatitis_result, malaria_result, "
        "overall_status) VALUES (%s, %s, %s, %s, %s, %s)",
        (d["donation_id"], d["test_date"], d["hiv_result"], d["hepatitis_result"], d["malaria_result"],
         d["overall_status"]))
    return success("Blood test recorded successfully", {"test_id": test_id}, 201)


@bp.put("/<int:test_id>")
def update_test(test_id):
    d = {**get_test(test_id), **validate(get_json_body(), TEST_SPEC, partial=True)}
    check_rules(d)
    execute(
        "UPDATE bloodtest SET donation_id=%s, test_date=%s, hiv_result=%s, hepatitis_result=%s, "
        "malaria_result=%s, overall_status=%s WHERE test_id=%s",
        (d["donation_id"], d["test_date"], d["hiv_result"], d["hepatitis_result"], d["malaria_result"],
         d["overall_status"], test_id))
    return success("Blood test updated successfully", get_test(test_id))


@bp.delete("/<int:test_id>")
def delete_test(test_id):
    get_test(test_id)
    execute("DELETE FROM bloodtest WHERE test_id = %s", (test_id,))
    return success("Blood test deleted successfully", {"test_id": test_id})
