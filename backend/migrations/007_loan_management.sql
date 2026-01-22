-- File: 007_loan_management.sql
-- Purpose: Update loan_limit logic and track initial loan amounts

-- 1. Add loan_limit column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS loan_limit DECIMAL(10, 2) DEFAULT 0;

-- 2. Add initial_amount column to loans table
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS initial_amount DECIMAL(10, 2);

-- 3. Set initial_amount for existing loans
UPDATE loans 
SET initial_amount = amount 
WHERE initial_amount IS NULL;

-- 4. Set initial loan limit based on 3x savings
UPDATE users u
SET loan_limit = (
  SELECT COALESCE(SUM(s.amount) * 3, 0)
  FROM savings s
  WHERE s.user_id = u.id
)
WHERE u.role = 'MEMBER';

-- 5. Adjust loan limits for active loans
UPDATE users u
SET loan_limit = loan_limit - COALESCE(( 
  SELECT SUM(l.amount)
  FROM loans l
  WHERE l.user_id = u.id
  AND l.status = 'APPROVED'
  AND l.amount > 0
), 0)
WHERE u.role = 'MEMBER';

-- 6. Function to update loan_limit on new savings
CREATE OR REPLACE FUNCTION update_loan_limit_on_savings()
RETURNS TRIGGER AS \$\$
DECLARE
  total_savings DECIMAL(10,2);
  active_loans DECIMAL(10,2);
  new_limit DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO total_savings
  FROM savings
  WHERE user_id = NEW.user_id;

  SELECT COALESCE(SUM(amount),0) INTO active_loans
  FROM loans
  WHERE user_id = NEW.user_id
  AND status = 'APPROVED'
  AND amount > 0;

  new_limit := (total_savings * 3) - active_loans;
  IF new_limit < 0 THEN
    new_limit := 0;
  END IF;

  UPDATE users
  SET loan_limit = new_limit
  WHERE id = NEW.user_id AND role = 'MEMBER';

  RETURN NEW;
END;
\$\$ LANGUAGE plpgsql;

-- 7. Drop and recreate savings trigger
DROP TRIGGER IF EXISTS trigger_update_loan_limit ON savings;

CREATE TRIGGER trigger_update_loan_limit
AFTER INSERT ON savings
FOR EACH ROW
EXECUTE FUNCTION update_loan_limit_on_savings();

-- 8. Function to set initial_amount on new loans
CREATE OR REPLACE FUNCTION set_initial_loan_amount()
RETURNS TRIGGER AS \$\$
BEGIN
  IF NEW.initial_amount IS NULL THEN
    NEW.initial_amount := NEW.amount;
  END IF;
  RETURN NEW;
END;
\$\$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_initial_amount ON loans;

CREATE TRIGGER trigger_set_initial_amount
BEFORE INSERT ON loans
FOR EACH ROW
EXECUTE FUNCTION set_initial_loan_amount();

-- 9. Success message
SELECT 
  'Migration completed successfully!' AS status,
  COUNT(*) AS total_members,
  COALESCE(SUM(loan_limit),0) AS total_loan_limits
FROM users
WHERE role = 'MEMBER';
