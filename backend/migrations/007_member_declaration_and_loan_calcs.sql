-- Database Migration Script
-- Add new fields for member declarations and loan calculations

-- 1. Add declaration fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS declaration_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS declaration_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS declaration_data JSONB;

-- 2. Add new loan calculation fields to loans table
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS processing_fee DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_payment DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS total_interest DECIMAL(15, 2);

-- 3. Create loan_schedules table to store payment schedules
CREATE TABLE IF NOT EXISTS loan_schedules (
  id SERIAL PRIMARY KEY,
  loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  schedule_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create index on loan_schedules
CREATE INDEX IF NOT EXISTS idx_loan_schedules_loan_id ON loan_schedules(loan_id);

-- 5. Add source column to savings table (if not exists)
ALTER TABLE savings
ADD COLUMN IF NOT EXISTS source VARCHAR(255) DEFAULT 'Savings Deposit';

-- 6. Create audit log table for declarations
CREATE TABLE IF NOT EXISTS declaration_audit (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  declaration_data JSONB NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Create index on declaration_audit
CREATE INDEX IF NOT EXISTS idx_declaration_audit_user_id ON declaration_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_declaration_audit_created_at ON declaration_audit(created_at);

-- 8. Add comments for documentation
COMMENT ON COLUMN users.declaration_accepted IS 'Whether member has accepted SACCO terms and conditions';
COMMENT ON COLUMN users.declaration_date IS 'Date when member accepted terms';
COMMENT ON COLUMN users.declaration_data IS 'Full declaration form data in JSON format';
COMMENT ON COLUMN loans.processing_fee IS 'One-time processing fee charged on loan';
COMMENT ON COLUMN loans.monthly_payment IS 'Fixed monthly payment amount (reducing balance)';
COMMENT ON COLUMN loans.total_interest IS 'Total interest to be paid over loan period';
COMMENT ON TABLE loan_schedules IS 'Stores detailed payment schedules for each loan';

-- Verification queries
SELECT 
  'Users table updated' as status,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE declaration_accepted = true) as declared_users
FROM users;

SELECT 
  'Loans table updated' as status,
  COUNT(*) as total_loans
FROM loans;