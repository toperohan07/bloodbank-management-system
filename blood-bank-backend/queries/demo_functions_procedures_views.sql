-- =====================================================================
-- demo_functions_procedures_views.sql
-- Live demonstration of stored FUNCTIONS, stored PROCEDURES and VIEWS
-- on the existing bloodbankdb schema (no table or column is changed).
--
-- HOW TO RUN IN THE TERMINAL
--   Whole file at once:
--     mysql -u root -p bloodbankdb < queries/demo_functions_procedures_views.sql
--   Step by step in front of the evaluator (recommended):
--     mysql -u root -p bloodbankdb
--     mysql> source queries/demo_functions_procedures_views.sql      -- SETUP only runs once
--     then copy-paste the statements of one DEMO section at a time.
--
-- STRUCTURE
--   PART 0  Setup       creates 6 functions, 6 views, 3 procedures (run once; re-runnable)
--   PART 1  Demo views
--   PART 2  Demo functions
--   PART 3  Demo procedures (uses temporary DEMO rows, deleted again in PART 4)
--   PART 4  Cleanup     removes the DEMO rows (sample data stays as it was)
--
-- NOTES
--   * Needs the CREATE ROUTINE and CREATE VIEW privileges (root has them).
--   * Objects are prefixed fn_ / sp_ / vw_ and are only added to the database.
--   * DROP statements for all of them are at the very bottom (commented out).
--   * Tested on MySQL 8.x.
-- =====================================================================
USE bloodbankdb;

-- =====================================================================
-- PART 0 - SETUP
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0.1 FUNCTIONS: return ONE value and can be used inside any SELECT.
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_expiry_status;
DROP FUNCTION IF EXISTS fn_days_to_expiry;
DROP FUNCTION IF EXISTS fn_is_eligible_donor;
DROP FUNCTION IF EXISTS fn_available_units;
DROP FUNCTION IF EXISTS fn_request_remaining;
DROP FUNCTION IF EXISTS fn_issuable_units;

DELIMITER $$

-- Same rule as the API: expired < today, expiring_soon within p_days days, otherwise valid.
CREATE FUNCTION fn_expiry_status(p_expiry DATE, p_days INT) RETURNS VARCHAR(15)
NOT DETERMINISTIC NO SQL
BEGIN
    IF p_expiry IS NULL THEN
        RETURN 'unknown';
    ELSEIF p_expiry < CURDATE() THEN
        RETURN 'expired';
    ELSEIF p_expiry <= DATE_ADD(CURDATE(), INTERVAL p_days DAY) THEN
        RETURN 'expiring_soon';
    END IF;
    RETURN 'valid';
END$$

-- Days left until expiry (negative when already expired).
CREATE FUNCTION fn_days_to_expiry(p_expiry DATE) RETURNS INT
NOT DETERMINISTIC NO SQL
BEGIN
    RETURN DATEDIFF(p_expiry, CURDATE());
END$$

-- 1 if the donor may donate again (never donated, or at least p_min_days since last donation).
CREATE FUNCTION fn_is_eligible_donor(p_donor_id INT, p_min_days INT) RETURNS TINYINT(1)
NOT DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v_last DATE;
    SELECT last_donation_date INTO v_last FROM donor WHERE donor_id = p_donor_id;
    IF v_last IS NULL THEN
        RETURN 1;
    END IF;
    RETURN IF(DATEDIFF(CURDATE(), v_last) >= p_min_days, 1, 0);
END$$

-- Total units in stock for a blood group (expired stock included).
CREATE FUNCTION fn_available_units(p_blood_group VARCHAR(3)) RETURNS INT
NOT DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v_units INT;
    SELECT COALESCE(SUM(units_available), 0) INTO v_units
    FROM bloodinventory WHERE blood_group = p_blood_group;
    RETURN v_units;
END$$

-- Units still needed by a request = units_required - units already issued.
CREATE FUNCTION fn_request_remaining(p_request_id INT) RETURNS INT
NOT DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v_required INT;
    DECLARE v_issued INT;
    SELECT units_required INTO v_required FROM bloodrequest WHERE request_id = p_request_id;
    SELECT COALESCE(SUM(units_issued), 0) INTO v_issued FROM bloodissue WHERE request_id = p_request_id;
    RETURN v_required - v_issued;      -- NULL when the request does not exist
