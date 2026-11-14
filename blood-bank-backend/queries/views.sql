-- =====================================================================
-- views.sql  |  CREATE VIEW / DROP VIEW
-- A view is a saved SELECT. The Flask app does NOT depend on these views.
-- NOTE: CREATE VIEW adds objects to bloodbankdb (it does not touch existing
-- tables or data). Run only if your team agrees. Re-running is safe because
-- we use CREATE OR REPLACE VIEW. The DROP VIEW cleanup is at the bottom.
-- =====================================================================
USE bloodbankdb;

-- 1. Donation history (donor + bank + staff)
CREATE OR REPLACE VIEW vw_donation_history AS
SELECT dn.donation_id, dn.donation_date, dn.quantity_ml, dn.donation_status,
       d.donor_id, d.donor_name, d.blood_group, b.bank_name, s.staff_name
FROM donation dn
INNER JOIN donor d     ON d.donor_id = dn.donor_id
INNER JOIN bloodbank b ON b.bank_id  = dn.bank_id
INNER JOIN staff s     ON s.staff_id = dn.staff_id;

-- 2. Stock that may be issued: not expired, units left, blood test 'Safe'
CREATE OR REPLACE VIEW vw_available_inventory AS
SELECT i.inventory_id, i.bank_id, i.blood_group, i.component_type, i.units_available, i.expiry_date
FROM bloodinventory i
INNER JOIN bloodtest t ON t.donation_id = i.donation_id AND t.overall_status = 'Safe'
WHERE i.expiry_date >= CURDATE() AND i.units_available > 0;

-- 3. Pending requests with patient and hospital
CREATE OR REPLACE VIEW vw_pending_requests AS
SELECT r.request_id, r.blood_group, r.units_required, r.urgency, r.request_date,
       p.patient_name, h.hospital_name
FROM bloodrequest r
INNER JOIN patient p  ON p.patient_id  = r.patient_id
INNER JOIN hospital h ON h.hospital_id = r.hospital_id
WHERE r.request_status = 'Pending';

-- 4. Stock per blood group (aggregate view)
CREATE OR REPLACE VIEW vw_blood_group_stock AS
SELECT blood_group, COUNT(*) AS records, SUM(units_available) AS units
FROM bloodinventory
GROUP BY blood_group;

-- Using the views like ordinary tables
SELECT * FROM vw_donation_history ORDER BY donation_date DESC LIMIT 5;
SELECT * FROM vw_available_inventory WHERE blood_group = 'O+';
SELECT * FROM vw_pending_requests WHERE urgency = 'High';
SELECT * FROM vw_blood_group_stock ORDER BY units DESC;

-- ---------------------------------------------------------------------
-- DROP VIEW cleanup (commented out so it never runs by accident; select the lines and run them)
-- ---------------------------------------------------------------------
-- DROP VIEW IF EXISTS vw_donation_history;
-- DROP VIEW IF EXISTS vw_available_inventory;
-- DROP VIEW IF EXISTS vw_pending_requests;
-- DROP VIEW IF EXISTS vw_blood_group_stock;
