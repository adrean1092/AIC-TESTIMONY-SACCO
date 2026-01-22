-- 📄 final.sql
-- FULL LOAN MANAGEMENT MIGRATION
-- Add loan_limit, initial_amount, principal_amount, and triggers

-- 1️⃣ Add loan_limit column to users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS loan_limit NUMERIC(10,2) DEFAULT 0;

-- 2️⃣ Add initial_amount column to loans
ALTER TABLE public.loans
ADD COLUMN IF NOT EXISTS initial_amount NUMERIC(10,2);

-- 3️⃣ Add principal_amount column to loans
ALTER TABLE public.loans
ADD COLUMN IF NOT EXISTS principal_amount NUMERIC(10,2);

-- 4️⃣ Populate initial_amount for existing loans
UPDATE public.loans
SET initial_amount = amount
WHERE initial_amount IS NULL;

-- 5️⃣ Populate principal_amount for existing loans
UPDATE public.loans
SET principal_amount = initial_amount / 1.10
WHERE principal_amount IS NULL AND initial_amount IS NOT NULL;

UPDATE public.loans
SET principal_amount = amount / 1.10
WHERE principal_amount IS NULL;

-- 6️⃣ Populate loan_limit for existing members (3 × total savings)
UPDATE public.users u
SET loan_limit = COALESCE((
    SELECT SUM(s.amount) * 3
    FROM public.savings s
    WHERE s.user_id = u.id
), 0)
WHERE u.role='MEMBER';

-- 7️⃣ Adjust loan_limit for active loans
UPDATE public.users u
SET loan_limit = loan_limit - COALESCE((
    SELECT SUM(l.amount)
    FROM public.loans l
    WHERE l.user_id = u.id
      AND l.status='APPROVED'
      AND l.amount > 0
), 0)
WHERE u.role='MEMBER';

-- 8️⃣ Function to update loan_limit on new savings
CREATE OR REPLACE FUNCTION public.update_loan_limit_on_savings()
RETURNS TRIGGER AS $$
DECLARE
    total_savings NUMERIC(10,2);
    active_loans NUMERIC(10,2);
    new_limit NUMERIC(10,2);
BEGIN
    SELECT COALESCE(SUM(amount),0) INTO total_savings
    FROM public.savings
    WHERE user_id = NEW.user_id;

    SELECT COALESCE(SUM(amount),0) INTO active_loans
    FROM public.loans
    WHERE user_id = NEW.user_id AND status='APPROVED' AND amount > 0;

    new_limit := (total_savings * 3) - active_loans;
    IF new_limit < 0 THEN
        new_limit := 0;
    END IF;

    UPDATE public.users
    SET loan_limit = new_limit
    WHERE id = NEW.user_id AND role='MEMBER';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9️⃣ Drop old savings trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_loan_limit ON public.savings;

CREATE TRIGGER trigger_update_loan_limit
AFTER INSERT ON public.savings
FOR EACH ROW
EXECUTE FUNCTION public.update_loan_limit_on_savings();

-- 🔟 Function to set initial_amount on new loans
CREATE OR REPLACE FUNCTION public.set_initial_loan_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.initial_amount IS NULL THEN
        NEW.initial_amount := NEW.amount;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1️⃣1️⃣ Drop old loan trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_set_initial_amount ON public.loans;

CREATE TRIGGER trigger_set_initial_amount
BEFORE INSERT ON public.loans
FOR EACH ROW
EXECUTE FUNCTION public.set_initial_loan_amount();

-- 🔹 Final Summary
SELECT 
    'Migration completed successfully!' AS status,
    COUNT(*) AS total_members,
    COALESCE(SUM(loan_limit),0) AS total_loan_limits
FROM public.users
WHERE role='MEMBER';