END$$

-- Units that may really be issued: not expired, units left, blood test 'Safe'.
CREATE FUNCTION fn_issuable_units(p_blood_group VARCHAR(3)) RETURNS INT
NOT DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v_units INT;
    SELECT COALESCE(SUM(i.units_available), 0) INTO v_units
    FROM bloodinventory i
    INNER JOIN bloodtest t ON t.donation_id = i.donation_id AND t.overall_status = 'Safe'
    WHERE i.blood_group = p_blood_group AND i.expiry_date >= CURDATE();
    RETURN v_units;
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- 0.2 VIEWS: saved SELECT statements that behave like read-only tables.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_donation_history AS
SELECT dn.donation_id, dn.donation_date, dn.quantity_ml, dn.donation_status,
       d.donor_id, d.donor_name, d.blood_group, b.bank_name, s.staff_name
FROM donation dn
INNER JOIN donor d     ON d.donor_id = dn.donor_id
INNER JOIN bloodbank b ON b.bank_id  = dn.bank_id
INNER JOIN staff s     ON s.staff_id = dn.staff_id;

CREATE OR REPLACE VIEW vw_available_inventory AS
SELECT i.inventory_id, i.bank_id, i.blood_group, i.component_type, i.units_available, i.expiry_date
FROM bloodinventory i
INNER JOIN bloodtest t ON t.donation_id = i.donation_id AND t.overall_status = 'Safe'
WHERE i.expiry_date >= CURDATE() AND i.units_available > 0;

CREATE OR REPLACE VIEW vw_pending_requests AS
SELECT r.request_id, r.blood_group, r.units_required, r.urgency, r.request_date,
       p.patient_name, h.hospital_name
FROM bloodrequest r
INNER JOIN patient p  ON p.patient_id  = r.patient_id
INNER JOIN hospital h ON h.hospital_id = r.hospital_id
WHERE r.request_status = 'Pending';

CREATE OR REPLACE VIEW vw_blood_group_stock AS
SELECT blood_group, COUNT(*) AS records, SUM(units_available) AS units
FROM bloodinventory
GROUP BY blood_group;

-- A view that USES a function: every stock row with its expiry status and days left.
CREATE OR REPLACE VIEW vw_inventory_status AS
SELECT i.inventory_id, bk.bank_name, i.blood_group, i.units_available, i.expiry_date,
       fn_expiry_status(i.expiry_date, 30) AS expiry_status,
       fn_days_to_expiry(i.expiry_date)    AS days_left,
       t.overall_status                    AS test_status
FROM bloodinventory i
INNER JOIN bloodbank bk ON bk.bank_id = i.bank_id
LEFT JOIN bloodtest t   ON t.donation_id = i.donation_id;

-- A view with aggregation and a correlated sub-select: how far each request is fulfilled.
CREATE OR REPLACE VIEW vw_request_fulfilment AS
SELECT r.request_id, p.patient_name, h.hospital_name, r.blood_group, r.urgency, r.request_status,
       r.units_required,
       (SELECT COALESCE(SUM(bi.units_issued), 0) FROM bloodissue bi
         WHERE bi.request_id = r.request_id) AS units_issued
FROM bloodrequest r
INNER JOIN patient p  ON p.patient_id  = r.patient_id
INNER JOIN hospital h ON h.hospital_id = r.hospital_id;

-- ---------------------------------------------------------------------
-- 0.3 PROCEDURES: run several statements as one unit (CALL name(args)).
--     OUT parameters give results back. Errors never abort the caller:
--     they are caught, the transaction is rolled back and p_status says why.
-- ---------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_blood_group_summary;
DROP PROCEDURE IF EXISTS sp_register_donation;
DROP PROCEDURE IF EXISTS sp_issue_blood;

DELIMITER $$

-- Read-only procedure returning TWO result sets for one blood group.
CREATE PROCEDURE sp_blood_group_summary(IN p_blood_group VARCHAR(3))
READS SQL DATA
BEGIN
    SELECT p_blood_group                      AS blood_group,
           fn_available_units(p_blood_group)  AS units_in_stock,
           fn_issuable_units(p_blood_group)   AS units_issuable_now;

    SELECT request_id, patient_name, hospital_name, units_required, urgency
    FROM vw_pending_requests
    WHERE blood_group = p_blood_group
    ORDER BY FIELD(urgency, 'Critical', 'High', 'Normal', 'Low'), request_id;
