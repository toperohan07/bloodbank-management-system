-- =====================================================================
-- inventory.sql  |  Queries on `bloodinventory`
-- Expiry rule used by the API:
--   expired       expiry_date <  CURDATE()
--   expiring soon CURDATE() <= expiry_date <= CURDATE() + 30 days
--   valid         expiry_date >  CURDATE() + 30 days
-- Expired stock must never be issued.
-- =====================================================================
USE bloodbankdb;

-- 1. Inventory with bank name, expiry status and blood-test status (GET /api/inventory)
SELECT i.inventory_id, i.donation_id, i.bank_id, bk.bank_name, i.blood_group, i.component_type,
       i.units_available, i.collection_date, i.expiry_date,
       CASE WHEN i.expiry_date IS NULL THEN 'unknown'
            WHEN i.expiry_date < CURDATE() THEN 'expired'
            WHEN i.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'expiring_soon'
            ELSE 'valid' END AS expiry_status,
       t.overall_status AS test_status
FROM bloodinventory i
INNER JOIN bloodbank bk ON bk.bank_id = i.bank_id
LEFT JOIN bloodtest t   ON t.donation_id = i.donation_id
ORDER BY i.inventory_id;

-- 2. Filter: blood group, component, bank
SELECT * FROM bloodinventory
WHERE blood_group = 'A+' AND component_type = 'Whole Blood' AND bank_id = 1;

-- 3. Expiring within 30 days (GET /api/inventory/expiring)
SELECT inventory_id, blood_group, units_available, expiry_date,
       DATEDIFF(expiry_date, CURDATE()) AS days_left
FROM bloodinventory
WHERE expiry_date >= CURDATE() AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
ORDER BY expiry_date;

-- 4. Already expired (GET /api/inventory/expired)
SELECT inventory_id, blood_group, units_available, expiry_date
FROM bloodinventory
WHERE expiry_date < CURDATE()
ORDER BY expiry_date;

-- 5. Issuable stock = not expired + units left + blood test 'Safe'
SELECT i.inventory_id, i.blood_group, i.units_available, i.expiry_date
FROM bloodinventory i
INNER JOIN bloodtest t ON t.donation_id = i.donation_id AND t.overall_status = 'Safe'
WHERE i.expiry_date >= CURDATE() AND i.units_available > 0;

-- 6. Summary (GET /api/inventory/summary)
SELECT COUNT(*) AS records, SUM(units_available) AS total_units,
       SUM(CASE WHEN expiry_date >= CURDATE() THEN units_available ELSE 0 END) AS usable_units
FROM bloodinventory;

SELECT blood_group, SUM(units_available) AS units FROM bloodinventory GROUP BY blood_group ORDER BY blood_group;
SELECT component_type, SUM(units_available) AS units FROM bloodinventory GROUP BY component_type;
SELECT bk.bank_name, SUM(i.units_available) AS units
FROM bloodinventory i INNER JOIN bloodbank bk ON bk.bank_id = i.bank_id
GROUP BY bk.bank_id, bk.bank_name ORDER BY bk.bank_id;

-- 7. INSERT / UPDATE / DELETE (rolled back)
START TRANSACTION;

INSERT INTO bloodinventory (donation_id, bank_id, blood_group, component_type, units_available, collection_date, expiry_date)
SELECT dn.donation_id, dn.bank_id, d.blood_group, 'Plasma', 2, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 42 DAY)
FROM donation dn INNER JOIN donor d ON d.donor_id = dn.donor_id
WHERE dn.donation_id = 1 AND NOT EXISTS (SELECT 1 FROM bloodinventory x WHERE x.donation_id = dn.donation_id);
-- (donation 1 already has an inventory row because donation_id is UNIQUE, so 0 rows are inserted - this
--  shows the 1-to-1 rule between donation and inventory.)

UPDATE bloodinventory SET units_available = units_available + 1 WHERE inventory_id = 1;
SELECT inventory_id, units_available FROM bloodinventory WHERE inventory_id = 1;

-- DELETE FROM bloodinventory WHERE inventory_id = 1;  -- would fail: bloodissue references it (FK 1451)

ROLLBACK;
