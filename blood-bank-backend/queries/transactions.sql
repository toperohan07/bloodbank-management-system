-- =====================================================================
-- transactions.sql  |  START TRANSACTION, COMMIT, ROLLBACK, SAVEPOINT
-- Every demo ends in ROLLBACK, so running this whole file in MySQL
-- Workbench leaves your data unchanged. Change a ROLLBACK to COMMIT only
-- if you really want to keep the result.
-- Tables are InnoDB (transactional). Workbench: turn auto-commit off or
-- keep the START TRANSACTION lines exactly as written.
-- =====================================================================
USE bloodbankdb;

-- ---------------------------------------------------------------------
-- 1. ROLLBACK: undo everything since START TRANSACTION
-- ---------------------------------------------------------------------
START TRANSACTION;
UPDATE bloodinventory SET units_available = 0 WHERE inventory_id = 1;
SELECT inventory_id, units_available FROM bloodinventory WHERE inventory_id = 1;   -- shows 0
ROLLBACK;
SELECT inventory_id, units_available FROM bloodinventory WHERE inventory_id = 1;   -- back to 1

-- ---------------------------------------------------------------------
-- 2. COMMIT: make changes permanent (no data is changed here: same value written back)
-- ---------------------------------------------------------------------
START TRANSACTION;
UPDATE donor SET city = city WHERE donor_id = 1;
COMMIT;

-- ---------------------------------------------------------------------
-- 3. SAVEPOINT: roll back only PART of a transaction
-- ---------------------------------------------------------------------
START TRANSACTION;
UPDATE hospital SET city = 'Mumbai' WHERE hospital_id = 1;      -- step A
SAVEPOINT after_hospital;
UPDATE hospital SET city = 'Delhi' WHERE hospital_id = 2;       -- step B
SELECT hospital_id, city FROM hospital WHERE hospital_id IN (1, 2);   -- both changed
ROLLBACK TO SAVEPOINT after_hospital;                            -- undo only step B
SELECT hospital_id, city FROM hospital WHERE hospital_id IN (1, 2);   -- hospital 1 = Mumbai, 2 = Pune
ROLLBACK;                                                         -- undo step A as well
SELECT hospital_id, city FROM hospital WHERE hospital_id IN (1, 2);   -- both Pune again

-- ---------------------------------------------------------------------
-- 4. The BLOOD ISSUE transaction used by POST /api/issues
--    Run the statements one after another in the same session.
--    Pick values for a request and an inventory row; the checks below show what the API verifies.
-- ---------------------------------------------------------------------
SET @request_id = 1, @inventory_id = 1, @staff_id = 1, @units = 1;

START TRANSACTION;                                                    -- 1. start

-- 2. Lock the inventory row: other sessions that try to issue from it must WAIT until we finish
SELECT inventory_id, donation_id, blood_group, units_available,
       (expiry_date IS NOT NULL AND expiry_date >= CURDATE()) AS not_expired     -- 4. expiry check
FROM bloodinventory WHERE inventory_id = @inventory_id FOR UPDATE;

-- Lock the request row too (prevents over-issuing the same request concurrently)
SELECT request_id, blood_group, units_required, request_status
FROM bloodrequest WHERE request_id = @request_id FOR UPDATE;

-- 3/5/6. The application now checks, in Python, on the rows above:
--    units_available >= @units, blood groups equal, not_expired = 1, @units > 0,
--    a bloodtest row with overall_status = 'Safe' exists for the donation, and
--    units already issued + @units <= units_required.
SELECT overall_status FROM bloodtest
WHERE donation_id = (SELECT donation_id FROM bloodinventory WHERE inventory_id = @inventory_id);
SELECT COALESCE(SUM(units_issued), 0) AS already_issued FROM bloodissue WHERE request_id = @request_id;

-- 7. Record the issue
INSERT INTO bloodissue (request_id, inventory_id, staff_id, issue_date, units_issued)
VALUES (@request_id, @inventory_id, @staff_id, CURDATE(), @units);

-- 8. Reduce the stock (the CHECK constraint units_available >= 0 is a second safety net)
UPDATE bloodinventory SET units_available = units_available - @units WHERE inventory_id = @inventory_id;

SELECT inventory_id, units_available FROM bloodinventory WHERE inventory_id = @inventory_id;

-- 9. COMMIT if every step succeeded, otherwise ROLLBACK. This demo always rolls back:
ROLLBACK;
-- COMMIT;

-- ---------------------------------------------------------------------
-- 5. Locks across two sessions (try it with two Workbench query tabs)
--    Tab 1: START TRANSACTION; SELECT * FROM bloodinventory WHERE inventory_id = 1 FOR UPDATE;
--    Tab 2: the same SELECT ... FOR UPDATE  -> waits until Tab 1 runs COMMIT or ROLLBACK.
-- ---------------------------------------------------------------------