END$$

-- Register a donation and refresh the donor's last_donation_date in ONE transaction
-- (same logic as POST /api/donations).
CREATE PROCEDURE sp_register_donation(
    IN  p_donor_id INT, IN p_bank_id INT, IN p_staff_id INT,
    IN  p_date DATE, IN p_quantity_ml INT,
    OUT p_donation_id INT, OUT p_status VARCHAR(200))
MODIFIES SQL DATA
BEGIN
    DECLARE v_msg TEXT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_msg = MESSAGE_TEXT;
        ROLLBACK;
        SET p_donation_id = NULL;
        SET p_status = CONCAT('ERROR: ', v_msg);
    END;

    START TRANSACTION;
    INSERT INTO donation (donor_id, bank_id, staff_id, donation_date, quantity_ml, donation_status)
    VALUES (p_donor_id, p_bank_id, p_staff_id, p_date, p_quantity_ml, 'Accepted');
    SET p_donation_id = LAST_INSERT_ID();

    UPDATE donor SET last_donation_date = p_date
    WHERE donor_id = p_donor_id AND (last_donation_date IS NULL OR last_donation_date < p_date);
    COMMIT;
    SET p_status = 'OK: donation registered';
END$$

-- Issue blood: the same steps as POST /api/issues.
--   lock inventory row -> lock request row -> check rules -> INSERT issue -> UPDATE stock -> COMMIT
CREATE PROCEDURE sp_issue_blood(
    IN  p_request_id INT, IN p_inventory_id INT, IN p_staff_id INT, IN p_units INT,
    OUT p_issue_id INT, OUT p_status VARCHAR(200))
MODIFIES SQL DATA
proc: BEGIN
    DECLARE v_inv_group   VARCHAR(3);
    DECLARE v_donation_id INT;
    DECLARE v_units       INT;
    DECLARE v_not_expired TINYINT;
    DECLARE v_req_group   VARCHAR(3);
    DECLARE v_required    INT;
    DECLARE v_req_status  VARCHAR(20);
    DECLARE v_test        VARCHAR(20);
    DECLARE v_issued      INT;
    DECLARE v_msg         TEXT;

    DECLARE CONTINUE HANDLER FOR NOT FOUND BEGIN END;     -- SELECT ... INTO found no row: variable stays NULL
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_msg = MESSAGE_TEXT;
        ROLLBACK;
        SET p_issue_id = NULL;
        SET p_status = CONCAT('ERROR: ', v_msg);
    END;

    SET p_issue_id = NULL;
    IF p_units IS NULL OR p_units < 1 THEN
        SET p_status = 'ERROR: units must be a positive number';
        LEAVE proc;
    END IF;

    START TRANSACTION;                                    -- 1. start

    SELECT blood_group, donation_id, units_available,     -- 2. lock the inventory row
           (expiry_date IS NOT NULL AND expiry_date >= CURDATE())
      INTO v_inv_group, v_donation_id, v_units, v_not_expired
      FROM bloodinventory WHERE inventory_id = p_inventory_id FOR UPDATE;
    IF v_inv_group IS NULL THEN
        ROLLBACK; SET p_status = 'ERROR: inventory record not found'; LEAVE proc;
    END IF;

    SELECT blood_group, units_required, request_status    -- lock the request row too
      INTO v_req_group, v_required, v_req_status
      FROM bloodrequest WHERE request_id = p_request_id FOR UPDATE;
    IF v_req_group IS NULL THEN
        ROLLBACK; SET p_status = 'ERROR: blood request not found'; LEAVE proc;
    END IF;

    IF v_req_status IN ('Fulfilled', 'Rejected', 'Cancelled') THEN
        ROLLBACK; SET p_status = CONCAT('ERROR: request is already ', v_req_status); LEAVE proc;
    END IF;
    IF v_inv_group <> v_req_group THEN
        ROLLBACK; SET p_status = 'ERROR: blood group of stock does not match the request'; LEAVE proc;
    END IF;
    IF v_not_expired = 0 THEN
        ROLLBACK; SET p_status = 'ERROR: stock is expired (or has no expiry date)'; LEAVE proc;
    END IF;

    SELECT overall_status INTO v_test FROM bloodtest WHERE donation_id = v_donation_id;
    IF v_test IS NULL OR v_test <> 'Safe' THEN
        ROLLBACK; SET p_status = 'ERROR: stock has no blood test marked Safe'; LEAVE proc;
    END IF;
    IF v_units IS NULL OR v_units < p_units THEN
        ROLLBACK; SET p_status = CONCAT('ERROR: insufficient stock, only ', COALESCE(v_units, 0), ' unit(s) available'); LEAVE proc;
    END IF;

    SELECT COALESCE(SUM(units_issued), 0) INTO v_issued FROM bloodissue WHERE request_id = p_request_id;
    IF v_issued + p_units > v_required THEN
        ROLLBACK; SET p_status = CONCAT('ERROR: request needs only ', v_required - v_issued, ' more unit(s)'); LEAVE proc;
    END IF;

    INSERT INTO bloodissue (request_id, inventory_id, staff_id, issue_date, units_issued)   -- 7. record issue
    VALUES (p_request_id, p_inventory_id, p_staff_id, CURDATE(), p_units);
    SET p_issue_id = LAST_INSERT_ID();

    UPDATE bloodinventory SET units_available = units_available - p_units   -- 8. reduce stock
    WHERE inventory_id = p_inventory_id;

    IF v_issued + p_units = v_required THEN
        UPDATE bloodrequest SET request_status = 'Fulfilled' WHERE request_id = p_request_id;
    END IF;

    COMMIT;                                               -- 9. commit
    SET p_status = CONCAT('OK: issued ', p_units, ' unit(s)');
