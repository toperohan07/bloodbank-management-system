# Blood Bank & Donor Management System — Frontend

A single-page web application for managing blood bank operations: donor registration, donation intake, laboratory blood test results, inventory shelf life tracking, hospital blood requests, and transfusion issue authorization.

## Features

- **Dashboard**: Key metrics overview, donation trends visualization, recent activity logs, and actionable alerts.
- **Donors & Donations**: Donor registration with eligibility tracking, collection volume logging, and testing handover.
- **Laboratory Blood Tests**: Test result recording with automatic safety status determination (HIV, Hepatitis, Malaria).
- **Inventory Management**: Stock tracking with expiration status, component shelf life tracking, and issue auditing.
- **Blood Requests**: Hospital demand queue with urgency levels and fulfillment progress tracking.
- **Issue Authorization**: Multi-step issue workflow with First-Expiring-First-Out (FEFO) stock selection and printable issue slips.
- **Master Data Directories**: Unified management of regional blood banks, hospitals, patients, and staff.
- **Settings**: Configurable backend API base URL with connectivity testing and color theme selection.

## Requirements

- Python 3.8+ (for serving static frontend files)
- Blood Bank REST API backend running on `http://127.0.0.1:5000`
- Modern web browser (Chrome, Edge, Firefox)

## Getting Started

1. Navigate to the frontend directory:
   ```powershell
   cd blood-bank-frontend
   ```

2. Start the local static file server:
   ```powershell
   python -m http.server 5500
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:5500
   ```

4. Configure backend connection:
   The application defaults to `http://127.0.0.1:5000/api`. To change the endpoint, navigate to the Settings page (`#/settings`) or modify `js/config.js`.

## Project Structure

```
blood-bank-frontend/
  index.html                    # Application entry point
  README.md                     # Documentation
  assets/
    css/                        # Stylesheets (tokens, base, layout, components, pages, print)
    icons/sprite.svg            # SVG vector icon sprite
    vendor/chart.umd.min.js     # Chart visualization library
  js/
    main.js                     # Application bootstrap and routing setup
    config.js                   # Application configuration, enums, and defaults
    core/                       # Core utilities (API client, router, store, DOM helpers, formatters)
    ui/                         # Reusable UI components (table, form, modal, drawer, toast, badge)
    services/                   # API service endpoints
    pages/                      # Route view controllers
```

## Troubleshooting

| Problem | Cause | Solution |
| :--- | :--- | :--- |
| **Backend Offline** | API server not running | Ensure the backend server is started and listening at port 5000. |
| **CORS Errors** | Origin blocked or accessing via file protocol | Serve the frontend via `http://localhost:5500` rather than opening `file:///index.html`. |
| **Port in Use** | Port 5500 is occupied by another process | Run `python -m http.server 5501` and update your browser URL accordingly. |
