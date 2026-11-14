"""Backend tests. Run from the project folder:   python -m unittest -v

They use the REAL database but only create disposable records (tagged with a random
number) and delete them again in tearDown. Existing sample data is never modified.
"""
import os
import random
import sys
import threading
import unittest
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app  # noqa: E402
from db import execute, fetch_one  # noqa: E402


def rand_digits(n=9):
    return "".join(random.choice("0123456789") for _ in range(n))


class BaseCase(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.donor_ids, self.donation_ids, self.inventory_ids = [], [], []
        self.request_ids, self.patient_ids, self.test_ids = [], [], []

    def tearDown(self):
        # Delete disposable rows, children first (foreign keys).
        for rid in self.request_ids:
            execute("DELETE FROM bloodissue WHERE request_id = %s", (rid,))
            execute("DELETE FROM bloodrequest WHERE request_id = %s", (rid,))
        for iid in self.inventory_ids:
            execute("DELETE FROM bloodissue WHERE inventory_id = %s", (iid,))
            execute("DELETE FROM bloodinventory WHERE inventory_id = %s", (iid,))
        for did in self.donation_ids:
            execute("DELETE FROM bloodtest WHERE donation_id = %s", (did,))
            execute("DELETE FROM donation WHERE donation_id = %s", (did,))
        for pid in self.patient_ids:
            execute("DELETE FROM patient WHERE patient_id = %s", (pid,))
        for did in self.donor_ids:
            execute("DELETE FROM donor WHERE donor_id = %s", (did,))

    # ---- helpers that create disposable data through the API ----
    def new_donor(self, group="O+"):
        r = self.client.post("/api/donors", json={
            "donor_name": "TEST Donor", "age": 30, "gender": "Male", "blood_group": group,
            "phone": "7" + rand_digits(), "email": f"test{rand_digits()}@example.com", "city": "TestCity"})
        self.assertEqual(r.status_code, 201, r.json)
        self.donor_ids.append(r.json["data"]["donor_id"])
        return r.json["data"]["donor_id"]

    def new_stock(self, group="O+", units=1, expiry_days=30, test_status="Safe"):
        """Disposable donor -> donation -> blood test -> inventory chain."""
        donor_id = self.new_donor(group)
        r = self.client.post("/api/donations", json={
            "donor_id": donor_id, "bank_id": 1, "staff_id": 1, "donation_date": date.today().isoformat(),
            "quantity_ml": 450, "donation_status": "Accepted"})
        self.assertEqual(r.status_code, 201, r.json)
        donation_id = r.json["data"]["donation_id"]
        self.donation_ids.append(donation_id)
        negative = "Negative" if test_status == "Safe" else "Positive"
        r = self.client.post("/api/bloodtests", json={
            "donation_id": donation_id, "test_date": date.today().isoformat(), "hiv_result": negative,
            "hepatitis_result": "Negative", "malaria_result": "Negative", "overall_status": test_status})
        self.assertEqual(r.status_code, 201, r.json)
        today = date.today()
        r = self.client.post("/api/inventory", json={
            "donation_id": donation_id, "bank_id": 1, "blood_group": group, "component_type": "Whole Blood",
            "units_available": units, "collection_date": (today - timedelta(days=60)).isoformat(),
            "expiry_date": (today + timedelta(days=expiry_days)).isoformat()})
        self.assertEqual(r.status_code, 201, r.json)
        self.inventory_ids.append(r.json["data"]["inventory_id"])
        return r.json["data"]["inventory_id"]

    def new_request(self, group="O+", units=1):
        r = self.client.post("/api/patients", json={"patient_name": "TEST Patient", "blood_group": group, "age": 40})
        self.assertEqual(r.status_code, 201, r.json)
        self.patient_ids.append(r.json["data"]["patient_id"])
        r = self.client.post("/api/requests", json={
            "patient_id": self.patient_ids[-1], "hospital_id": 1, "blood_group": group, "units_required": units})
        self.assertEqual(r.status_code, 201, r.json)
        self.request_ids.append(r.json["data"]["request_id"])
        return r.json["data"]["request_id"]

    def units(self, inventory_id):
        return fetch_one("SELECT units_available FROM bloodinventory WHERE inventory_id=%s", (inventory_id,))["units_available"]

    def issue(self, request_id, inventory_id, units=1, staff_id=1):
        return self.client.post("/api/issues", json={
            "request_id": request_id, "inventory_id": inventory_id, "staff_id": staff_id, "units_issued": units})


class GeneralAndReadTests(BaseCase):
    def test_root_and_health(self):
        self.assertEqual(self.client.get("/").json["data"]["status"], "running")
        r = self.client.get("/api/health")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json["data"]["mysql"], "connected")

    def test_get_endpoints(self):
        urls = ["/api/donors", "/api/donors/1", "/api/donors/1/donations", "/api/donations", "/api/donations/1",
                "/api/donations/history", "/api/inventory", "/api/inventory/1", "/api/inventory/summary",
                "/api/inventory/expiring", "/api/inventory/expired", "/api/bloodbanks", "/api/bloodbanks/1",
                "/api/bloodbanks/1/inventory", "/api/bloodbanks/1/staff", "/api/hospitals", "/api/hospitals/1",
                "/api/hospitals/1/requests", "/api/patients", "/api/patients/1", "/api/staff", "/api/staff/1",
                "/api/staff/1/donations", "/api/requests", "/api/requests/1", "/api/requests/pending",
                "/api/requests/summary", "/api/issues", "/api/issues/1", "/api/issues/history", "/api/bloodtests",
                "/api/bloodtests/1", "/api/bloodtests/safe", "/api/bloodtests/unsafe", "/api/dashboard/summary",
                "/api/dashboard/blood-groups", "/api/dashboard/recent-donations", "/api/dashboard/recent-requests",
                "/api/dashboard/expiry-alerts", "/api/dashboard/donation-statistics"]
        for url in urls:
            with self.subTest(url=url):
                r = self.client.get(url)
                self.assertEqual(r.status_code, 200, r.json)
                self.assertTrue(r.json["success"])

    def test_filters_and_404(self):
        r = self.client.get("/api/donors?blood_group=A%2B&city=Pune&search=Donor")
        self.assertTrue(all(d["blood_group"] == "A+" for d in r.json["data"]))
        self.assertEqual(self.client.get("/api/donors/999999").status_code, 404)
        self.assertFalse(self.client.get("/api/donors/999999").json["success"])
        self.assertEqual(self.client.get("/api/nothing-here").status_code, 404)


