-- =====================================================================
-- aggregate_queries.sql  |  COUNT, SUM, AVG, MIN, MAX, GROUP BY, HAVING
-- All statements are read-only SELECTs.
-- =====================================================================
USE bloodbankdb;

-- COUNT: how many rows?
SELECT COUNT(*) AS total_donors FROM donor;
SELECT COUNT(DISTINCT blood_group) AS different_blood_groups FROM donor;
SELECT COUNT(last_donation_date) AS donors_with_donation_date FROM donor;   -- COUNT(column) skips NULLs

-- SUM: total blood collected (ml) and units in stock
SELECT SUM(quantity_ml) AS total_ml_collected FROM donation;
SELECT SUM(units_available) AS units_in_stock FROM bloodinventory;

-- AVG / MIN / MAX
SELECT AVG(age) AS average_donor_age, MIN(age) AS youngest, MAX(age) AS oldest FROM donor;
SELECT MIN(expiry_date) AS earliest_expiry, MAX(expiry_date) AS latest_expiry FROM bloodinventory;

-- GROUP BY: one result row per group
SELECT blood_group, COUNT(*) AS donors, AVG(age) AS avg_age FROM donor GROUP BY blood_group ORDER BY blood_group;
SELECT bank_id, COUNT(*) AS donations, SUM(quantity_ml) AS total_ml FROM donation GROUP BY bank_id ORDER BY bank_id;
SELECT urgency, request_status, COUNT(*) AS requests FROM bloodrequest GROUP BY urgency, request_status;

-- HAVING: filter GROUPS (WHERE filters rows BEFORE grouping, HAVING filters AFTER)
-- Blood groups with at least 3 donors
SELECT blood_group, COUNT(*) AS donors
FROM donor
GROUP BY blood_group
HAVING COUNT(*) >= 3;

-- Blood groups whose stock units exceed 2, counting only non-expired stock (WHERE + HAVING together)
SELECT blood_group, SUM(units_available) AS units
FROM bloodinventory
WHERE expiry_date >= CURDATE()
GROUP BY blood_group
HAVING SUM(units_available) > 2
ORDER BY units DESC;

-- Monthly donation statistics (used by the dashboard chart)
SELECT DATE_FORMAT(donation_date, '%Y-%m') AS month, COUNT(*) AS donations, SUM(quantity_ml) AS total_ml
FROM donation
GROUP BY month
ORDER BY month;