END$$

DELIMITER ;

SELECT 'SETUP DONE: functions, views and procedures created' AS message;

-- =====================================================================
-- PART 1 - DEMO: VIEWS
-- =====================================================================
SELECT '=== DEMO 1: VIEWS ===' AS section;

-- 1.1 List the views that exist in the database
SHOW FULL TABLES WHERE Table_type = 'VIEW';

-- 1.2 Join of 4 tables hidden behind a simple name
SELECT * FROM vw_donation_history ORDER BY donation_date DESC LIMIT 5;

-- 1.3 Only stock that may really be issued (not expired, Safe, units left)
SELECT * FROM vw_available_inventory WHERE blood_group = 'O+';

-- 1.4 Views can be filtered and sorted like tables
SELECT * FROM vw_pending_requests WHERE urgency = 'High' ORDER BY request_id;

-- 1.5 Aggregate view
SELECT * FROM vw_blood_group_stock ORDER BY units DESC;

-- 1.6 View that calls a FUNCTION: expiry status per stock row
SELECT inventory_id, bank_name, blood_group, expiry_date, expiry_status, days_left
FROM vw_inventory_status ORDER BY days_left LIMIT 5;

-- 1.7 View with a correlated sub-select: units issued per request
SELECT * FROM vw_request_fulfilment LIMIT 5;

-- 1.8 The SQL behind a view
SHOW CREATE VIEW vw_available_inventory\G

-- =====================================================================
-- PART 2 - DEMO: FUNCTIONS
-- =====================================================================
SELECT '=== DEMO 2: FUNCTIONS ===' AS section;

-- 2.1 Call a function like any built-in function (SELECT, no table needed)
SELECT fn_expiry_status('2020-01-01', 30)  AS past_date,
       fn_expiry_status(CURDATE() + INTERVAL 10 DAY, 30) AS in_10_days,
       fn_expiry_status(CURDATE() + INTERVAL 90 DAY, 30) AS in_90_days,
       fn_days_to_expiry(CURDATE() + INTERVAL 10 DAY)    AS days_left;

-- 2.2 Use a function on every row of a table
SELECT inventory_id, blood_group, expiry_date,
       fn_expiry_status(expiry_date, 30) AS status,
       fn_days_to_expiry(expiry_date)    AS days_left
FROM bloodinventory
ORDER BY expiry_date LIMIT 5;

-- 2.3 Use a function in WHERE: donors who may donate today (advisory 90-day gap)
SELECT donor_id, donor_name, last_donation_date
FROM donor
WHERE fn_is_eligible_donor(donor_id, 90) = 1
ORDER BY donor_id LIMIT 5;

