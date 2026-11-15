# Blood Bank API – Documentation for the Frontend

Everything you need to build the HTML/CSS/JavaScript frontend is in this file.
You do **not** need to read the Python code.

- **Backend base URL:** `http://127.0.0.1:5000` (all endpoints below are relative to it)
- **Format:** every request body and every response is JSON (`Content-Type: application/json`)
- **Authentication:** none (the database has no user/login table)
- **CORS:** enabled for **all origins** (`Access-Control-Allow-Origin: *`) so a page opened from `file://`, Live Server (`http://127.0.0.1:5500`) etc. can call the API. The backend admin can restrict it with the `CORS_ORIGINS` environment variable.

## Contents
1. [Conventions](#1-conventions) – response format, errors, pagination, dates
2. [Connecting the frontend](#2-connecting-the-frontend) – `fetch()` examples
3. [General](#3-general) · 4. [Donors](#4-donors) · 5. [Donations](#5-donations) · 6. [Inventory](#6-blood-inventory) · 7. [Blood banks](#7-blood-banks) · 8. [Hospitals](#8-hospitals) · 9. [Patients](#9-patients) · 10. [Staff](#10-staff) · 11. [Blood requests](#11-blood-requests) · 12. [Blood issues](#12-blood-issues) · 13. [Blood tests](#13-blood-tests) · 14. [Dashboard](#14-dashboard)
15. [Business rules & limitations](#15-business-rules--known-limitations)

---

## 1. Conventions

### Response envelope (always)
```json
{ "success": true,  "message": "Donors retrieved successfully", "data": [ ... ] }
{ "success": false, "message": "Donor not found",               "data": null }
```
Always check `success` (or `response.ok`) and show `message` to the user on failure.

### Status codes
| Code | Meaning |
|---|---|
| 200 | OK (GET, PUT, DELETE) |
| 201 | Created (POST) |
| 400 | Invalid request: bad JSON, missing/invalid field, bad query parameter, DB check rule (e.g. age 18–65) |
| 404 | Record (or URL) not found |
| 405 | HTTP method not allowed on that URL |
| 409 | Conflict: duplicate email/phone, foreign-key problem (record referenced elsewhere / referenced record does not exist), or a business-rule conflict (e.g. insufficient stock) |
| 500 | Unexpected server error (details are only in the server log) |
| 503 | MySQL is not reachable |

### Pagination (all list endpoints except where noted)
Query: `?page=1&limit=50` (`page` ≥ 1, default 1; `limit` 1–200, default 50). The response has an extra top-level `pagination` key:
```json
{ "success": true, "message": "...", "data": [ ... ],
  "pagination": { "page": 1, "limit": 50, "total": 20, "pages": 1 } }
```
Endpoints without pagination are marked **(not paginated)**.

### Dates, nulls and numbers
- Dates are strings `"YYYY-MM-DD"` (send and receive). Invalid dates → 400.
- Optional fields you leave out are stored as `null`. In a `PUT` you may send `null` to clear an optional field.
- `PUT` is a **partial update**: send only the fields you want to change; the others keep their value.
- Unknown JSON fields are ignored. Strings are trimmed; an empty string is rejected with 400.

### Allowed values
| Field | Allowed values |
|---|---|
| `blood_group` (everywhere) | `A+ A- B+ B- AB+ AB- O+ O-` |
| `gender` | `Male`, `Female`, `Other` |
| `donation_status` | `Pending` (default), `Accepted`, `Rejected`, `Deferred` |
| `urgency` | `Low`, `Normal` (default), `High`, `Critical` |
| `request_status` | `Pending` (default), `Approved`, `Fulfilled`, `Rejected`, `Cancelled` |
| `hiv_result`, `hepatitis_result`, `malaria_result` | `Negative`, `Positive`, `Pending` (default) |
| `overall_status` | `Safe`, `Unsafe`, `Pending` (default) |
| `expiry_status` (inventory, read-only) | `valid`, `expiring_soon`, `expired`, `unknown` |

### Phone / email rules
`phone` / `contact_number`: 7–15 digits, optional leading `+`. `email`: normal e-mail format. Donor `phone`/`email`, staff `phone`/`email`, blood bank `email` and hospital `email` must be **unique** → duplicate gives **409** (`"Duplicate record: a record with this email already exists"`).

### Typical errors (same shape on every endpoint)
```json
{ "success": false, "message": "blood_group is required", "data": null }          // 400
{ "success": false, "message": "Donor not found", "data": null }                  // 404
{ "success": false, "message": "Duplicate record: a record with this phone already exists", "data": null } // 409
{ "success": false, "message": "Cannot delete or change this record because other records depend on it", "data": null } // 409
{ "success": false, "message": "Referenced record does not exist (invalid foreign key)", "data": null } // 409
```

---

## 2. Connecting the frontend

```javascript
const API = "http://127.0.0.1:5000";

// One helper for every call. Throws an Error with the backend's message on failure.
async function api(path, method = "GET", body = null) {
  const options = { method, headers: { "Content-Type": "application/json" } };
  if (body) options.body = JSON.stringify(body);

  let response;
  try {
    response = await fetch(API + path, options);
  } catch (networkError) {
    throw new Error("Cannot reach the server. Is the backend running on port 5000?");
  }
  const result = await response.json();          // {success, message, data, pagination?}
  if (!result.success) throw new Error(result.message);
  return result;                                  // use result.data
}

// GET with filters
const donors = await api("/api/donors?blood_group=O%2B&city=Pune&page=1&limit=20");
console.log(donors.data, donors.pagination);

// POST
try {
  const created = await api("/api/donors", "POST", {
    donor_name: "Rahul Sharma", age: 22, gender: "Male", blood_group: "O+",
    phone: "9876543210", email: "rahul@example.com", city: "Pune", last_donation_date: null
  });
  alert(created.message + " (id " + created.data.donor_id + ")");
} catch (err) {
  alert(err.message);      // e.g. "Duplicate record: a record with this email already exists"
}

// PUT (partial) and DELETE
await api("/api/donors/21", "PUT", { city: "Mumbai" });
await api("/api/donors/21", "DELETE");
```
**Important:** `+` in a blood group inside a URL must be encoded as `%2B` (use `encodeURIComponent("O+")`), otherwise it is read as a space.

---

## 3. General

### Root
`GET /` – Purpose: app name, status, API version. No parameters.
```json
{ "success": true, "message": "Backend is running",
  "data": { "app": "Blood Bank and Donor Management System", "status": "running", "version": "1.0.0" } }
```
Status: 200.

### Health check
`GET /api/health` – Purpose: checks Flask **and** the MySQL connection. No parameters.
```json
{ "success": true, "message": "Flask and MySQL are running", "data": { "flask": "ok", "mysql": "connected" } }
```
Error (503): `{ "success": false, "message": "Database is unavailable", "data": null }`
Status: 200, 503.

---

## 4. Donors

Donor object (`donor` table):
```json
{ "donor_id": 1, "donor_name": "Donor 1", "age": 22, "gender": "Male", "blood_group": "A+",
  "phone": "9800000001", "email": "donor1@example.com", "city": "Pune", "last_donation_date": "2026-11-13" }
```
Request fields: `donor_name` (string ≤100, **required**), `age` (int 18–65), `gender`, `blood_group` (**required**), `phone` (unique), `email` (unique), `city` (≤50), `last_donation_date` (date).

### List donors – `GET /api/donors`
Purpose: all donors. Required: none. Optional query: `blood_group`, `city` (exact match), `search` (part of `donor_name`), `page`, `limit`.
Response: `{"success":true,"message":"Donors retrieved successfully","data":[ <donor>, ... ],"pagination":{...}}`
Errors: 400 (`page`/`limit` not integers). Status: 200, 400.

### Get donor – `GET /api/donors/<donor_id>`
Purpose: one donor. Response `data`: the donor object. Error 404 `"Donor not found"`. Status: 200, 404.

### Register donor – `POST /api/donors`
Body:
```json
{ "donor_name": "Rahul Sharma", "age": 22, "gender": "Male", "blood_group": "O+",
  "phone": "9876543210", "email": "rahul@example.com", "city": "Pune", "last_donation_date": null }
```
Response (201): `{"success":true,"message":"Donor registered successfully","data":{"donor_id":21}}`
Errors: 400 (`"donor_name is required"`, `"age must be at least 18"`, `"blood_group must be one of: A+, A-, ..."`), 409 duplicate phone/email. Status: 201, 400, 409.

### Update donor – `PUT /api/donors/<donor_id>`
Body: any subset of the fields above, e.g. `{ "city": "Mumbai", "phone": "9876500000" }`.
Response (200): `{"success":true,"message":"Donor updated successfully","data": <updated donor object>}`
Errors: 400, 404, 409 (duplicate). Status: 200, 400, 404, 409.

### Delete donor – `DELETE /api/donors/<donor_id>`
Purpose: deletes a donor **only if they have no donations** (foreign key). Response (200): `{"success":true,"message":"Donor deleted successfully","data":{"donor_id":21}}`
Error 409: `"Cannot delete or change this record because other records depend on it"`. Status: 200, 404, 409.

### Donor's donation history – `GET /api/donors/<donor_id>/donations` *(not paginated)*
Response `data`: 
```json
[ { "donation_id": 1, "donation_date": "2026-11-13", "quantity_ml": 450, "donation_status": "Accepted",
    "bank_id": 1, "bank_name": "Blood Bank Branch 1", "staff_id": 1, "staff_name": "Staff Member 1" } ]
```
Status: 200, 404 (donor not found).

---

## 5. Donations

Donation object: `{ "donation_id": 1, "donor_id": 1, "bank_id": 1, "staff_id": 1, "donation_date": "2026-11-13", "quantity_ml": 450, "donation_status": "Accepted" }`
Request fields: `donor_id`, `bank_id`, `staff_id` (ints, **required**), `donation_date` (**required**), `quantity_ml` (int 1–2000), `donation_status`.

### List donations – `GET /api/donations`
Optional query: `donor_id`, `bank_id`, `staff_id`, `donation_status`, `from_date`, `to_date` (YYYY-MM-DD), `page`, `limit`. Response `data`: donation objects, newest first. Status: 200, 400.

### Donation history (with joins) – `GET /api/donations/history`
Purpose: donations joined with donor, blood bank and staff. Optional query: `bank_id`, `blood_group` (donor's group), `from_date`, `to_date`, `page`, `limit`.
```json
{ "success": true, "message": "Donation history retrieved successfully",
  "data": [ { "donation_id": 1, "donation_date": "2026-11-13", "quantity_ml": 450, "donation_status": "Accepted",
              "donor_id": 1, "donor_name": "Donor 1", "blood_group": "A+",
              "bank_id": 1, "bank_name": "Blood Bank Branch 1", "staff_id": 1, "staff_name": "Staff Member 1" } ],
  "pagination": { "page": 1, "limit": 50, "total": 20, "pages": 1 } }
```
Status: 200, 400.

### Get donation – `GET /api/donations/<donation_id>`
`data`: donation object. Status: 200, 404 (`"Donation not found"`).

### Register donation – `POST /api/donations`
Body:
```json
{ "donor_id": 1, "bank_id": 1, "staff_id": 1, "donation_date": "2026-11-14", "quantity_ml": 450, "donation_status": "Accepted" }
```
Response (201): `{"success":true,"message":"Donation registered successfully","data":{"donation_id":21}}`
Side effect (same transaction): the donor's `last_donation_date` is moved forward to `donation_date` if it is later than the current value.
Errors: 400 validation; 409 `"Referenced record does not exist (invalid foreign key)"` if donor/bank/staff id is wrong. Status: 201, 400, 409.

### Update donation – `PUT /api/donations/<donation_id>`
Body: any subset of the request fields. Response 200 with the updated donation. Status: 200, 400, 404, 409.

### Delete donation – `DELETE /api/donations/<donation_id>`
Allowed only if no inventory row and no blood test reference it. Response `{"success":true,"message":"Donation deleted successfully","data":{"donation_id":21}}`. Status: 200, 404, 409.

---

## 6. Blood inventory

Inventory object (response):
```json
{ "inventory_id": 1, "donation_id": 1, "bank_id": 1, "bank_name": "Blood Bank Branch 1",
  "blood_group": "A+", "component_type": "Whole Blood", "units_available": 1,
  "collection_date": "2026-11-13", "expiry_date": "2026-12-25",
  "expiry_status": "valid", "test_status": "Safe" }
```
`expiry_status`: `expired` (expiry before today) · `expiring_soon` (within `days`, default 30) · `valid` · `unknown` (no expiry date). `test_status` is the `overall_status` of the blood test of that donation (`null` if untested).
**Expired stock cannot be issued** (see `/api/issues`).
Request fields: `donation_id` (**required**, must be unique – one inventory row per donation), `bank_id` (**required**), `blood_group` (**required**, must equal the donor's blood group), `component_type` (≤30, e.g. `"Whole Blood"`), `units_available` (int ≥ 0, **required**), `collection_date`, `expiry_date` (must not be before `collection_date`).

### List inventory – `GET /api/inventory`
Optional query: `blood_group`, `component_type`, `bank_id`, `expiry_status` (`expired` | `expiring_soon` | `valid`), `days` (window for "expiring soon", default 30), `page`, `limit`. Status: 200, 400 (bad `expiry_status`).

### Inventory summary – `GET /api/inventory/summary` *(not paginated)*
```json
{ "success": true, "message": "Inventory summary retrieved successfully",
  "data": { "total_units": 20, "usable_units": 20, "expired_units": 0, "records": 20,
            "by_blood_group":    [ { "label": "A-", "records": 3, "units": 3, "usable_units": 3 } ],
            "by_component_type": [ { "label": "Whole Blood", "records": 20, "units": 20, "usable_units": 20 } ],
            "by_blood_bank":     [ { "bank_id": 1, "label": "Blood Bank Branch 1", "records": 1, "units": 1, "usable_units": 1 } ] } }
```
`usable_units` = units that are not expired. Status: 200.

### Expiring inventory – `GET /api/inventory/expiring`
Stock that expires from today up to `days` days ahead (default 30), soonest first. Optional: `days`, `page`, `limit`. Items have the inventory object shape. Status: 200, 400.

### Expired inventory – `GET /api/inventory/expired`
Stock whose `expiry_date` is before today. Optional: `page`, `limit`. Status: 200.

### Get inventory record – `GET /api/inventory/<inventory_id>`
`data`: inventory object. Status: 200, 404 (`"Inventory record not found"`).

### Add inventory – `POST /api/inventory`
Body:
```json
{ "donation_id": 21, "bank_id": 1, "blood_group": "O+", "component_type": "Whole Blood",
  "units_available": 1, "collection_date": "2026-11-14", "expiry_date": "2026-12-26" }
```
Response (201): `{"success":true,"message":"Inventory record added successfully","data":{"inventory_id":21}}`
Errors: 400 (`"blood_group does not match the blood group of the donor who made this donation"`, `"expiry_date must not be before collection_date"`); 409 (donation does not exist, or that donation already has an inventory row). Status: 201, 400, 409.

### Update inventory – `PUT /api/inventory/<inventory_id>`
Body: any subset of the request fields. Response 200 with the updated inventory object. Status: 200, 400, 404, 409.

### Delete inventory – `DELETE /api/inventory/<inventory_id>`
Allowed only if no issue record uses it. Response `{"success":true,"message":"Inventory record deleted successfully","data":{"inventory_id":21}}`. Status: 200, 404, 409.

---

## 7. Blood banks

Object: `{ "bank_id": 1, "bank_name": "Blood Bank Branch 1", "address": "Sector 1, Main Road", "city": "Pune", "contact_number": "9100000001", "email": "bank1@example.com" }`
Request fields: `bank_name` (**required**, ≤100), `address` (≤200), `city` (≤50), `contact_number`, `email` (unique).

### List – `GET /api/bloodbanks`
Optional query: `city`, `search` (part of `bank_name`), `page`, `limit`. Status: 200, 400.

### Get – `GET /api/bloodbanks/<bank_id>`
Status: 200, 404 (`"Blood bank not found"`).

### Create – `POST /api/bloodbanks`
Body: `{ "bank_name": "City Blood Bank", "address": "12 MG Road", "city": "Pune", "contact_number": "9100000099", "email": "city@example.com" }`
Response (201): `{"success":true,"message":"Blood bank created successfully","data":{"bank_id":21}}`. Status: 201, 400, 409.

### Update – `PUT /api/bloodbanks/<bank_id>`
Partial body. Response 200 with updated object. Status: 200, 400, 404, 409.

### Delete – `DELETE /api/bloodbanks/<bank_id>`
Allowed only if the bank has no staff, donations or inventory. Response `{"success":true,"message":"Blood bank deleted successfully","data":{"bank_id":21}}`. Status: 200, 404, 409.

### Bank inventory – `GET /api/bloodbanks/<bank_id>/inventory`
Inventory objects of this bank. Optional query: `blood_group`, `component_type`, `expiry_status`, `days`, `page`, `limit`. Status: 200, 404.

### Bank staff – `GET /api/bloodbanks/<bank_id>/staff` *(not paginated)*
`data`: `[ { "staff_id": 1, "staff_name": "Staff Member 1", "designation": "Manager", "phone": "9500000001", "email": "staff1@example.com", "bank_id": 1 } ]`. Status: 200, 404.

---

## 8. Hospitals

Object: `{ "hospital_id": 1, "hospital_name": "Hospital 1", "address": "Hospital Road, Area 1", "city": "Pune", "contact_number": "9600000001", "email": "hospital1@example.com" }`
Request fields: `hospital_name` (**required**, ≤100), `address`, `city`, `contact_number`, `email` (unique).

| Endpoint | Purpose | Notes |
|---|---|---|
| `GET /api/hospitals` | List | Query: `city`, `search` (name), `page`, `limit`. Status 200, 400 |
| `GET /api/hospitals/<hospital_id>` | One hospital | 200, 404 `"Hospital not found"` |
| `POST /api/hospitals` | Create | Body as above → 201 `{"data":{"hospital_id":21},"message":"Hospital created successfully"}`; 400, 409 |
| `PUT /api/hospitals/<hospital_id>` | Partial update | 200 (updated object), 400, 404, 409 |
| `DELETE /api/hospitals/<hospital_id>` | Delete | Only if it has no blood requests. 200 `{"data":{"hospital_id":21}}`, 404, 409 |
| `GET /api/hospitals/<hospital_id>/requests` | Requests of this hospital *(not paginated)* | 200, 404 |

`GET /api/hospitals/<id>/requests` response `data`:
```json
[ { "request_id": 1, "patient_id": 1, "patient_name": "Patient 1", "blood_group": "A+",
    "units_required": 1, "request_date": "2026-11-14", "urgency": "Normal", "request_status": "Pending" } ]
```
Every response uses the standard envelope, e.g. `{"success": true, "message": "Hospitals retrieved successfully", "data": [...], "pagination": {...}}`.

---

## 9. Patients

Object: `{ "patient_id": 1, "patient_name": "Patient 1", "age": 21, "gender": "Female", "blood_group": "A+", "contact_number": "9700000001", "city": "Pune" }`
Request fields: `patient_name` (**required**), `age` (int 0–120), `gender`, `blood_group` (**required**), `contact_number`, `city`. (`contact_number` is **not** unique for patients.)

| Endpoint | Purpose | Notes |
|---|---|---|
| `GET /api/patients` | List | Query: `blood_group`, `city`, `search` (name), `page`, `limit`. 200, 400 |
| `GET /api/patients/<patient_id>` | One patient | 200, 404 `"Patient not found"` |
| `POST /api/patients` | Register | Body e.g. `{"patient_name":"Anita Rao","age":40,"gender":"Female","blood_group":"B+","contact_number":"9700000099","city":"Pune"}` → 201 `{"message":"Patient registered successfully","data":{"patient_id":21}}`; 400 |
| `PUT /api/patients/<patient_id>` | Partial update | 200 (updated object), 400, 404 |
| `DELETE /api/patients/<patient_id>` | Delete | Only if the patient has no blood requests. 200 `{"data":{"patient_id":21}}`, 404, 409 |

---

## 10. Staff

Object: `{ "staff_id": 1, "staff_name": "Staff Member 1", "designation": "Manager", "phone": "9500000001", "email": "staff1@example.com", "bank_id": 1 }`
Request fields: `staff_name` (**required**), `designation` (≤50), `phone` (unique), `email` (unique), `bank_id` (int, may be `null`).

| Endpoint | Purpose | Notes |
|---|---|---|
| `GET /api/staff` | List | Query: `bank_id`, `designation`, `search` (name), `page`, `limit`. 200, 400 |
| `GET /api/staff/<staff_id>` | One staff member | 200, 404 `"Staff member not found"` |
| `POST /api/staff` | Create | Body e.g. `{"staff_name":"Meera Joshi","designation":"Technician","phone":"9500000099","email":"meera@example.com","bank_id":1}` → 201 `{"message":"Staff member created successfully","data":{"staff_id":21}}`; 400, 409 (duplicate phone/email, or unknown `bank_id`) |
| `PUT /api/staff/<staff_id>` | Partial update | 200 (updated object), 400, 404, 409 |
| `DELETE /api/staff/<staff_id>` | Delete | Only if the person handled no donations/issues. 200 `{"data":{"staff_id":21}}`, 404, 409 |
| `GET /api/staff/<staff_id>/donations` | Donations handled *(not paginated)* | 200, 404 |

`GET /api/staff/<id>/donations` response `data`:
```json
[ { "donation_id": 1, "donation_date": "2026-11-13", "quantity_ml": 450, "donation_status": "Accepted",
    "donor_id": 1, "donor_name": "Donor 1", "blood_group": "A+", "bank_id": 1, "bank_name": "Blood Bank Branch 1" } ]
```

---

## 11. Blood requests

Request object (response):
```json
{ "request_id": 1, "patient_id": 1, "patient_name": "Patient 1", "hospital_id": 1, "hospital_name": "Hospital 1",
  "blood_group": "A+", "units_required": 1, "request_date": "2026-11-14", "urgency": "Normal",
  "request_status": "Pending", "units_issued": 1 }
```
`units_issued` is calculated (sum of issued units for this request).
Request fields: `patient_id`, `hospital_id` (**required**), `blood_group` (**required**), `units_required` (int ≥ 1, **required**), `request_date` (default: today), `urgency` (default `Normal`), `request_status` (default `Pending`).

### List requests – `GET /api/requests`
Optional query: `blood_group`, `urgency`, `request_status`, `hospital_id`, `patient_id`, `page`, `limit`. Status: 200, 400.

### Pending requests – `GET /api/requests/pending`
Requests with `request_status = Pending`, most urgent first (Critical → Low), then oldest. Optional: `blood_group`, `urgency`, `hospital_id`, `patient_id`, `page`, `limit`. Status: 200.

### Request summary – `GET /api/requests/summary` *(not paginated)*
```json
{ "success": true, "message": "Request summary retrieved successfully",
  "data": { "total_requests": 20, "total_units_required": 20,
            "by_status":      [ { "label": "Pending", "requests": 20, "units_required": 20 } ],
            "by_urgency":     [ { "label": "High",    "requests": 6,  "units_required": 6 } ],
            "by_blood_group": [ { "label": "A-",      "requests": 3,  "units_required": 3 } ] } }
```
Status: 200.

### Get request – `GET /api/requests/<request_id>`
Status: 200, 404 (`"Blood request not found"`).

### Create request – `POST /api/requests`
Body: `{ "patient_id": 1, "hospital_id": 2, "blood_group": "A+", "units_required": 2, "urgency": "High" }`
Response (201): `{"success":true,"message":"Blood request created successfully","data":{"request_id":21}}`
Errors: 400 validation; 409 unknown `patient_id`/`hospital_id`. Status: 201, 400, 409.

### Update request / status – `PUT /api/requests/<request_id>`
Body: any subset, e.g. `{ "request_status": "Approved" }`. Response 200 with the updated request object.
Errors: 400; 404; 409 (`units_required` lower than already issued, or bad foreign key). Status: 200, 400, 404, 409.

### Delete request – `DELETE /api/requests/<request_id>`
Allowed only if no blood has been issued against it. Response `{"success":true,"message":"Blood request deleted successfully","data":{"request_id":21}}`. Status: 200, 404, 409.

---

## 12. Blood issues

Issue object: `{ "issue_id": 1, "request_id": 1, "inventory_id": 1, "staff_id": 1, "issue_date": "2026-11-01", "units_issued": 1 }`

### List issues – `GET /api/issues`
Optional query: `request_id`, `inventory_id`, `staff_id`, `page`, `limit`. Status: 200.

### Issue history – `GET /api/issues/history`
Issues joined with request, hospital, patient, inventory, blood bank and staff. Same optional filters as above.
```json
{ "success": true, "message": "Issue history retrieved successfully",
  "data": [ { "issue_id": 20, "issue_date": "2026-11-14", "units_issued": 1,
              "request_id": 20, "requested_blood_group": "B-", "units_required": 1, "urgency": "Normal", "request_status": "Pending",
              "hospital_id": 20, "hospital_name": "Hospital 20", "hospital_city": "Pune",
              "patient_id": 20, "patient_name": "Patient 20",
              "inventory_id": 20, "inventory_blood_group": "B-", "component_type": "Whole Blood", "expiry_date": "2026-12-06",
              "bank_id": 20, "bank_name": "Blood Bank Branch 20", "staff_id": 20, "staff_name": "Staff Member 20" } ],
  "pagination": { "page": 1, "limit": 50, "total": 20, "pages": 1 } }
```
Status: 200.

### Get issue – `GET /api/issues/<issue_id>`
Status: 200, 404 (`"Issue record not found"`).

### Issue blood – `POST /api/issues`
Records the issue of one inventory row against a request. Runs as **one database transaction** with row locks, so two users can never issue the same unit.
Body (all required except `issue_date`, default today):
```json
{ "request_id": 21, "inventory_id": 5, "staff_id": 3, "units_issued": 1, "issue_date": "2026-11-14" }
```
Response (201):
```json
{ "success": true, "message": "Blood issued successfully",
  "data": { "issue_id": 21, "units_remaining_in_inventory": 0, "request_fulfilled": true } }
```
What is checked (nothing is saved if any check fails):
| Problem | Status | Message (example) |
|---|---|---|
| Missing/invalid field, `units_issued` ≤ 0 | 400 | `"units_issued must be at least 1"` |
| Inventory or request id does not exist | 404 | `"Inventory record not found"` / `"Blood request not found"` |
| Request already `Fulfilled`/`Rejected`/`Cancelled` | 409 | `"Request is already Fulfilled"` |
| Blood group of inventory ≠ blood group of request | 409 | `"Inventory blood group does not match the requested blood group"` |
| Inventory expired (or no expiry date) | 409 | `"Inventory is expired (or has no expiry date) and cannot be issued"` |
| The donation has no blood test with `overall_status = Safe` | 409 | `"Inventory has no blood test marked 'Safe' and cannot be issued"` |
| `units_issued` > `units_available` | 409 | `"Insufficient inventory: 1 unit(s) available"` |
| Total issued would exceed `units_required` | 409 | `"Request needs only 1 more unit(s)"` |
| Unknown `staff_id` | 409 | `"Referenced record does not exist (invalid foreign key)"` |

On success the inventory's `units_available` is reduced, and the request becomes `Fulfilled` when all required units are issued. Status: 201, 400, 404, 409.

### Update issue – `PUT /api/issues/<issue_id>`
Only `staff_id` and `issue_date` can be edited (changing the quantity would require re-adjusting stock, so it is not allowed). Body e.g. `{ "issue_date": "2026-11-15", "staff_id": 2 }`. Response 200 with the updated issue object. Status: 200, 400, 404, 409 (unknown staff).
There is no DELETE for issues.

---

## 13. Blood tests

Academic record-keeping only – **not** a clinical diagnosis. Only stock whose donation has a test with `overall_status = "Safe"` can be issued.

Test object:
```json
{ "test_id": 1, "donation_id": 1, "donor_id": 1, "donor_name": "Donor 1", "test_date": "2026-11-14",
  "hiv_result": "Negative", "hepatitis_result": "Negative", "malaria_result": "Negative", "overall_status": "Safe" }
```
Request fields: `donation_id` (**required**, unique – one test per donation), `test_date`, `hiv_result`, `hepatitis_result`, `malaria_result` (default `Pending`), `overall_status` (default `Pending`). **Rule:** `overall_status` may be `Safe` only if all three results are `Negative` (else 400).

### List – `GET /api/bloodtests`
Optional query: `donation_id`, `page`, `limit`. Status: 200.

### Safe tests – `GET /api/bloodtests/safe`
Tests whose `overall_status` is `Safe`. Optional: `donation_id`, `page`, `limit`. Status: 200.

### Not-safe tests – `GET /api/bloodtests/unsafe`
Tests whose `overall_status` is anything other than `Safe` (`Unsafe`, `Pending`, or null). Optional: `donation_id`, `page`, `limit`. Status: 200.

### Get – `GET /api/bloodtests/<test_id>`
Status: 200, 404 (`"Blood test not found"`).

### Record test – `POST /api/bloodtests`
Body: `{ "donation_id": 21, "test_date": "2026-11-14", "hiv_result": "Negative", "hepatitis_result": "Negative", "malaria_result": "Negative", "overall_status": "Safe" }`
Response (201): `{"success":true,"message":"Blood test recorded successfully","data":{"test_id":21}}`
Errors: 400 (validation, or `Safe` with a non-negative result); 409 (donation does not exist, or already has a test). Status: 201, 400, 409.

### Update – `PUT /api/bloodtests/<test_id>`
Partial body; the `Safe` rule is checked against the merged values. Response 200 with the updated object. Status: 200, 400, 404, 409.

### Delete – `DELETE /api/bloodtests/<test_id>`
Response `{"success":true,"message":"Blood test deleted successfully","data":{"test_id":21}}`. Status: 200, 404.

---

## 14. Dashboard

All GET, no pagination, no required parameters.

### Summary – `GET /api/dashboard/summary`
```json
{ "success": true, "message": "Dashboard summary retrieved successfully",
  "data": { "total_donors": 20, "total_donations": 20, "total_blood_banks": 20, "total_hospitals": 20,
            "total_patients": 20, "total_staff": 20, "total_inventory_units": 20, "usable_inventory_units": 20,
            "total_pending_requests": 20, "total_issued_units": 20 } }
```
`total_inventory_units` = sum of `units_available`; `usable_inventory_units` excludes expired stock; `total_issued_units` = sum of `units_issued`.

### Blood groups – `GET /api/dashboard/blood-groups` (chart data)
`data`: `[ { "blood_group": "A+", "units": 3, "usable_units": 3 }, ... ]` (only groups that have inventory rows).

### Recent donations – `GET /api/dashboard/recent-donations?limit=10`
`limit` 1–100, default 10. `data`: `[ { "donation_id", "donation_date", "quantity_ml", "donation_status", "donor_id", "donor_name", "blood_group", "bank_id", "bank_name" } ]`.

### Recent requests – `GET /api/dashboard/recent-requests?limit=10`
`data`: `[ { "request_id", "request_date", "blood_group", "units_required", "urgency", "request_status", "patient_name", "hospital_name" } ]`.

### Expiry alerts – `GET /api/dashboard/expiry-alerts?days=30`
Inventory objects (see section 6) expiring from today to `days` days ahead, soonest first.

### Donation statistics – `GET /api/dashboard/donation-statistics?group_by=month`
`group_by` = `month` (default) or `date`.
```json
{ "success": true, "message": "Donation statistics retrieved successfully",
  "data": [ { "period": "2026-10", "donations": 7, "total_ml": 3150 }, { "period": "2026-11", "donations": 13, "total_ml": 5850 } ] }
```
For `group_by=date`, `period` is `"YYYY-MM-DD"`. Errors: 400 for any other `group_by`. Status: 200, 400.

All dashboard endpoints can also return 500/503 if the database fails.

---

## 15. Business rules & known limitations

These come from the existing database schema, which was not changed:

1. **No login/authentication** – the schema has no user table, so none is provided.
2. **One inventory row per donation, one blood test per donation** (`UNIQUE donation_id`). Inventory therefore has one `units_available` number per donation.
3. **Sample data is inconsistent by design of the seed:** all 20 sample `bloodissue` rows already issue 1 unit per request, yet the sample `units_available` is still 1 and the requests are still `Pending`. The API never "repairs" this. New issues use `units_available` as the source of truth; because sample requests already have `units_issued = units_required`, issuing more against them returns 409 – create a new request to test issuing.
4. **Blood group compatibility** – only exact matches are issued (O- cannot be issued to an A+ request).
5. **Expiry** – expired stock (and stock with no `expiry_date`) is never issued; it is still listed so it can be reviewed.
6. **No free-text status lists in the database** – the allowed values for statuses/urgency/results listed in section 1 are enforced by the API only; the database itself accepts any text up to 20 characters.
7. **Deleting** parent records (donor, donation, bank, staff, hospital, patient, request, inventory) is blocked by foreign keys while child records exist (409). There is no cascade delete.
8. `bloodissue` rows cannot be deleted and their quantity cannot be edited through the API.
