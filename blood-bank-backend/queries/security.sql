-- =====================================================================
-- security.sql  |  DCL: GRANT and REVOKE   (data control language)
-- Run as an administrator (e.g. root). Creates demo MySQL users with
-- different privileges. Passwords below are placeholders: change them.
-- This is separate from transactions.sql on purpose.
-- =====================================================================

-- 1. Create demo accounts
CREATE USER IF NOT EXISTS 'bb_readonly'@'localhost' IDENTIFIED BY 'ChangeMe_Read1!';
CREATE USER IF NOT EXISTS 'bb_staff'@'localhost'    IDENTIFIED BY 'ChangeMe_Staff1!';
CREATE USER IF NOT EXISTS 'bb_app'@'localhost'      IDENTIFIED BY 'ChangeMe_App1!';

-- 2. GRANT: read-only account (reports / dashboard)
GRANT SELECT ON bloodbankdb.* TO 'bb_readonly'@'localhost';

-- 3. GRANT: front-desk staff can read everything and register donors/donations
GRANT SELECT ON bloodbankdb.* TO 'bb_staff'@'localhost';
GRANT INSERT, UPDATE ON bloodbankdb.donor    TO 'bb_staff'@'localhost';
GRANT INSERT, UPDATE ON bloodbankdb.donation TO 'bb_staff'@'localhost';

-- 4. GRANT: the Flask application account. It needs data access, but NOT
--    CREATE / DROP / ALTER, so a bug in the app cannot change the schema.
GRANT SELECT, INSERT, UPDATE, DELETE ON bloodbankdb.* TO 'bb_app'@'localhost';

-- 5. Inspect what was granted
SHOW GRANTS FOR 'bb_readonly'@'localhost';
SHOW GRANTS FOR 'bb_staff'@'localhost';
SHOW GRANTS FOR 'bb_app'@'localhost';

-- 6. REVOKE: take privileges away again
REVOKE UPDATE ON bloodbankdb.donation FROM 'bb_staff'@'localhost';
REVOKE INSERT, UPDATE ON bloodbankdb.donor FROM 'bb_staff'@'localhost';
SHOW GRANTS FOR 'bb_staff'@'localhost';

-- 7. Optional cleanup (commented out)
-- REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'bb_readonly'@'localhost';
-- DROP USER IF EXISTS 'bb_readonly'@'localhost';
-- DROP USER IF EXISTS 'bb_staff'@'localhost';
-- DROP USER IF EXISTS 'bb_app'@'localhost';

-- To run the Flask app with the restricted account, set in .env:
--   DB_USER=bb_app
--   DB_PASSWORD=<the password you chose>
