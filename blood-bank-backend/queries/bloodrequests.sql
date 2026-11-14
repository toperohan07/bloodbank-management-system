-- =====================================================================
-- bloodrequests.sql  |  Queries on `bloodrequest`
-- =====================================================================
USE bloodbankdb;

-- 1. Requests with patient and hospital, plus units already issued (correlated subquery)
SELECT r.request_id, p.patient_name, h.hospital_name, r.blood_group, r.units_required,
       r.request_date, r.urgency, r.request_status,
       (SELECT COALESCE(SUM(bi.units_issued), 0) FROM bloodissue bi WHERE bi.request_id = r.request_id) AS units_issued
FROM bloodrequest r
INNER JOIN patient p  ON p.patient_id  = r.patient_id
INNER JOIN hospital h ON h.hospital_id = r.hospital_id
ORDER BY r.request_id;

-- 2. Filters: blood group, urgency, status, hospital
SELECT * FROM bloodrequest
WHERE blood_group = 'A+' AND urgency = 'High' AND request_status = 'Pending' AND hospital_id = 9;

-- 3. Pending requests, most urgent first (GET /api/requests/pending)
SELECT request_id, blood_group, units_required, urgency, request_date
FROM bloodrequest
WHERE request_status = 'Pending'
ORDER BY FIELD(urgency, 'Critical', 'High', 'Normal', 'Low'), request_date, request_id;

-- 4. Statistics (GET /api/requests/summary)
SELECT request_status, COUNT(*) AS requests, SUM(units_required) AS units FROM bloodrequest GROUP BY request_status;
SELECT urgency, COUNT(*) AS requests FROM bloodrequest GROUP BY urgency;
SELECT blood_group, COUNT(*) AS requests FROM bloodrequest GROUP BY blood_group ORDER BY blood_group;

-- 5. INSERT / UPDATE / DELETE (rolled back)
START TRANSACTION;
INSERT INTO bloodrequest (patient_id, hospital_id, blood_group, units_required, request_date, urgency, request_status)
VALUES (1, 1, 'A+', 2, CURDATE(), 'High', 'Pending');
SET @r = LAST_INSERT_ID();
UPDATE bloodrequest SET request_status = 'Approved' WHERE request_id = @r;
DELETE FROM bloodrequest WHERE request_id = @r;
-- DELETE FROM bloodrequest WHERE request_id = 1;  -- fails: bloodissue references it
ROLLBACK;
