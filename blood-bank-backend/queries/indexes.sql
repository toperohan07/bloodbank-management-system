-- =====================================================================
-- indexes.sql  |  CREATE INDEX / DROP INDEX
-- An index speeds up WHERE / JOIN / ORDER BY on a column. The existing
-- schema already indexes primary keys, UNIQUE columns and foreign keys, so
-- we only add indexes for columns the API filters on.
-- NOTE: this adds indexes to bloodbankdb (no table/column/data changes).
-- Run once: re-running CREATE INDEX fails with "Duplicate key name" (error 1061).
-- The DROP INDEX cleanup is at the bottom.
-- =====================================================================
USE bloodbankdb;

-- Existing indexes (for reference)
SHOW INDEX FROM donor;

CREATE INDEX idx_donor_blood_group  ON donor (blood_group);
CREATE INDEX idx_donor_city         ON donor (city);
CREATE INDEX idx_inventory_expiry   ON bloodinventory (expiry_date);
CREATE INDEX idx_inventory_group    ON bloodinventory (blood_group, component_type);   -- composite index
CREATE INDEX idx_request_status     ON bloodrequest (request_status, urgency);
CREATE INDEX idx_donation_date      ON donation (donation_date);

-- See whether MySQL uses an index (look at the "key" column of the EXPLAIN output).
-- On a table this small the optimizer may still prefer a full scan.
EXPLAIN SELECT * FROM donor WHERE blood_group = 'O+';
EXPLAIN SELECT * FROM bloodinventory WHERE expiry_date < CURDATE();
EXPLAIN SELECT * FROM bloodrequest WHERE request_status = 'Pending' AND urgency = 'High';

SHOW INDEX FROM bloodinventory;

-- ---------------------------------------------------------------------
-- DROP INDEX cleanup (commented out; select the lines and run them)
-- ---------------------------------------------------------------------
-- DROP INDEX idx_donor_blood_group ON donor;
-- DROP INDEX idx_donor_city        ON donor;
-- DROP INDEX idx_inventory_expiry  ON bloodinventory;
-- DROP INDEX idx_inventory_group   ON bloodinventory;
-- DROP INDEX idx_request_status    ON bloodrequest;
-- DROP INDEX idx_donation_date     ON donation;