class CrudTests(BaseCase):
    def test_donor_create_update_delete(self):
        donor_id = self.new_donor()
        r = self.client.put(f"/api/donors/{donor_id}", json={"city": "Mumbai"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json["data"]["city"], "Mumbai")
        self.assertEqual(r.json["data"]["donor_name"], "TEST Donor")  # untouched fields kept
        self.assertEqual(self.client.delete(f"/api/donors/{donor_id}").status_code, 200)
        self.assertEqual(self.client.get(f"/api/donors/{donor_id}").status_code, 404)

    def test_invalid_requests(self):
        c = self.client
        self.assertEqual(c.post("/api/donors", data="not json").status_code, 400)
        self.assertEqual(c.post("/api/donors", json={"donor_name": "X"}).status_code, 400)  # blood_group missing
        bad = {"donor_name": "X", "blood_group": "Z+"}
        self.assertEqual(c.post("/api/donors", json=bad).status_code, 400)
        young = {"donor_name": "X", "blood_group": "A+", "age": 15}
        self.assertEqual(c.post("/api/donors", json=young).status_code, 400)
        self.assertEqual(c.get("/api/donors?page=abc").status_code, 400)

    def test_duplicate_email_and_phone(self):
        donor_id = self.new_donor()
        existing = fetch_one("SELECT phone, email FROM donor WHERE donor_id=%s", (donor_id,))
        r = self.client.post("/api/donors", json={"donor_name": "Dup", "blood_group": "A+", "email": existing["email"]})
        self.assertEqual(r.status_code, 409, r.json)
        self.assertIn("email", r.json["message"])
        r = self.client.post("/api/donors", json={"donor_name": "Dup", "blood_group": "A+", "phone": existing["phone"]})
        self.assertEqual(r.status_code, 409)

    def test_foreign_key_errors(self):
        # sample donor 1 has donations -> cannot be deleted
        self.assertEqual(self.client.delete("/api/donors/1").status_code, 409)
        self.assertEqual(self.client.delete("/api/bloodbanks/1").status_code, 409)
        # donation for a donor that does not exist
        r = self.client.post("/api/donations", json={"donor_id": 999999, "bank_id": 1, "staff_id": 1,
                                                     "donation_date": "2026-01-01", "quantity_ml": 450})
        self.assertEqual(r.status_code, 409)
        self.assertNotIn("SQL", r.json["message"])

    def test_donation_updates_last_donation_date(self):
        donor_id = self.new_donor()
        r = self.client.post("/api/donations", json={"donor_id": donor_id, "bank_id": 1, "staff_id": 1,
                                                     "donation_date": "2026-05-05", "quantity_ml": 350})
        self.donation_ids.append(r.json["data"]["donation_id"])
        self.assertEqual(self.client.get(f"/api/donors/{donor_id}").json["data"]["last_donation_date"], "2026-05-05")
        self.assertEqual(len(self.client.get(f"/api/donors/{donor_id}/donations").json["data"]), 1)

    def test_blood_test_safe_requires_negative_results(self):
        stock = self.new_stock()
        donation_id = fetch_one("SELECT donation_id FROM bloodinventory WHERE inventory_id=%s", (stock,))["donation_id"]
        test = fetch_one("SELECT test_id FROM bloodtest WHERE donation_id=%s", (donation_id,))["test_id"]
        r = self.client.put(f"/api/bloodtests/{test}", json={"hiv_result": "Positive"})
        self.assertEqual(r.status_code, 400)  # still says Safe
        r = self.client.put(f"/api/bloodtests/{test}", json={"hiv_result": "Positive", "overall_status": "Unsafe"})
        self.assertEqual(r.status_code, 200)
        ids = [t["test_id"] for t in self.client.get("/api/bloodtests/unsafe").json["data"]]
        self.assertIn(test, ids)


class InventoryAndIssueTests(BaseCase):
    def test_expiry_filtering(self):
        valid = self.new_stock(expiry_days=60)
        soon = self.new_stock(expiry_days=3)
        expired = self.new_stock(expiry_days=-5)
        ids = lambda url: [i["inventory_id"] for i in self.client.get(url).json["data"]]  # noqa: E731
        self.assertIn(expired, ids("/api/inventory/expired"))
        self.assertNotIn(valid, ids("/api/inventory/expired"))
        self.assertIn(soon, ids("/api/inventory/expiring?days=7"))
        self.assertNotIn(expired, ids("/api/inventory/expiring?days=7"))
        self.assertIn(expired, ids("/api/inventory?expiry_status=expired"))
        self.assertIn(valid, ids("/api/inventory?expiry_status=valid&days=30"))
        self.assertEqual(self.client.get("/api/inventory?expiry_status=bogus").status_code, 400)

    def test_issue_success_updates_stock_and_request(self):
        stock = self.new_stock(units=3)
        req = self.new_request(units=2)
        r = self.issue(req, stock, 2)
        self.assertEqual(r.status_code, 201, r.json)
        self.assertEqual(self.units(stock), 1)
        status = fetch_one("SELECT request_status FROM bloodrequest WHERE request_id=%s", (req,))["request_status"]
        self.assertEqual(status, "Fulfilled")
        self.assertEqual(len(self.client.get(f"/api/issues/history?request_id={req}").json["data"]), 1)

    def test_issue_rejections(self):
        stock = self.new_stock(units=1)
        req = self.new_request(units=5)
        self.assertEqual(self.issue(req, stock, 0).status_code, 400)       # not positive
        self.assertEqual(self.issue(req, stock, 2).status_code, 409)       # insufficient stock
        wrong_group = self.new_request(group="A+")
        self.assertEqual(self.issue(wrong_group, stock, 1).status_code, 409)  # blood group mismatch
        expired = self.new_stock(expiry_days=-1)
        self.assertEqual(self.issue(req, expired, 1).status_code, 409)     # expired
        unsafe = self.new_stock(test_status="Unsafe")
        self.assertEqual(self.issue(req, unsafe, 1).status_code, 409)      # blood test not Safe
        self.assertEqual(self.units(stock), 1)                              # nothing changed

    def test_transaction_rollback(self):
        stock = self.new_stock(units=2)
        req = self.new_request(units=2)
        # Everything passes until the INSERT, which fails on the staff foreign key.
        r = self.issue(req, stock, 1, staff_id=999999)
        self.assertEqual(r.status_code, 409, r.json)
        self.assertEqual(self.units(stock), 2)  # stock untouched
        self.assertEqual(fetch_one("SELECT COUNT(*) AS n FROM bloodissue WHERE request_id=%s", (req,))["n"], 0)

    def test_concurrent_issue_of_same_unit(self):
        stock = self.new_stock(units=1)
        reqs = [self.new_request(units=1) for _ in range(5)]
        codes = []
        gate = threading.Barrier(len(reqs))

        def worker(request_id):
            gate.wait()
            with app.test_client() as c:
                codes.append(c.post("/api/issues", json={"request_id": request_id, "inventory_id": stock,
                                                         "staff_id": 1, "units_issued": 1}).status_code)

        threads = [threading.Thread(target=worker, args=(r,)) for r in reqs]
        [t.start() for t in threads]
        [t.join() for t in threads]
        self.assertEqual(sorted(codes), [201, 409, 409, 409, 409], codes)
        self.assertEqual(self.units(stock), 0)


if __name__ == "__main__":
    unittest.main()