-- 2.4 Stock of every blood group: total vs really issuable
SELECT g.blood_group,
       fn_available_units(g.blood_group) AS units_in_stock,
       fn_issuable_units(g.blood_group)  AS units_issuable
FROM (SELECT DISTINCT blood_group FROM donor) AS g
ORDER BY g.blood_group;

-- 2.5 Units still needed by a request (sample requests are already fully issued -> 0)
SELECT request_id, units_required, fn_request_remaining(request_id) AS still_needed
FROM bloodrequest LIMIT 5;

-- 2.6 List the stored functions
SHOW FUNCTION STATUS WHERE Db = 'bloodbankdb';

-- =====================================================================
-- PART 3 - DEMO: PROCEDURES
-- =====================================================================
SELECT '=== DEMO 3: PROCEDURES ===' AS section;

-- 3.1 Procedure that returns two result sets
CALL sp_blood_group_summary('O+');

-- 3.2 Prepare DEMO data (removed again in PART 4)
--     first make the script re-runnable by deleting old DEMO rows
DELETE bi FROM bloodissue bi
  JOIN bloodrequest r ON r.request_id = bi.request_id
  JOIN patient p ON p.patient_id = r.patient_id WHERE p.patient_name = 'DEMO Patient';
DELETE r FROM bloodrequest r JOIN patient p ON p.patient_id = r.patient_id WHERE p.patient_name = 'DEMO Patient';
DELETE FROM patient WHERE patient_name = 'DEMO Patient';
DELETE i FROM bloodinventory i JOIN donation dn ON dn.donation_id = i.donation_id
  JOIN donor d ON d.donor_id = dn.donor_id WHERE d.donor_name = 'DEMO Donor';
DELETE t FROM bloodtest t JOIN donation dn ON dn.donation_id = t.donation_id
  JOIN donor d ON d.donor_id = dn.donor_id WHERE d.donor_name = 'DEMO Donor';
DELETE dn FROM donation dn JOIN donor d ON d.donor_id = dn.donor_id WHERE d.donor_name = 'DEMO Donor';
DELETE FROM donor WHERE donor_name = 'DEMO Donor';

INSERT INTO donor (donor_name, age, gender, blood_group, phone, email, city)
VALUES ('DEMO Donor', 30, 'Male', 'O+', '9000000001', 'demo.donor@example.com', 'Pune');
SET @demo_donor = LAST_INSERT_ID();

INSERT INTO patient (patient_name, age, gender, blood_group, contact_number, city)
VALUES ('DEMO Patient', 40, 'Female', 'O+', '9000000002', 'Pune');
SET @demo_patient = LAST_INSERT_ID();

INSERT INTO bloodrequest (patient_id, hospital_id, blood_group, units_required, request_date, urgency, request_status)
VALUES (@demo_patient, 1, 'O+', 2, CURDATE(), 'High', 'Pending');
SET @demo_request = LAST_INSERT_ID();

-- 3.3 sp_register_donation: transaction + OUT parameters
CALL sp_register_donation(@demo_donor, 1, 1, CURDATE(), 450, @donation_id, @status);
SELECT @donation_id AS donation_id, @status AS status;

-- 3.4 The same procedure with a wrong donor id: the foreign key fails, everything is rolled back
CALL sp_register_donation(999999, 1, 1, CURDATE(), 450, @bad_id, @status);
SELECT @bad_id AS donation_id, @status AS status;

-- 3.5 Record a Safe blood test and put 3 units into stock (expires in 35 days)
INSERT INTO bloodtest (donation_id, test_date, hiv_result, hepatitis_result, malaria_result, overall_status)
VALUES (@donation_id, CURDATE(), 'Negative', 'Negative', 'Negative', 'Safe');
INSERT INTO bloodinventory (donation_id, bank_id, blood_group, component_type, units_available, collection_date, expiry_date)
VALUES (@donation_id, 1, 'O+', 'Whole Blood', 3, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 35 DAY));
SET @demo_stock = LAST_INSERT_ID();

SELECT fn_request_remaining(@demo_request) AS request_needs, fn_issuable_units('O+') AS o_positive_issuable;

