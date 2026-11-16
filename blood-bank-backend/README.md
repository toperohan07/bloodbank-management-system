# Blood Bank and Donor Management System – Backend

## 1. Project description
A REST API for a college DBMS project. It manages donors, donations, blood inventory, blood banks, hospitals,
patients, staff, blood requests, blood issues and blood tests on top of the **existing** MySQL database
`bloodbankdb` (10 tables, defined in `../BloodBankDB.sql`). The schema is **not modified** by the application.
All database access is hand-written SQL run through MySQL Connector/Python – no ORM. The frontend (HTML/CSS/JS) is
built separately; it talks to this backend using [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

## 2. Technology stack
Python 3 · Flask · Flask-CORS · MySQL 8.x · mysql-connector-python · python-dotenv

## 3. Prerequisites
- Python 3.9 or newer (`python --version`)
- MySQL Server 8.x running locally, with the `bloodbankdb` database already imported
- MySQL Workbench (to run the SQL demo files) and Postman (optional, to try the API)

## 4. Project folder structure
```
blood-bank-backend/
├── app.py                 Flask app, error handling, CORS, root + health routes
├── config.py              Reads settings from .env
├── db.py                  MySQL connection, fetch/execute helpers, transaction()
├── requirements.txt
├── .env.example           Copy to .env
├── API_DOCUMENTATION.md   Endpoint reference for the frontend developer
├── routes/                One Flask Blueprint per area (SQL is written inside the routes)
├── queries/               Standalone SQL demo files for MySQL Workbench (see section 14)
├── utils/                 response.py (JSON format, pagination) · validation.py (request checks)
└── tests/test_api.py      Automated tests
```

## 5. Install Python
Download Python 3 from https://www.python.org/downloads/ and tick **"Add python.exe to PATH"** during installation.
Check in PowerShell:
```powershell
python --version
```

## 6. Create a virtual environment (Windows PowerShell)
```powershell
cd path\to\blood-bank-backend
python -m venv venv
venv\Scripts\activate
```
If PowerShell blocks the script: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, then activate again.

## 7. Install dependencies
```powershell
pip install -r requirements.txt
```

## 8. MySQL database configuration
The database must already exist. If you have not imported it yet (this creates `bloodbankdb`):
```powershell
mysql -u root -p < ..\BloodBankDB.sql
```
(or in MySQL Workbench: *File → Open SQL Script → BloodBankDB.sql → run*). Do not change the tables.

## 9. Environment variables
```powershell
copy .env.example .env
```
Then edit `.env` (never commit it, never share it):
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=bloodbankdb
DB_PORT=3306
```
Optional: `FLASK_DEBUG=true|false`, `PORT=5000`, `CORS_ORIGINS=*`, `EXPIRY_ALERT_DAYS=30`.
Tip: for safer use, create the restricted `bb_app` account from `queries/security.sql` and use it in `.env`.

## 10. Start the Flask server
```powershell
python app.py
```

## 11. Backend URL
`http://127.0.0.1:5000` – open it in a browser; you should see `"Backend is running"`.
`http://127.0.0.1:5000/api/health` should say MySQL is connected.

## 12. API endpoint overview
All responses look like `{"success": true|false, "message": "...", "data": ...}`. Full details, request bodies and examples are in
[API_DOCUMENTATION.md](API_DOCUMENTATION.md).

| Area | Endpoints |
|---|---|
| General | `GET /`, `GET /api/health` |
| Donors | `GET/POST /api/donors`, `GET/PUT/DELETE /api/donors/<id>`, `GET /api/donors/<id>/donations` |
| Donations | `GET/POST /api/donations`, `GET /api/donations/history`, `GET/PUT/DELETE /api/donations/<id>` |
| Inventory | `GET/POST /api/inventory`, `GET /api/inventory/summary|expiring|expired`, `GET/PUT/DELETE /api/inventory/<id>` |
| Blood banks | `GET/POST /api/bloodbanks`, `GET/PUT/DELETE /api/bloodbanks/<id>`, `GET /api/bloodbanks/<id>/inventory|staff` |
| Hospitals | `GET/POST /api/hospitals`, `GET/PUT/DELETE /api/hospitals/<id>`, `GET /api/hospitals/<id>/requests` |
| Patients | `GET/POST /api/patients`, `GET/PUT/DELETE /api/patients/<id>` |
| Staff | `GET/POST /api/staff`, `GET/PUT/DELETE /api/staff/<id>`, `GET /api/staff/<id>/donations` |
| Requests | `GET/POST /api/requests`, `GET /api/requests/pending|summary`, `GET/PUT/DELETE /api/requests/<id>` |
| Issues | `GET/POST /api/issues`, `GET /api/issues/history`, `GET/PUT /api/issues/<id>` |
| Blood tests | `GET/POST /api/bloodtests`, `GET /api/bloodtests/safe|unsafe`, `GET/PUT/DELETE /api/bloodtests/<id>` |
| Dashboard | `GET /api/dashboard/summary|blood-groups|recent-donations|recent-requests|expiry-alerts|donation-statistics` |

### Design notes (important for the viva)
- **Issuing blood** (`POST /api/issues`) is one MySQL transaction: `SELECT ... FOR UPDATE` locks the inventory row (and the request row),
  then the app checks stock, expiry, blood group, blood-test status and quantity, inserts into `bloodissue`, decrements
  `bloodinventory.units_available`, and commits – or rolls back on any failure. Concurrent requests for the same unit queue on the row lock.
- Expired inventory (and inventory without a `'Safe'` blood test) is never issued.
- Limitations caused by the fixed schema are listed in section 15 of API_DOCUMENTATION.md (for example: no authentication table,
  one inventory row and one test per donation, and the sample `bloodissue` rows do not reduce the sample `units_available`).

## 13. Test the API with Postman
1. Start the server (section 10).
2. In Postman create a request: method `GET`, URL `http://127.0.0.1:5000/api/donors` → **Send**.
3. For `POST`/`PUT`: choose **Body → raw → JSON** and paste a body from API_DOCUMENTATION.md, e.g. for `POST /api/donors`:
```json
{ "donor_name": "Rahul Sharma", "age": 22, "gender": "Male", "blood_group": "O+",
  "phone": "9876543210", "email": "rahul@example.com", "city": "Pune" }
```
4. Expect `201` and `{"success": true, ...,"data": {"donor_id": 21}}`. Send it again to see the `409` duplicate error.

### Automated tests
```powershell
python -m unittest -v
```
The tests (`tests/test_api.py`) cover connectivity, every GET endpoint, POST/PUT/DELETE, validation errors, duplicate and
foreign-key errors, expiry filtering, the blood-issue transaction, rollback, and 5 concurrent threads issuing the same unit
(exactly one succeeds). They create disposable records (names starting with `TEST`) and delete them afterwards; the
sample data is not modified. They use the database from your `.env`, so point them at a copy if you prefer.

## 14. Run the SQL demonstration files in MySQL Workbench
The files in `queries/` are standalone, commented demos (they are not loaded by the app):

| File | Concepts |
|---|---|
| donors, donations, inventory, bloodbanks, hospitals, patients, staff, bloodrequests, bloodissues, bloodtests `.sql` | SELECT, WHERE, ORDER BY, DISTINCT, INSERT, UPDATE, DELETE – the same queries the API runs |
| dashboard.sql | The dashboard queries |
| aggregate_queries.sql | COUNT, SUM, AVG, MIN, MAX, GROUP BY, HAVING |
| joins.sql | INNER / LEFT / RIGHT / SELF JOIN, FULL OUTER JOIN (LEFT+RIGHT+UNION), UNION, UNION ALL, INTERSECT, EXCEPT |
| subqueries.sql | Nested, single-row, multi-row, correlated subqueries, EXISTS |
| views.sql | CREATE VIEW, DROP VIEW (cleanup commented) |
| indexes.sql | CREATE INDEX, DROP INDEX (cleanup commented), EXPLAIN |
| security.sql | CREATE USER, GRANT, REVOKE (run as admin) |
| transactions.sql | START TRANSACTION, COMMIT, ROLLBACK, SAVEPOINT, the blood-issue transaction |
| demo_functions_procedures_views.sql | Evaluator demo: 6 stored functions, 6 views, 3 stored procedures (issue blood, register donation, group summary). Run from the terminal: `mysql -u root -p bloodbankdb < queries/demo_functions_procedures_views.sql` or `source` it and paste one DEMO section at a time. Uses temporary DEMO rows and deletes them at the end |

Steps: open Workbench → connect → **File → Open SQL Script…** → pick a file → click the lightning-bolt **Execute** button
(or select one statement and press `Ctrl+Enter`).
- INSERT/UPDATE/DELETE demos run inside `START TRANSACTION … ROLLBACK`, so they leave your data unchanged.
- `views.sql` and `indexes.sql` **add** views/indexes to `bloodbankdb` (no table or data change). `indexes.sql` can be run once
  (re-running reports "Duplicate key name"). `security.sql` creates demo MySQL users – change the placeholder passwords first.
- Workbench may show "safe update mode" warnings – all UPDATE/DELETE statements use the primary key, so they pass.
- `INTERSECT` / `EXCEPT` need MySQL 8.0.31 or newer (8.0.46 is fine; older-version equivalents are in the comments).

## 15. Common errors and troubleshooting
| Problem | Fix |
|---|---|
| `python` is not recognized | Reinstall Python with "Add to PATH", or use `py` instead of `python` |
| `venv\Scripts\activate` is blocked | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `/api/health` returns 503 "Database is unavailable" | MySQL not running; wrong `DB_HOST/DB_PORT`; check `.env` |
| Server log: `MySQL connection failed (errno=1045)` | Wrong `DB_USER`/`DB_PASSWORD` |
| errno `1049` | Database not imported – run `BloodBankDB.sql` (section 8) |
| Frontend: "Failed to fetch" / CORS error | Backend not running, wrong URL/port, or `CORS_ORIGINS` too restrictive |
| Blood group filter returns nothing for `O+` | Encode the plus sign: `blood_group=O%2B` |
| `409 Duplicate record` | Phone/email already exists |
| `409 Cannot delete or change this record…` | Other rows reference it (foreign key) – delete the child rows first |
| `POST /api/issues` returns 409 | Read the message: expired, wrong blood group, not tested Safe, insufficient stock, request already satisfied |
| `ModuleNotFoundError` | Virtual environment not active, or `pip install -r requirements.txt` not run |
| Port 5000 already in use | Set `PORT=5001` in `.env` (and update the frontend base URL) |
