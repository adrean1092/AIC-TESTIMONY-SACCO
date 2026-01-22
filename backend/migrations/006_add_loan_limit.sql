-- File: 006_add_loan_limit.sql
-- Purpose: Add loan_limit column, initialize values, create trigger to auto-update

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS loan_limit DECIMAL(10,2) DEFAULT 0;

UPDATE users u
SET loan_limit = (
    SELECT COALESCE(SUM(s.amount) * 3, 0)
    FROM savings s
    WHERE s.user_id = u.id
)
WHERE u.role = 'MEMBER' AND u.loan_limit = 0;

CREATE OR REPLACE FUNCTION update_loan_limit_on_savings()
RETURNS TRIGGER AS \$\$
DECLARE
    target_user_id INTEGER;
BEGIN
    target_user_id := COALESCE(NEW.user_id, OLD.user_id);

    UPDATE users
    SET loan_limit = (
        SELECT COALESCE(SUM(amount) * 3, 0)
        FROM savings
        WHERE user_id = target_user_id
    )
    WHERE id = target_user_id AND role = 'MEMBER';

    RETURN NULL;
END;
\$\$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_loan_limit ON savings;

CREATE TRIGGER trigger_update_loan_limit
AFTER INSERT OR UPDATE OR DELETE ON savings
FOR EACH ROW
EXECUTE FUNCTION update_loan_limit_on_savings();

ALTER TABLE users
ADD CONSTRAINT IF NOT EXISTS chk_loan_limit_non_negative
CHECK (loan_limit >= 0);

SELECT 'loan_limit column added and triggers created successfully!' AS status;
