-- ========================
-- 003_create_missing_tables.sql
-- Create savings, loans, and guarantors tables
-- ========================

-- SAVINGS TABLE
CREATE TABLE IF NOT EXISTS savings (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LOANS TABLE
CREATE TABLE IF NOT EXISTS loans (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    interest_rate NUMERIC(5,2) NOT NULL,
    repayment_period INT DEFAULT 12,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GUARANTORS TABLE
CREATE TABLE IF NOT EXISTS guarantors (
    id SERIAL PRIMARY KEY,
    loan_id INT REFERENCES loans(id) ON DELETE CASCADE,
    guarantor_name VARCHAR(100) NOT NULL,
    guarantor_email VARCHAR(100),
    guarantor_phone VARCHAR(20)
);