-- 3.6 sp_issue_blood: SUCCESS (request needs 2 units, stock has 3)
CALL sp_issue_blood(@demo_request, @demo_stock, 1, 1, @issue_id, @status);
SELECT @issue_id AS issue_id, @status AS status;
SELECT inventory_id, units_available FROM bloodinventory WHERE inventory_id = @demo_stock;
SELECT request_id, units_required, units_issued, request_status FROM vw_request_fulfilment WHERE request_id = @demo_request;

-- 3.7 FAILURES: nothing is changed, the message says why
CALL sp_issue_blood(@demo_request, @demo_stock, 1, 2, @issue_id, @status);   -- request needs only 1 more unit
SELECT @issue_id AS issue_id, @status AS status;
CALL sp_issue_blood(2, @demo_stock, 1, 1, @issue_id, @status);               -- request 2 is blood group A-
SELECT @issue_id AS issue_id, @status AS status;
CALL sp_issue_blood(@demo_request, @demo_stock, 1, 0, @issue_id, @status);   -- zero units
SELECT @issue_id AS issue_id, @status AS status;
CALL sp_issue_blood(@demo_request, @demo_stock, 999999, 1, @issue_id, @status); -- staff id does not exist (FK error -> ROLLBACK)
SELECT @issue_id AS issue_id, @status AS status;
SELECT inventory_id, units_available FROM bloodinventory WHERE inventory_id = @demo_stock;   -- still 2

-- 3.8 Issue the last needed unit: the request becomes Fulfilled automatically
CALL sp_issue_blood(@demo_request, @demo_stock, 1, 1, @issue_id, @status);
SELECT @issue_id AS issue_id, @status AS status;
SELECT request_id, units_required, units_issued, request_status FROM vw_request_fulfilment WHERE request_id = @demo_request;

-- 3.9 A closed request cannot receive more blood
CALL sp_issue_blood(@demo_request, @demo_stock, 1, 1, @issue_id, @status);
SELECT @issue_id AS issue_id, @status AS status;

-- 3.10 Expired stock is refused (temporary expired row for the demo)
UPDATE bloodinventory SET expiry_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY) WHERE inventory_id = @demo_stock;
UPDATE bloodrequest SET request_status = 'Pending', units_required = 5 WHERE request_id = @demo_request;
CALL sp_issue_blood(@demo_request, @demo_stock, 1, 1, @issue_id, @status);
SELECT @issue_id AS issue_id, @status AS status;

-- 3.11 List the stored procedures
SHOW PROCEDURE STATUS WHERE Db = 'bloodbankdb';

-- =====================================================================
-- PART 4 - CLEANUP of the DEMO rows (sample data is left exactly as before)
-- =====================================================================
DELETE FROM bloodissue WHERE request_id = @demo_request;
DELETE FROM bloodrequest WHERE request_id = @demo_request;
DELETE FROM patient WHERE patient_id = @demo_patient;
DELETE FROM bloodinventory WHERE inventory_id = @demo_stock;
DELETE FROM bloodtest WHERE donation_id = @donation_id;
DELETE FROM donation WHERE donor_id = @demo_donor;
DELETE FROM donor WHERE donor_id = @demo_donor;
SELECT 'CLEANUP DONE: DEMO rows removed' AS message,
       (SELECT COUNT(*) FROM donor) AS donors, (SELECT COUNT(*) FROM donation) AS donations,
       (SELECT COUNT(*) FROM bloodissue) AS issues;

-- =====================================================================
-- OPTIONAL: remove everything this file created (select and run these lines)
-- =====================================================================
-- DROP PROCEDURE IF EXISTS sp_issue_blood;
-- DROP PROCEDURE IF EXISTS sp_register_donation;
-- DROP PROCEDURE IF EXISTS sp_blood_group_summary;
-- DROP VIEW IF EXISTS vw_request_fulfilment;
-- DROP VIEW IF EXISTS vw_inventory_status;
-- DROP FUNCTION IF EXISTS fn_issuable_units;
-- DROP FUNCTION IF EXISTS fn_request_remaining;
-- DROP FUNCTION IF EXISTS fn_available_units;
-- DROP FUNCTION IF EXISTS fn_is_eligible_donor;
-- DROP FUNCTION IF EXISTS fn_days_to_expiry;
-- DROP FUNCTION IF EXISTS fn_expiry_status;
-- (vw_donation_history, vw_available_inventory, vw_pending_requests and vw_blood_group_stock
--  are shared with views.sql; drop them only if you do not need that file.)
