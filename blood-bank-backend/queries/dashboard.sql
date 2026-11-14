-- =====================================================================
-- dashboard.sql  |  Queries behind /api/dashboard/*
-- =====================================================================
USE bloodbankdb;

-- summary
SELECT (SELECT COUNT(*) FROM donor)     AS total_donors,
       (SELECT COUNT(*) FROM donation)  AS total_donations,
       (SELECT COUNT(*) FROM bloodbank) AS total_blood_banks,
       (SELECT COUNT(*) FROM hospital)  AS total_hospitals,
       (SELECT COUNT(*) FROM patient)   AS total_patients,
       (SELECT COUNT(*) FROM staff)     AS total_staff,
       (SELECT COALESCE(SUM(units_available), 0) FROM bloodinventory) AS total_inventory_units,
       (SELECT COUNT(*) FROM bloodrequest WHERE request_status = 'Pending') AS total_pending_requests,
       (SELECT COALESCE(SUM(units_issued), 0) FROM bloodissue) AS total_issued_units;

-- blood-groups
SELECT blood_group, SUM(units_available) AS units FROM bloodinventory GROUP BY blood_group ORDER BY blood_group;

-- recent-donations
SELECT dn.donation_id, dn.donation_date, d.donor_name, b.bank_name
FROM donation dn INNER JOIN donor d ON d.donor_id = dn.donor_id INNER JOIN bloodbank b ON b.bank_id = dn.bank_id
ORDER BY dn.donation_date DESC, dn.donation_id DESC LIMIT 10;

-- recent-requests
SELECT r.request_id, r.request_date, r.blood_group, r.urgency, r.request_status, p.patient_name, h.hospital_name
FROM bloodrequest r INNER JOIN patient p ON p.patient_id = r.patient_id INNER JOIN hospital h ON h.hospital_id = r.hospital_id
ORDER BY r.request_date DESC, r.request_id DESC LIMIT 10;

-- expiry-alerts (next 30 days)
SELECT inventory_id, blood_group, units_available, expiry_date
FROM bloodinventory
WHERE expiry_date >= CURDATE() AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
ORDER BY expiry_date;

-- donation-statistics by month / by date
SELECT DATE_FORMAT(donation_date, '%Y-%m') AS period, COUNT(*) AS donations, SUM(quantity_ml) AS total_ml
FROM donation GROUP BY period ORDER BY period;
SELECT donation_date AS period, COUNT(*) AS donations, SUM(quantity_ml) AS total_ml
FROM donation GROUP BY donation_date ORDER BY donation_date;
