-- =====================================================================
-- subqueries.sql  |  Nested, single-row, multi-row and correlated subqueries
-- All statements are read-only SELECTs.
-- =====================================================================
USE bloodbankdb;

-- ---------------------------------------------------------------------
-- Single-row subquery: returns ONE value, so it works with = < > operators
-- ---------------------------------------------------------------------
-- Donors older than the average donor age
SELECT donor_id, donor_name, age
FROM donor
WHERE age > (SELECT AVG(age) FROM donor);

-- Inventory that expires on the earliest expiry date
SELECT inventory_id, blood_group, expiry_date
FROM bloodinventory
WHERE expiry_date = (SELECT MIN(expiry_date) FROM bloodinventory);

-- ---------------------------------------------------------------------
-- Multi-row subquery: returns a LIST, used with IN / ANY / ALL
-- ---------------------------------------------------------------------
-- Hospitals that have at least one pending request
SELECT hospital_id, hospital_name
FROM hospital
WHERE hospital_id IN (SELECT hospital_id FROM bloodrequest WHERE request_status = 'Pending');

-- Donors whose blood group is NOT currently requested by any pending request
SELECT donor_id, donor_name, blood_group
FROM donor
WHERE blood_group NOT IN (SELECT blood_group FROM bloodrequest WHERE request_status = 'Pending');

-- ANY: inventory with more units than at least one other record from bank 1
SELECT inventory_id, units_available
FROM bloodinventory
WHERE units_available > ANY (SELECT units_available FROM bloodinventory WHERE bank_id = 1);

-- ALL: donors older than ALL patients of blood group 'A+'
SELECT donor_id, donor_name, age
FROM donor
WHERE age > ALL (SELECT age FROM patient WHERE blood_group = 'A+');

-- ---------------------------------------------------------------------
-- Nested query (a subquery inside a subquery)
-- ---------------------------------------------------------------------
-- Donor names whose donation ended up in inventory of a bank that has a 'Manager' on staff
SELECT donor_name
FROM donor
WHERE donor_id IN (
    SELECT donor_id FROM donation
    WHERE bank_id IN (SELECT bank_id FROM staff WHERE designation = 'Manager'));

-- ---------------------------------------------------------------------
-- Correlated subquery: refers to the OUTER query, runs once per outer row
-- ---------------------------------------------------------------------
-- Requests together with the units already issued for each of them
SELECT r.request_id, r.units_required,
       (SELECT COALESCE(SUM(bi.units_issued), 0) FROM bloodissue bi WHERE bi.request_id = r.request_id) AS units_issued
FROM bloodrequest r;

-- The most recent donor of every blood group
SELECT d.donor_id, d.donor_name, d.blood_group, d.last_donation_date
FROM donor d
WHERE d.last_donation_date = (SELECT MAX(d2.last_donation_date) FROM donor d2 WHERE d2.blood_group = d.blood_group);

-- EXISTS: blood banks that hold at least one unit that is still usable
SELECT b.bank_id, b.bank_name
FROM bloodbank b
WHERE EXISTS (SELECT 1 FROM bloodinventory i
              WHERE i.bank_id = b.bank_id AND i.units_available > 0 AND i.expiry_date >= CURDATE());

-- NOT EXISTS: requests that have no issue record yet
SELECT r.request_id, r.blood_group
FROM bloodrequest r
WHERE NOT EXISTS (SELECT 1 FROM bloodissue bi WHERE bi.request_id = r.request_id);

-- Subquery in FROM (derived table): average units per blood group, then the best group
SELECT blood_group, avg_units
FROM (SELECT blood_group, AVG(units_available) AS avg_units FROM bloodinventory GROUP BY blood_group) AS per_group
ORDER BY avg_units DESC, blood_group
LIMIT 1;
