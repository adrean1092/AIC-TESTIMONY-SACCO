-- ==============================================================================
-- Migration: Fix loans with missing or invalid data
-- Date: 2026-02-13
-- ==============================================================================

-- Step 1: Fix all loans with missing or zero values
UPDATE loans
SET
    initial_amount = CASE WHEN initial_amount IS NULL OR initial_amount = 0 THEN amount ELSE initial_amount END,
    principal_amount = CASE WHEN principal_amount IS NULL OR principal_amount = 0 THEN COALESCE(initial_amount, amount) * 1.005 ELSE principal_amount END,
    interest_rate = CASE WHEN interest_rate IS NULL OR interest_rate = 0 THEN 1.045 ELSE interest_rate END,
    repayment_period = CASE WHEN repayment_period IS NULL OR repayment_period = 0 THEN 12 ELSE repayment_period END,
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

-- Step 2: Add missing columns to loan_repayments
ALTER TABLE loan_repayments ADD COLUMN IF NOT EXISTS principal_paid NUMERIC(12,2) DEFAULT 0;
ALTER TABLE loan_repayments ADD COLUMN IF NOT EXISTS interest_paid NUMERIC(12,2) DEFAULT 0;

-- Step 3: Ensure no NULLs exist
UPDATE loan_repayments SET principal_paid = 0 WHERE principal_paid IS NULL;
UPDATE loan_repayments SET interest_paid = 0 WHERE interest_paid IS NULL;
