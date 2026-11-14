-- =====================================================================
-- donations.sql  |  Queries on `donation`
-- Concepts: INNER JOIN, WHERE, ORDER BY, INSERT, UPDATE, DELETE, transaction
-- =====================================================================
USE bloodbankdb;

-- 1. All donations, newest first
SELECT donation_id, donor_id, bank_id, staff_id, donation_date, quantity_ml, donation_status
FROM donation
ORDER BY donation_date DESC, donation_id DESC;

-- 2. Donation history with donor, blood bank and staff (GET /api/donations/history)
SELECT dn.donation_id, dn.donation_date, dn.quantity_ml, dn.donation_status,
       d.donor_id, d.donor_name, d.blood_group,
       b.bank_id, b.bank_name,
       s.staff_id, s.staff_name
FROM donation dn
INNER JOIN donor d     ON d.donor_id = dn.donor_id
INNER JOIN bloodbank b ON b.bank_id  = dn.bank_id
INNER JOIN staff s     ON s.staff_id = dn.staff_id
ORDER BY dn.donation_date DESC, dn.donation_id DESC;

-- 3. Donations in a date range
SELECT donation_id, donation_date, quantity_ml
FROM donation
WHERE donation_date BETWEEN '2026-10-25' AND '2026-11-05';

-- 4. Register a donation: two statements in ONE transaction
--    (POST /api/donations): insert the donation, then refresh the donor's last_donation_date.
START TRANSACTION;

INSERT INTO donation (donor_id, bank_id, staff_id, donation_date, quantity_ml, donation_status)
VALUES (1, 1, 1, CURDATE(), 450, 'Pending');
SET @new_donation = LAST_INSERT_ID();

UPDATE donor
SET last_donation_date = CURDATE()
WHERE donor_id = 1 AND (last_donation_date IS NULL OR last_donation_date < CURDATE());

-- UPDATE: change the status
UPDATE donation SET donation_status = 'Accepted' WHERE donation_id = @new_donation;

-- DELETE: remove it again (allowed, because no inventory/test references it yet)
DELETE FROM donation WHERE donation_id = @new_donation;

ROLLBACK;   -- sample data stays unchanged (donor 1's last_donation_date too)

-- A donation that already has inventory or a blood test cannot be deleted (FK error 1451):
-- DELETE FROM donation WHERE donation_id = 1;
