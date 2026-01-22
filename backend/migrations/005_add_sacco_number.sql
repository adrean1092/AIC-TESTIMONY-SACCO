-- 1. Add sacco_number column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS sacco_number VARCHAR(50) UNIQUE;

-- 2. Assign sacco numbers to existing MEMBERS only
WITH numbered_members AS (
  SELECT id,
         'SACCO-' || LPAD(ROW_NUMBER() OVER (ORDER BY id)::TEXT, 4, '0') AS sacco_no
  FROM users
  WHERE role = 'MEMBER'
)
UPDATE users u
SET sacco_number = n.sacco_no
FROM numbered_members n
WHERE u.id = n.id
  AND u.sacco_number IS NULL;
