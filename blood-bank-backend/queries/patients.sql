-- =====================================================================
-- patients.sql  |  Queries on `patient`
-- =====================================================================
USE bloodbankdb;

SELECT patient_id, patient_name, age, gender, blood_group, contact_number, city FROM patient ORDER BY patient_id;
SELECT * FROM patient WHERE blood_group = 'B+' AND city = 'Pune';
SELECT DISTINCT blood_group FROM patient ORDER BY blood_group;
SELECT * FROM patient WHERE patient_name LIKE '%Patient 1%' ORDER BY age DESC;

-- Patients and their requests (LEFT JOIN keeps patients with no request)
SELECT p.patient_id, p.patient_name, r.request_id, r.request_status
FROM patient p LEFT JOIN bloodrequest r ON r.patient_id = p.patient_id;

-- INSERT / UPDATE / DELETE (rolled back)
START TRANSACTION;
INSERT INTO patient (patient_name, age, gender, blood_group, contact_number, city)
VALUES ('Demo Patient', 40, 'Female', 'AB+', '9799999999', 'Pune');
SET @p = LAST_INSERT_ID();
UPDATE patient SET city = 'Thane' WHERE patient_id = @p;
DELETE FROM patient WHERE patient_id = @p;
-- DELETE FROM patient WHERE patient_id = 1;  -- fails: bloodrequest references it
ROLLBACK;
