-- =====================================================================
-- donors.sql  |  Basic SQL on the `donor` table
-- Concepts: SELECT, WHERE, ORDER BY, DISTINCT, LIKE, INSERT, UPDATE, DELETE
-- Safe to run in MySQL Workbench: the INSERT/UPDATE/DELETE part runs inside
-- a transaction that ends with ROLLBACK, so sample data is NOT changed.
-- =====================================================================
USE bloodbankdb;

-- 1. SELECT: all donors (GET /api/donors)
SELECT donor_id, donor_name, age, gender, blood_group, phone, email, city, last_donation_date
FROM donor;

-- 2. WHERE: O+ donors living in Pune (filters blood_group and city)
SELECT donor_id, donor_name, blood_group, city
FROM donor
WHERE blood_group = 'O+' AND city = 'Pune';

-- 3. WHERE + LIKE: search by name (?search=)
SELECT donor_id, donor_name FROM donor WHERE donor_name LIKE '%Donor 1%';

-- 4. ORDER BY: youngest donors first, then by name
SELECT donor_id, donor_name, age FROM donor ORDER BY age ASC, donor_name ASC;

-- 5. DISTINCT: which blood groups and cities do our donors have?
SELECT DISTINCT blood_group FROM donor ORDER BY blood_group;
SELECT DISTINCT city FROM donor;

-- 6. One donor by primary key (GET /api/donors/<donor_id>)
SELECT * FROM donor WHERE donor_id = 1;

-- 7. Donation history of one donor (GET /api/donors/<donor_id>/donations)
SELECT dn.donation_id, dn.donation_date, dn.quantity_ml, dn.donation_status, b.bank_name, s.staff_name
FROM donation dn
INNER JOIN bloodbank b ON b.bank_id = dn.bank_id
INNER JOIN staff s ON s.staff_id = dn.staff_id
WHERE dn.donor_id = 1
ORDER BY dn.donation_date DESC;

-- 8. INSERT / UPDATE / DELETE (undone by ROLLBACK at the end)
START TRANSACTION;

INSERT INTO donor (donor_name, age, gender, blood_group, phone, email, city, last_donation_date)
VALUES ('Rahul Sharma', 22, 'Male', 'O+', '9876543210', 'rahul@example.com', 'Pune', NULL);

SET @new_donor = LAST_INSERT_ID();

UPDATE donor SET city = 'Mumbai', last_donation_date = CURDATE() WHERE donor_id = @new_donor;

SELECT * FROM donor WHERE donor_id = @new_donor;

DELETE FROM donor WHERE donor_id = @new_donor;   -- allowed: this donor has no donations

-- Deleting a donor who HAS donations fails with a foreign-key error (1451):
-- DELETE FROM donor WHERE donor_id = 1;

ROLLBACK;   -- nothing above is kept
