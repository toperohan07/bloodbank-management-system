-- =====================================================================
-- joins.sql  |  JOINs and SET operations
-- Concepts: INNER JOIN, LEFT JOIN, RIGHT JOIN, SELF JOIN, FULL OUTER JOIN
--           (LEFT + RIGHT + UNION), UNION, UNION ALL, INTERSECT, EXCEPT
-- All statements are read-only SELECTs.
-- =====================================================================
USE bloodbankdb;

-- ---------------------------------------------------------------------
-- INNER JOIN: only rows that match on both sides
-- ---------------------------------------------------------------------
-- Every donation with its donor and blood bank
SELECT dn.donation_id, d.donor_name, b.bank_name, dn.donation_date
FROM donation dn
INNER JOIN donor d     ON d.donor_id = dn.donor_id
INNER JOIN bloodbank b ON b.bank_id  = dn.bank_id;

-- ---------------------------------------------------------------------
-- LEFT JOIN: all rows from the left table, NULL when there is no match
-- ---------------------------------------------------------------------
-- All donors, including donors who never donated (donation_id is NULL for them)
SELECT d.donor_id, d.donor_name, dn.donation_id
FROM donor d
LEFT JOIN donation dn ON dn.donor_id = d.donor_id;

-- Donors with NO donation (the classic "anti-join")
SELECT d.donor_id, d.donor_name
FROM donor d
LEFT JOIN donation dn ON dn.donor_id = d.donor_id
WHERE dn.donation_id IS NULL;

-- ---------------------------------------------------------------------
-- RIGHT JOIN: all rows from the right table
-- ---------------------------------------------------------------------
-- Every blood bank, even if it has no staff (staff columns are NULL then)
SELECT b.bank_id, b.bank_name, s.staff_name
FROM staff s
RIGHT JOIN bloodbank b ON b.bank_id = s.bank_id;

-- ---------------------------------------------------------------------
-- SELF JOIN: a table joined with itself (needs two aliases)
-- ---------------------------------------------------------------------
-- Pairs of donors with the same blood group in the same city (d1 < d2 avoids duplicates and self-pairs)
SELECT d1.donor_name AS donor_a, d2.donor_name AS donor_b, d1.blood_group, d1.city
FROM donor d1
INNER JOIN donor d2 ON d1.blood_group = d2.blood_group AND d1.city = d2.city AND d1.donor_id < d2.donor_id
ORDER BY d1.blood_group, d1.donor_id;

-- Colleagues: pairs of staff members working at the same blood bank
SELECT s1.staff_name AS staff_a, s2.staff_name AS staff_b, s1.bank_id
FROM staff s1
INNER JOIN staff s2 ON s1.bank_id = s2.bank_id AND s1.staff_id < s2.staff_id;

-- ---------------------------------------------------------------------
-- FULL OUTER JOIN equivalent. MySQL has no FULL OUTER JOIN keyword, so we
-- combine a LEFT JOIN and a RIGHT JOIN with UNION (UNION removes the
-- duplicate matched rows that both halves return).
-- Result: every donor AND every donation, matched where possible.
-- ---------------------------------------------------------------------
SELECT d.donor_id, d.donor_name, dn.donation_id, dn.donation_date
FROM donor d
LEFT JOIN donation dn ON dn.donor_id = d.donor_id
UNION
SELECT d.donor_id, d.donor_name, dn.donation_id, dn.donation_date
FROM donor d
RIGHT JOIN donation dn ON dn.donor_id = d.donor_id;

-- ---------------------------------------------------------------------
-- UNION: combine two result sets and remove duplicates
-- ---------------------------------------------------------------------
-- Every city that appears in donors, hospitals or blood banks
SELECT city FROM donor
UNION
SELECT city FROM hospital
UNION
SELECT city FROM bloodbank;

-- ---------------------------------------------------------------------
-- UNION ALL: combine and KEEP duplicates (faster, no de-duplication)
-- ---------------------------------------------------------------------
-- One contact directory for donors, patients and staff
SELECT 'Donor' AS person_type, donor_name AS name, phone AS contact FROM donor
UNION ALL
SELECT 'Patient', patient_name, contact_number FROM patient
UNION ALL
SELECT 'Staff', staff_name, phone FROM staff;

-- ---------------------------------------------------------------------
-- INTERSECT: rows present in BOTH queries (native in MySQL 8.0.31+)
-- ---------------------------------------------------------------------
-- Blood groups that exist both among donors and among patients
SELECT blood_group FROM donor
INTERSECT
SELECT blood_group FROM patient;
-- Equivalent for older MySQL versions:
--   SELECT DISTINCT d.blood_group FROM donor d WHERE d.blood_group IN (SELECT blood_group FROM patient);

-- ---------------------------------------------------------------------
-- EXCEPT: rows in the first query that are NOT in the second (MySQL 8.0.31+)
-- ---------------------------------------------------------------------
-- Blood groups that patients have, but that no donor has
SELECT blood_group FROM patient
EXCEPT
SELECT blood_group FROM donor;
-- Equivalent for older MySQL versions:
--   SELECT DISTINCT p.blood_group FROM patient p WHERE p.blood_group NOT IN (SELECT blood_group FROM donor);
