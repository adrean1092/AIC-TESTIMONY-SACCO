-- 🔹 Quick fix for existing loans (calculate principal_amount correctly)

-- Update all existing loans to calculate principal from initial_amount or amount
UPDATE public.loans
SET principal_amount = ROUND(
    CASE 
        WHEN initial_amount IS NOT NULL AND initial_amount > 0 THEN initial_amount / 1.10
        WHEN amount IS NOT NULL AND amount > 0 THEN amount / 1.10
        ELSE 0
    END,
    2
)
WHERE principal_amount IS NULL OR principal_amount = 0;

-- 🔹 Verify the calculation for last 20 loans
SELECT 
    id,
    user_id,
    principal_amount AS "Principal",
    ROUND(initial_amount - principal_amount, 2) AS "Interest",
    initial_amount AS "Total Payable",
    amount AS "Current Balance",
    status
FROM public.loans
ORDER BY id DESC
LIMIT 20;
