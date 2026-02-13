-- ==============================================================================
-- SQL FIX FOR LOAN DATA ISSUES
-- Run this to fix any loans with missing or invalid data
-- ==============================================================================

-- Step 1: Check current loan data for loan ID 11 (and all loans)
SELECT 
  id,
  user_id,
  amount as current_balance,
  initial_amount,
  principal_amount,
  principal_paid,
  interest_paid,
  interest_rate,
  repayment_period,
  status,
  created_at
FROM loans
WHERE id = 11;  -- Check specific loan
-- Remove WHERE clause to see all loans

-- Step 2: Check for problematic loans (NULL or zero values)
SELECT 
  id,
  user_id,
  status,
  CASE 
    WHEN initial_amount IS NULL OR initial_amount = 0 THEN '❌ Missing initial_amount'
    ELSE '✅ OK'
  END as initial_amount_check,
  CASE 
    WHEN principal_amount IS NULL OR principal_amount = 0 THEN '❌ Missing principal_amount'
    ELSE '✅ OK'
  END as principal_amount_check,
  CASE 
    WHEN interest_rate IS NULL OR interest_rate = 0 THEN '❌ Missing interest_rate'
    ELSE '✅ OK'
  END as interest_rate_check,
  CASE 
    WHEN repayment_period IS NULL OR repayment_period = 0 THEN '❌ Missing repayment_period'
    ELSE '✅ OK'
  END as repayment_period_check
FROM loans
WHERE initial_amount IS NULL 
   OR principal_amount IS NULL 
   OR interest_rate IS NULL 
   OR repayment_period IS NULL
   OR initial_amount = 0
   OR principal_amount = 0
   OR interest_rate = 0
   OR repayment_period = 0;

-- Step 3: FIX LOAN #11 SPECIFICALLY (if it has issues)
UPDATE loans
SET 
  -- Fix initial_amount
  initial_amount = CASE 
    WHEN initial_amount IS NULL OR initial_amount = 0 THEN amount 
    ELSE initial_amount 
  END,
  
  -- Fix principal_amount (add 0.5% processing fee if missing)
  principal_amount = CASE 
    WHEN principal_amount IS NULL OR principal_amount = 0 THEN 
      COALESCE(initial_amount, amount) * 1.005
    ELSE principal_amount 
  END,
  
  -- Fix interest_rate (default to 1.045% monthly)
  interest_rate = CASE 
    WHEN interest_rate IS NULL OR interest_rate = 0 THEN 1.045 
    ELSE interest_rate 
  END,
  
  -- Fix repayment_period (default to 12 months)
  repayment_period = CASE 
    WHEN repayment_period IS NULL OR repayment_period = 0 THEN 12 
    ELSE repayment_period 
  END,
  
  -- Ensure principal_paid and interest_paid are not NULL
  principal_paid = COALESCE(principal_paid, 0),
  interest_paid = COALESCE(interest_paid, 0)
  
WHERE id = 11;

-- Step 4: FIX ALL LOANS (run this to fix all problematic loans)
UPDATE loans
SET 
  initial_amount = CASE 
    WHEN initial_amount IS NULL OR initial_amount = 0 THEN amount 
    ELSE initial_amount 
  END,
  
  principal_amount = CASE 
    WHEN principal_amount IS NULL OR principal_amount = 0 THEN 
      COALESCE(initial_amount, amount) * 1.005
    ELSE principal_amount 
  END,
  
  interest_rate = CASE 
    WHEN interest_rate IS NULL OR interest_rate = 0 THEN 1.045 
    ELSE interest_rate 
  END,
  
  repayment_period = CASE 
    WHEN repayment_period IS NULL OR repayment_period = 0 THEN 12 
    ELSE repayment_period 
  END,
  
  principal_paid = COALESCE(principal_paid, 0),
  interest_paid = COALESCE(interest_paid, 0)
  
WHERE initial_amount IS NULL 
   OR principal_amount IS NULL 
   OR interest_rate IS NULL 
   OR repayment_period IS NULL
   OR principal_paid IS NULL
   OR interest_paid IS NULL
   OR initial_amount = 0
   OR principal_amount = 0
   OR interest_rate = 0
   OR repayment_period = 0;

-- Step 5: Verify the fix worked
SELECT 
  id,
  user_id,
  amount as current_balance,
  initial_amount,
  principal_amount,
  principal_paid,
  interest_paid,
  interest_rate,
  repayment_period,
  status
FROM loans
WHERE id = 11;

-- Step 6: Check loan repayments for loan #11
SELECT 
  id,
  loan_id,
  amount,
  principal_paid,
  interest_paid,
  payment_date
FROM loan_repayments
WHERE loan_id = 11
ORDER BY payment_date DESC;

-- Step 7: Add missing columns if they don't exist
-- (Run these one by one and ignore errors if columns already exist)

ALTER TABLE loans ADD COLUMN IF NOT EXISTS principal_paid NUMERIC(10,2) DEFAULT 0;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS interest_paid NUMERIC(10,2) DEFAULT 0;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS principal_amount NUMERIC(12,2);
ALTER TABLE loans ADD COLUMN IF NOT EXISTS initial_amount NUMERIC(12,2);

-- Step 8: Add NOT NULL constraints with defaults (optional, for data integrity)
ALTER TABLE loans ALTER COLUMN principal_paid SET DEFAULT 0;
ALTER TABLE loans ALTER COLUMN interest_paid SET DEFAULT 0;
ALTER TABLE loans ALTER COLUMN interest_rate SET DEFAULT 1.045;
ALTER TABLE loans ALTER COLUMN repayment_period SET DEFAULT 12;

-- Update any existing NULL values before adding NOT NULL constraint
UPDATE loans SET principal_paid = 0 WHERE principal_paid IS NULL;
UPDATE loans SET interest_paid = 0 WHERE interest_paid IS NULL;

-- Step 9: Verify all loans are now valid
SELECT 
  COUNT(*) as total_loans,
  COUNT(CASE WHEN initial_amount IS NULL OR initial_amount = 0 THEN 1 END) as missing_initial_amount,
  COUNT(CASE WHEN principal_amount IS NULL OR principal_amount = 0 THEN 1 END) as missing_principal_amount,
  COUNT(CASE WHEN interest_rate IS NULL OR interest_rate = 0 THEN 1 END) as missing_interest_rate,
  COUNT(CASE WHEN repayment_period IS NULL OR repayment_period = 0 THEN 1 END) as missing_repayment_period,
  COUNT(CASE WHEN principal_paid IS NULL THEN 1 END) as missing_principal_paid,
  COUNT(CASE WHEN interest_paid IS NULL THEN 1 END) as missing_interest_paid
FROM loans;

-- Expected result: All missing counts should be 0

-- ==============================================================================
-- IMPORTANT NOTES:
-- ==============================================================================
-- 1. Always backup your database before running UPDATE statements
-- 2. Test on a development database first
-- 3. The fixes assume:
--    - Processing fee is 0.5% (multiply by 1.005)
--    - Default interest rate is 1.045% monthly
--    - Default repayment period is 12 months
-- 4. Adjust these values if your SACCO uses different defaults
-- ==============================================================================