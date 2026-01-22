-- 1️⃣ Add phone column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- 2️⃣ Ensure id_number column exists and is NOT NULL
ALTER TABLE users
ADD COLUMN IF NOT EXISTS id_number VARCHAR(50) NOT NULL;

-- Make id_number unique
DO $$
BEGIN
   IF NOT EXISTS (
       SELECT 1 FROM pg_indexes WHERE tablename='users' AND indexname='users_id_number_key'
   ) THEN
       CREATE UNIQUE INDEX users_id_number_key ON users(id_number);
   END IF;
END
$$;

-- 3️⃣ Create savings table if missing
CREATE TABLE IF NOT EXISTS savings (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4️⃣ Create loans table if missing
CREATE TABLE IF NOT EXISTS loans (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    interest_rate NUMERIC(5,2) NOT NULL,
    repayment_period INT,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5️⃣ Create guarantors table if missing
CREATE TABLE IF NOT EXISTS guarantors (
    id SERIAL PRIMARY KEY,
    loan_id INT REFERENCES loans(id) ON DELETE CASCADE,
    guarantor_name VARCHAR(100) NOT NULL,
    guarantor_email VARCHAR(100)
);
