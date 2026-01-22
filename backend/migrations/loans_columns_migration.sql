-- 📄 loans_columns_migration.sql
-- Migration to add missing columns to loans table and backfill existing data

-- 1️⃣ Add principal_amount column (actual borrowed amount)
ALTER TABLE public.loans
ADD COLUMN IF NOT EXISTS principal_amount DECIMAL(10,2);

-- 2️⃣ Add initial_amount column (total payable with interest)
ALTER TABLE public.loans
ADD COLUMN IF NOT EXISTS initial_amount DECIMAL(10,2);

-- 3️⃣ Backfill existing loans: set principal_amount = amount if NULL
UPDATE public.loans
SET principal_amount = amount
WHERE principal_amount IS NULL;

-- 4️⃣ Backfill existing loans: set initial_amount = amount if NULL
UPDATE public.loans
SET initial_amount = amount
WHERE initial_amount IS NULL;

-- 5️⃣ Verify the columns exist in the table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'loans'
ORDER BY ordinal_position;
