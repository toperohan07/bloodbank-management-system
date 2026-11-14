-- =====================================================================
-- bloodissues.sql  |  Queries on `bloodissue`
-- The full transactional issue procedure is demonstrated in transactions.sql.
-- =====================================================================
USE bloodbankdb;

SELECT issue_id, request_id, inventory_id, staff_id, issue_date, units_issued FROM bloodissue ORDER BY issue_id;

-- Issue history: request + hospital + patient + inventory + staff (GET /api/issues/history)
SELECT bi.issue_id, bi.issue_date, bi.units_issued,
       r.request_id, r.blood_group AS requested_blood_group, r.units_required, r.urgency, r.request_status,
       h.hospital_name, p.patient_name,
       i.inventory_id, i.blood_group AS inventory_blood_group, i.component_type, i.expiry_date,
       bk.bank_name, s.staff_name
FROM bloodissue bi
INNER JOIN bloodrequest r   ON r.request_id   = bi.request_id
INNER JOIN hospital h       ON h.hospital_id  = r.hospital_id
INNER JOIN patient p        ON p.patient_id   = r.patient_id
INNER JOIN bloodinventory i ON i.inventory_id = bi.inventory_id
INNER JOIN bloodbank bk     ON bk.bank_id     = i.bank_id
INNER JOIN staff s          ON s.staff_id     = bi.staff_id
ORDER BY bi.issue_date DESC, bi.issue_id DESC;

-- Units issued per request vs units required
SELECT r.request_id, r.units_required, COALESCE(SUM(bi.units_issued), 0) AS issued
FROM bloodrequest r LEFT JOIN bloodissue bi ON bi.request_id = r.request_id
GROUP BY r.request_id, r.units_required;

-- UPDATE: the API only allows changing staff_id and issue_date (not the quantity)
START TRANSACTION;
UPDATE bloodissue SET issue_date = CURDATE(), staff_id = 2 WHERE issue_id = 1;
SELECT * FROM bloodissue WHERE issue_id = 1;
ROLLBACK;
