-- First, let's see what's in the database for this loan
SELECT 
  id,
  user_id,
  amount as "Current Amount",
  initial_amount as "Initial Amount", 
  principal_amount as "Principal Amount",
  status,
  created_at
FROM loans 
ORDER BY created_at DESC 
LIMIT 5;

-- If you see a loan with amount=1000 and principal_amount=909.09:
-- That means it was incorrectly calculated backwards
-- The member actually requested 1000, so we need to fix it:

-- ONLY run this if you confirm the loan is wrong:
-- UPDATE loans 
-- SET 
--   principal_amount = 1000,
--   amount = 1100,
--   initial_amount = 1100
-- WHERE id = [PUT THE LOAN ID HERE];

-- Example if loan ID is 5:
-- UPDATE loans 
-- SET 
--   principal_amount = 1000,
--   amount = 1100,
--   initial_amount = 1100
-- WHERE id = 5;