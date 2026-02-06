-- ============================================================
-- Migration: Create Dividends Tables
-- Description: Creates tables for dividend declarations and allocations,
--              adds created_at column to savings, indexes, triggers, and comments
-- ============================================================

-- -------------------------------
-- 1️⃣ Create dividend_declarations table
-- -------------------------------
CREATE TABLE IF NOT EXISTS dividend_declarations (
    id SERIAL PRIMARY KEY,
    financial_year INTEGER NOT NULL UNIQUE,
    dividend_rate DECIMAL(5,2) NOT NULL CHECK (dividend_rate > 0 AND dividend_rate <= 20),
    total_eligible_savings DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_dividend_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    declaration_date TIMESTAMP DEFAULT NOW(),
    payment_status VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING','PAID')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- -------------------------------
-- 2️⃣ Create dividend_allocations table
-- -------------------------------
CREATE TABLE IF NOT EXISTS dividend_allocations (
    id SERIAL PRIMARY KEY,
    declaration_id INTEGER NOT NULL REFERENCES dividend_declarations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    savings_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    dividend_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING','PAID')),
    payment_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(declaration_id, user_id)
);

-- -------------------------------
-- 3️⃣ Add created_at column to savings table
-- -------------------------------
ALTER TABLE savings
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- -------------------------------
-- 4️⃣ Create indexes for performance
-- -------------------------------
CREATE INDEX IF NOT EXISTS idx_dividend_declarations_year
ON dividend_declarations(financial_year);

CREATE INDEX IF NOT EXISTS idx_dividend_declarations_status
ON dividend_declarations(payment_status);

CREATE INDEX IF NOT EXISTS idx_dividend_allocations_declaration
ON dividend_allocations(declaration_id);

CREATE INDEX IF NOT EXISTS idx_dividend_allocations_user
ON dividend_allocations(user_id);

CREATE INDEX IF NOT EXISTS idx_dividend_allocations_status
ON dividend_allocations(payment_status);

-- -------------------------------
-- 5️⃣ Create trigger function to auto-update updated_at
-- -------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -------------------------------
-- 6️⃣ Create triggers for dividend tables
-- -------------------------------
CREATE TRIGGER update_dividend_declarations_updated_at
BEFORE UPDATE ON dividend_declarations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dividend_allocations_updated_at
BEFORE UPDATE ON dividend_allocations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- -------------------------------
-- 7️⃣ Add comments for clarity
-- -------------------------------
COMMENT ON TABLE dividend_declarations IS 'Stores dividend declarations for each financial year';
COMMENT ON TABLE dividend_allocations IS 'Stores individual member dividend allocations';
COMMENT ON COLUMN dividend_declarations.dividend_rate IS 'Dividend rate as percentage (e.g., 10.5 for 10.5%)';
COMMENT ON COLUMN dividend_allocations.savings_amount IS 'Member savings amount used to calculate dividend';
COMMENT ON COLUMN dividend_allocations.dividend_amount IS 'Calculated dividend amount for the member';
