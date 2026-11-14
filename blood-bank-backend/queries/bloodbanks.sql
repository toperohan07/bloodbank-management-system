-- =====================================================================
-- bloodbanks.sql  |  Queries on `bloodbank`
-- =====================================================================
USE bloodbankdb;

-- 1. All blood banks / filter by city / search by name
SELECT bank_id, bank_name, address, city, contact_number, email FROM bloodbank ORDER BY bank_id;
SELECT * FROM bloodbank WHERE city = 'Pune' AND bank_name LIKE '%Branch 1%';

-- 2. Inventory of one bank (GET /api/bloodbanks/<id>/inventory)
SELECT inventory_id, blood_group, component_type, units_available, expiry_date
FROM bloodinventory WHERE bank_id = 1;

-- 3. Staff of one bank (GET /api/bloodbanks/<id>/staff)
SELECT staff_id, staff_name, designation, phone, email FROM staff WHERE bank_id = 1;

-- 4. Per-bank totals: staff count and stock
SELECT bk.bank_id, bk.bank_name,
       (SELECT COUNT(*) FROM staff s WHERE s.bank_id = bk.bank_id) AS staff_count,
       (SELECT COALESCE(SUM(i.units_available), 0) FROM bloodinventory i WHERE i.bank_id = bk.bank_id) AS units
FROM bloodbank bk;

-- 5. INSERT / UPDATE / DELETE (rolled back)
START TRANSACTION;
INSERT INTO bloodbank (bank_name, address, city, contact_number, email)
VALUES ('Demo Blood Bank', '1 Demo Road', 'Pune', '9199999999', 'demo.bank@example.com');
SET @b = LAST_INSERT_ID();
UPDATE bloodbank SET city = 'Nashik' WHERE bank_id = @b;
DELETE FROM bloodbank WHERE bank_id = @b;
-- DELETE FROM bloodbank WHERE bank_id = 1;  -- fails: staff/donation/inventory rows reference it
ROLLBACK;
