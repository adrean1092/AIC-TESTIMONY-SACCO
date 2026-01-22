-- Migration: Make id_number NOT NULL, populate existing users, enforce uniqueness

-- 1️⃣ Make id_number NOT NULL
ALTER TABLE users
ALTER COLUMN id_number SET NOT NULL;

-- 2️⃣ Populate id_number for existing users if empty
UPDATE users
SET id_number = 'MEM' || id
WHERE id_number IS NULL;

-- 3️⃣ Ensure id_number is UNIQUE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'users'
          AND constraint_type = 'UNIQUE'
          AND constraint_name = 'users_id_number_unique'
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT users_id_number_unique UNIQUE (id_number);
    END IF;
END
$$;
