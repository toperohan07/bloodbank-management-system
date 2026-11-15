# Blood Bank and Donor Management System

A Flask + MySQL backend (`blood-bank-backend/`) and an HTML/CSS/JavaScript frontend (`blood-bank-frontend/`).
Commands are given for **Windows (PowerShell)** and **macOS / Linux (Terminal)**.

## 1. Prerequisites

| Tool | Version | Check with |
|---|---|---|
| Python | 3.9 or newer | Windows: `python --version` · macOS/Linux: `python3 --version` |
| MySQL Server | 8.x, running | `mysql --version` |
| A web browser | Chrome, Edge, Firefox or Safari | |

Install links: Python https://www.python.org/downloads/ (on Windows tick **"Add python.exe to PATH"**) ·
MySQL https://dev.mysql.com/downloads/mysql/ (macOS with Homebrew: `brew install python mysql && brew services start mysql`).

## 2. Import the database (once)

From the project root (the folder containing `BloodBankDB.sql`). This creates the `bloodbankdb` database and its sample data.

**Windows (PowerShell)** – PowerShell does not support `<`, so use `cmd`:
```powershell
cmd /c "mysql -u root -p < BloodBankDB.sql"
```

**macOS / Linux**
```bash
mysql -u root -p < BloodBankDB.sql
```

Alternative on any system: open `BloodBankDB.sql` in MySQL Workbench and run it. Enter your MySQL password when asked.

## 3. Set up the backend (once)

**Windows (PowerShell)**
```powershell
cd blood-bank-backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```
If activation is blocked, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` and activate again.

**macOS / Linux**
```bash
cd blood-bank-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Now open the new `.env` file in a text editor and set your MySQL password (never commit this file):
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=bloodbankdb
DB_PORT=3306
```

## 4. Run the application

You need **two terminals**, one for the backend and one for the frontend. Keep both open.

### Terminal 1 – backend (http://127.0.0.1:5000)

**Windows (PowerShell)**
```powershell
cd blood-bank-backend
venv\Scripts\activate
python app.py
```

**macOS / Linux**
```bash
cd blood-bank-backend
source venv/bin/activate
python app.py
```

Check it: open http://127.0.0.1:5000/api/health in a browser. It should report that MySQL is connected.
Keep the backend on port **5000**; the frontend is configured for that port.

### Terminal 2 – frontend (http://localhost:5500)

**Windows (PowerShell)**
```powershell
cd blood-bank-frontend
python -m http.server 5500
```

**macOS / Linux**
```bash
cd blood-bank-frontend
python3 -m http.server 5500
```

Then open **http://localhost:5500** in your browser.
(The frontend must be served this way; opening `index.html` by double-click will not work.)

To stop either server, press `Ctrl+C` in its terminal.

## 5. Optional: run the backend tests

With the backend's virtual environment active, inside `blood-bank-backend`:
```
python -m unittest -v
```
The tests create temporary records (names starting with `TEST`) and remove them afterwards.

## 6. Quick troubleshooting

| Problem | Fix |
|---|---|
| `python` / `python3` not found | Install Python (section 1); on Windows you can also try `py` |
| `/api/health` says the database is unavailable | MySQL is not running, or `.env` has the wrong password/port, or step 2 was skipped |
| Frontend shows "Cannot reach server on port 5000" | Start the backend (Terminal 1) and keep it on port 5000 |
| Port 5500 already in use | Use another port, e.g. `python -m http.server 5501`, and open that port |
| `ModuleNotFoundError` | Activate the virtual environment and run `pip install -r requirements.txt` again |

More detail: `blood-bank-backend/README.md`, `blood-bank-backend/API_DOCUMENTATION.md`, `blood-bank-frontend/README.md`.
