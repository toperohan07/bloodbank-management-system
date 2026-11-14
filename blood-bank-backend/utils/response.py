"""Consistent JSON responses: {"success": bool, "message": str, "data": ...}."""
from flask import jsonify, request


class ApiError(Exception):
    """Raise this anywhere in a route to return an error response."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


def success(message, data=None, status=200, **extra):
    body = {"success": True, "message": message, "data": data}
    body.update(extra)  # e.g. pagination info
    return jsonify(body), status


def error(message, status=400):
    return jsonify({"success": False, "message": message, "data": None}), status


def get_pagination(default_limit=50, max_limit=200):
    """Read ?page= and ?limit= from the query string."""
    try:
        page = max(int(request.args.get("page", 1)), 1)
        limit = int(request.args.get("limit", default_limit))
    except ValueError:
        raise ApiError("page and limit must be integers")
    limit = min(max(limit, 1), max_limit)
    return page, limit


def paginated(message, select_sql, params=(), order_by=""):
    """Run `select_sql` (+ optional ORDER BY) with LIMIT/OFFSET and return a response
    that includes a "pagination" block. All column names in select_sql must be unique."""
    from db import fetch_all, fetch_one

    page, limit = get_pagination()
    total = fetch_one("SELECT COUNT(*) AS total FROM (" + select_sql + ") AS counted", params)["total"]
    rows = fetch_all(select_sql + " " + order_by + " LIMIT %s OFFSET %s", tuple(params) + (limit, (page - 1) * limit))
    pagination = {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit}
    return success(message, rows, pagination=pagination)


def require_row(row, message):
    """Return `row`, or raise a 404 if it is None."""
    if row is None:
        raise ApiError(message, 404)
    return row
