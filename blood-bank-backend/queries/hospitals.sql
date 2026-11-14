-- =====================================================================
-- hospitals.sql  |  Queries on `hospital`
-- =====================================================================
USE bloodbankdb;

SELECT hospital_id, hospital_name, address, city, contact_number, email FROM hospital ORDER BY hospital_id;
SELECT * FROM hospital WHERE city = 'Pune' AND hospital_name LIKE '%Hospital 2%';

-- Requests made by one hospital (GET /api/hospitals/<id>/requests)
SELECT r.request_id, p.patient_name, r.blood_group, r.units_required, r.request_date, r.urgency, r.request_status
FROM bloodrequest r
INNER JOIN patient p ON p.patient_id = r.patient_id
WHERE r.hospital_id = 1
ORDER BY r.request_date DESC;

-- Hospitals ranked by number of requests
SELECT h.hospital_name, COUNT(r.request_id) AS requests
FROM hospital h LEFT JOIN bloodrequest r ON r.hospital_id = h.hospital_id
GROUP BY h.hospital_id, h.hospital_name
ORDER BY requests DESC, h.hospital_id;

-- INSERT / UPDATE / DELETE (rolled back)
START TRANSACTION;
INSERT INTO hospital (hospital_name, address, city, contact_number, email)
VALUES ('Demo Hospital', '1 Demo Lane', 'Pune', '9699999999', 'demo.hospital@example.com');
SET @h = LAST_INSERT_ID();
UPDATE hospital SET contact_number = '9688888888' WHERE hospital_id = @h;
DELETE FROM hospital WHERE hospital_id = @h;
-- DELETE FROM hospital WHERE hospital_id = 1;  -- fails: bloodrequest references it
ROLLBACK;
