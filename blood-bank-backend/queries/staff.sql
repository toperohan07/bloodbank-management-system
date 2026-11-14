-- =====================================================================
-- staff.sql  |  Queries on `staff`
-- =====================================================================
USE bloodbankdb;

SELECT staff_id, staff_name, designation, phone, email, bank_id FROM staff ORDER BY staff_id;
SELECT DISTINCT designation FROM staff;
SELECT * FROM staff WHERE designation = 'Manager' AND bank_id <= 10;

-- Donations handled by one staff member (GET /api/staff/<id>/donations)
SELECT dn.donation_id, dn.donation_date, dn.quantity_ml, d.donor_name, b.bank_name
FROM donation dn
INNER JOIN donor d     ON d.donor_id = dn.donor_id
INNER JOIN bloodbank b ON b.bank_id = dn.bank_id
WHERE dn.staff_id = 1;

-- Staff with the blood bank they work at (staff.bank_id may be NULL -> LEFT JOIN)
SELECT s.staff_name, s.designation, b.bank_name
FROM staff s LEFT JOIN bloodbank b ON b.bank_id = s.bank_id;

-- INSERT / UPDATE / DELETE (rolled back)
START TRANSACTION;
INSERT INTO staff (staff_name, designation, phone, email, bank_id)
VALUES ('Demo Staff', 'Technician', '9599999999', 'demo.staff@example.com', 1);
SET @s = LAST_INSERT_ID();
UPDATE staff SET designation = 'Manager' WHERE staff_id = @s;
DELETE FROM staff WHERE staff_id = @s;
-- DELETE FROM staff WHERE staff_id = 1;  -- fails: donation/bloodissue reference it
ROLLBACK;
