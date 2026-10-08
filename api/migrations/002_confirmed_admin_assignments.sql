-- MONARCH CODEX confirmed administrator assignments
-- Additive migration. Run after 001_member_foundation.sql.
-- No tables are dropped or recreated.

-- Main administrator: full Monarch Codex access + Sovereign Desk control centre.
UPDATE users
SET role = 'admin'
WHERE LOWER(email) = 'trademonarchofficial@gmail.com';

INSERT INTO admin_access (user_id, monarch_admin, sovereign_admin, is_main_admin)
SELECT id, 1, 1, 1
FROM users
WHERE LOWER(email) = 'trademonarchofficial@gmail.com'
ON DUPLICATE KEY UPDATE
  monarch_admin = 1,
  sovereign_admin = 1,
  is_main_admin = 1;

-- Sovereign Desk-only administrator.
UPDATE users
SET role = 'sovereign_admin'
WHERE LOWER(email) = 'handsomeprovidence38@gmail.com';

INSERT INTO admin_access (user_id, monarch_admin, sovereign_admin, is_main_admin)
SELECT id, 0, 1, 0
FROM users
WHERE LOWER(email) = 'handsomeprovidence38@gmail.com'
ON DUPLICATE KEY UPDATE
  monarch_admin = 0,
  sovereign_admin = 1,
  is_main_admin = 0;
