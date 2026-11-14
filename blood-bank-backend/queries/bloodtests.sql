-- =====================================================================
-- bloodtests.sql  |  Queries on `bloodtest`
-- NOTE: these are academic record-keeping examples, not clinical diagnoses.
-- =====================================================================
USE bloodbankdb;

-- 1. All tests with donor information
SELECT t.test_id, t.donation_id, d.donor_name, t.test_date, t.hiv_result, t.hepatitis_result,
       t.malaria_result, t.overall_status
FROM bloodtest t
INNER JOIN donation dn ON dn.donation_id = t.donation_id
INNER JOIN donor d     ON d.donor_id = dn.donor_id
ORDER BY t.test_id;

-- 2. Safe (GET /api/bloodtests/safe) and not-safe (GET /api/bloodtests/unsafe)
SELECT * FROM bloodtest WHERE overall_status = 'Safe';
SELECT * FROM bloodtest WHERE overall_status <> 'Safe' OR overall_status IS NULL;

-- 3. Count by overall status
SELECT overall_status, COUNT(*) AS tests FROM bloodtest GROUP BY overall_status;

-- 4. INSERT / UPDATE / DELETE (rolled back). Every donation can have only ONE test (donation_id is UNIQUE).
START TRANSACTION;
INSERT INTO donation (donor_id, bank_id, staff_id, donation_date, quantity_ml, donation_status)
VALUES (1, 1, 1, CURDATE(), 450, 'Pending');
SET @dn = LAST_INSERT_ID();
INSERT INTO bloodtest (donation_id, test_date, hiv_result, hepatitis_result, malaria_result, overall_status)
VALUES (@dn, CURDATE(), 'Negative', 'Negative', 'Negative', 'Safe');
SET @t = LAST_INSERT_ID();
UPDATE bloodtest SET malaria_result = 'Positive', overall_status = 'Unsafe' WHERE test_id = @t;
DELETE FROM bloodtest WHERE test_id = @t;
ROLLBACK;
