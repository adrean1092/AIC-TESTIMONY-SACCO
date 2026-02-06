-- =====================================================
-- AIC TESTIMONY SACCO - COMPLETE DATABASE MIGRATION
-- This script adds all missing columns to existing tables
-- =====================================================

-- Start transaction
BEGIN;

-- =====================================================
-- 1. UPDATE LOANS TABLE
-- =====================================================

-- Add loan_purpose column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loans' AND column_name = 'loan_purpose'
    ) THEN
        ALTER TABLE loans ADD COLUMN loan_purpose TEXT;
        RAISE NOTICE 'Added loan_purpose column to loans table';
    ELSE
        RAISE NOTICE 'loan_purpose column already exists in loans table';
    END IF;
END $$;

-- Add processing_fee column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loans' AND column_name = 'processing_fee'
    ) THEN
        ALTER TABLE loans ADD COLUMN processing_fee DECIMAL(15, 2) DEFAULT 0;
        RAISE NOTICE 'Added processing_fee column to loans table';
    ELSE
        RAISE NOTICE 'processing_fee column already exists in loans table';
    END IF;
END $$;

-- Add monthly_payment column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loans' AND column_name = 'monthly_payment'
    ) THEN
        ALTER TABLE loans ADD COLUMN monthly_payment DECIMAL(15, 2);
        RAISE NOTICE 'Added monthly_payment column to loans table';
    ELSE
        RAISE NOTICE 'monthly_payment column already exists in loans table';
    END IF;
END $$;

-- Add total_interest column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loans' AND column_name = 'total_interest'
    ) THEN
        ALTER TABLE loans ADD COLUMN total_interest DECIMAL(15, 2);
        RAISE NOTICE 'Added total_interest column to loans table';
    ELSE
        RAISE NOTICE 'total_interest column already exists in loans table';
    END IF;
END $$;

-- =====================================================
-- 2. UPDATE USERS TABLE
-- =====================================================

-- Add declaration_accepted column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'declaration_accepted'
    ) THEN
        ALTER TABLE users ADD COLUMN declaration_accepted BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added declaration_accepted column to users table';
    ELSE
        RAISE NOTICE 'declaration_accepted column already exists in users table';
    END IF;
END $$;

-- Add declaration_date column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'declaration_date'
    ) THEN
        ALTER TABLE users ADD COLUMN declaration_date TIMESTAMP;
        RAISE NOTICE 'Added declaration_date column to users table';
    ELSE
        RAISE NOTICE 'declaration_date column already exists in users table';
    END IF;
END $$;

-- Add declaration_data column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'declaration_data'
    ) THEN
        ALTER TABLE users ADD COLUMN declaration_data JSONB;
        RAISE NOTICE 'Added declaration_data column to users table';
    ELSE
        RAISE NOTICE 'declaration_data column already exists in users table';
    END IF;
END $$;

-- =====================================================
-- 3. UPDATE SAVINGS TABLE
-- =====================================================

-- Add source column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'savings' AND column_name = 'source'
    ) THEN
        ALTER TABLE savings ADD COLUMN source VARCHAR(255) DEFAULT 'Savings Deposit';
        RAISE NOTICE 'Added source column to savings table';
    ELSE
        RAISE NOTICE 'source column already exists in savings table';
    END IF;
END $$;

-- =====================================================
-- 4. CREATE LOAN_SCHEDULES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS loan_schedules (
  id SERIAL PRIMARY KEY,
  loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  schedule_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on loan_schedules
CREATE INDEX IF NOT EXISTS idx_loan_schedules_loan_id ON loan_schedules(loan_id);

-- =====================================================
-- 5. CREATE DECLARATION_AUDIT TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS declaration_audit (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  declaration_data JSONB NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes on declaration_audit
CREATE INDEX IF NOT EXISTS idx_declaration_audit_user_id ON declaration_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_declaration_audit_created_at ON declaration_audit(created_at);

-- =====================================================
-- 6. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN loans.loan_purpose IS 'Purpose or reason for the loan';
COMMENT ON COLUMN loans.processing_fee IS 'One-time processing fee charged on loan';
COMMENT ON COLUMN loans.monthly_payment IS 'Fixed monthly payment amount (reducing balance)';
COMMENT ON COLUMN loans.total_interest IS 'Total interest to be paid over loan period';

COMMENT ON COLUMN users.declaration_accepted IS 'Whether member has accepted SACCO terms and conditions';
COMMENT ON COLUMN users.declaration_date IS 'Date when member accepted terms';
COMMENT ON COLUMN users.declaration_data IS 'Full declaration form data in JSON format';

COMMENT ON COLUMN savings.source IS 'Source of savings (e.g., Savings Deposit, Dividend, etc.)';

COMMENT ON TABLE loan_schedules IS 'Stores detailed payment schedules for each loan';
COMMENT ON TABLE declaration_audit IS 'Audit trail for member declarations';

-- =====================================================
-- 7. VERIFICATION QUERIES
-- =====================================================

-- Verify loans table columns
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'loans' 
    AND column_name IN ('loan_purpose', 'processing_fee', 'monthly_payment', 'total_interest');
    
    RAISE NOTICE 'Loans table has % new columns', col_count;
END $$;

-- Verify users table columns
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'users' 
    AND column_name IN ('declaration_accepted', 'declaration_date', 'declaration_data');
    
    RAISE NOTICE 'Users table has % new columns', col_count;
END $$;

-- Display summary
SELECT 
  'Migration Complete' as status,
  COUNT(*) as total_loans,
  COUNT(*) FILTER (WHERE loan_purpose IS NOT NULL) as loans_with_purpose,
  COUNT(*) FILTER (WHERE processing_fee IS NOT NULL) as loans_with_fee
FROM loans;

SELECT 
  'Users Updated' as status,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE declaration_accepted = true) as declared_users
FROM users;

-- Commit transaction
COMMIT;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT 'Database migration completed successfully!' as message;