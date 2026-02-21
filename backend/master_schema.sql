-- =====================================================
-- AIC TESTIMONY SACCO - MASTER DATABASE SCHEMA
-- Complete database setup for production deployment
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- 1. CREATE USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    id_number VARCHAR(50) UNIQUE NOT NULL,
    sacco_number VARCHAR(50) UNIQUE,
    role VARCHAR(20) DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER')),
    loan_limit NUMERIC(10,2) DEFAULT 0,
    declaration_accepted BOOLEAN DEFAULT FALSE,
    declaration_date TIMESTAMP,
    declaration_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE SAVINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS savings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    source VARCHAR(255) DEFAULT 'Savings Deposit',
    saved_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE LOANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS loans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    initial_amount NUMERIC(12,2),
    principal_amount NUMERIC(12,2),
    principal_paid NUMERIC(10,2) DEFAULT 0,
    interest_paid NUMERIC(10,2) DEFAULT 0,
    interest_rate NUMERIC(5,2) NOT NULL DEFAULT 1.8,
    repayment_period INTEGER NOT NULL,
    loan_purpose TEXT,
    processing_fee NUMERIC(15,2) DEFAULT 0,
    monthly_payment NUMERIC(15,2),
    total_interest NUMERIC(15,2),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PAID')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 4. CREATE GUARANTORS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS guarantors (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    guarantor_name VARCHAR(100) NOT NULL,
    guarantor_email VARCHAR(100),
    guarantor_phone VARCHAR(20),
    guarantor_id_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 5. CREATE LOAN REPAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS loan_repayments (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    principal_paid NUMERIC(12,2) DEFAULT 0,
    interest_paid NUMERIC(12,2) DEFAULT 0,
    payment_date TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 6. CREATE DIVIDEND DECLARATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS dividend_declarations (
    id SERIAL PRIMARY KEY,
    financial_year INTEGER NOT NULL UNIQUE,
    dividend_rate NUMERIC(5,2) NOT NULL CHECK (dividend_rate > 0 AND dividend_rate <= 20),
    total_eligible_savings NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_dividend_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    declaration_date TIMESTAMP DEFAULT NOW(),
    payment_status VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING','PAID')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 7. CREATE DIVIDEND ALLOCATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS dividend_allocations (
    id SERIAL PRIMARY KEY,
    declaration_id INTEGER NOT NULL REFERENCES dividend_declarations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    savings_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    dividend_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING','PAID')),
    payment_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(declaration_id, user_id)
);

-- =====================================================
-- 8. CREATE LOAN SCHEDULES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS loan_schedules (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    schedule_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 9. CREATE DECLARATION AUDIT TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS declaration_audit (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    declaration_data JSONB NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 10. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_sacco_number ON users(sacco_number);

-- Savings indexes
CREATE INDEX IF NOT EXISTS idx_savings_user_id ON savings(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_saved_at ON savings(saved_at);

-- Loans indexes
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_created_at ON loans(created_at);

-- Guarantors indexes
CREATE INDEX IF NOT EXISTS idx_guarantors_loan_id ON guarantors(loan_id);

-- Loan repayments indexes
CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan_id ON loan_repayments(loan_id);

-- Dividend indexes
CREATE INDEX IF NOT EXISTS idx_dividend_declarations_year ON dividend_declarations(financial_year);
CREATE INDEX IF NOT EXISTS idx_dividend_declarations_status ON dividend_declarations(payment_status);
CREATE INDEX IF NOT EXISTS idx_dividend_allocations_declaration ON dividend_allocations(declaration_id);
CREATE INDEX IF NOT EXISTS idx_dividend_allocations_user ON dividend_allocations(user_id);
CREATE INDEX IF NOT EXISTS idx_dividend_allocations_status ON dividend_allocations(payment_status);

-- Loan schedules indexes
CREATE INDEX IF NOT EXISTS idx_loan_schedules_loan_id ON loan_schedules(loan_id);

-- Declaration audit indexes
CREATE INDEX IF NOT EXISTS idx_declaration_audit_user_id ON declaration_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_declaration_audit_created_at ON declaration_audit(created_at);

-- =====================================================
-- 11. CREATE TRIGGER FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update loan_limit on new savings
CREATE OR REPLACE FUNCTION update_loan_limit_on_savings()
RETURNS TRIGGER AS $$
DECLARE
    total_savings NUMERIC(10,2);
    active_loans NUMERIC(10,2);
    new_limit NUMERIC(10,2);
BEGIN
    SELECT COALESCE(SUM(amount),0) INTO total_savings
    FROM savings
    WHERE user_id = NEW.user_id;

    SELECT COALESCE(SUM(amount),0) INTO active_loans
    FROM loans
    WHERE user_id = NEW.user_id AND status='APPROVED' AND amount > 0;

    new_limit := (total_savings * 3) - active_loans;
    IF new_limit < 0 THEN
        new_limit := 0;
    END IF;

    UPDATE users
    SET loan_limit = new_limit
    WHERE id = NEW.user_id AND role='MEMBER';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to set initial_amount on new loans
CREATE OR REPLACE FUNCTION set_initial_loan_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.initial_amount IS NULL THEN
        NEW.initial_amount := NEW.amount;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12. CREATE TRIGGERS
-- =====================================================

-- Trigger for dividend_declarations updated_at
DROP TRIGGER IF EXISTS update_dividend_declarations_updated_at ON dividend_declarations;
CREATE TRIGGER update_dividend_declarations_updated_at
BEFORE UPDATE ON dividend_declarations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for dividend_allocations updated_at
DROP TRIGGER IF EXISTS update_dividend_allocations_updated_at ON dividend_allocations;
CREATE TRIGGER update_dividend_allocations_updated_at
BEFORE UPDATE ON dividend_allocations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updating loan_limit on savings
DROP TRIGGER IF EXISTS trigger_update_loan_limit ON savings;
CREATE TRIGGER trigger_update_loan_limit
AFTER INSERT ON savings
FOR EACH ROW
EXECUTE FUNCTION update_loan_limit_on_savings();

-- Trigger for setting initial loan amount
DROP TRIGGER IF EXISTS trigger_set_initial_amount ON loans;
CREATE TRIGGER trigger_set_initial_amount
BEFORE INSERT ON loans
FOR EACH ROW
EXECUTE FUNCTION set_initial_loan_amount();

-- =====================================================
-- 13. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE users IS 'Stores SACCO members and administrators';
COMMENT ON TABLE savings IS 'Tracks member savings deposits';
COMMENT ON TABLE loans IS 'Manages loan applications and repayments';
COMMENT ON TABLE guarantors IS 'Stores loan guarantor information';
COMMENT ON TABLE dividend_declarations IS 'Stores dividend declarations for each financial year';
COMMENT ON TABLE dividend_allocations IS 'Stores individual member dividend allocations';
COMMENT ON TABLE loan_schedules IS 'Stores detailed payment schedules for each loan';
COMMENT ON TABLE declaration_audit IS 'Audit trail for member declarations';

COMMENT ON COLUMN users.loan_limit IS 'Maximum loan amount (3x savings)';
COMMENT ON COLUMN users.declaration_accepted IS 'Whether member has accepted SACCO terms';
COMMENT ON COLUMN loans.processing_fee IS 'One-time processing fee (0.5%)';
COMMENT ON COLUMN loans.monthly_payment IS 'Fixed monthly payment amount';
COMMENT ON COLUMN dividend_declarations.dividend_rate IS 'Dividend rate as percentage';
COMMENT ON COLUMN savings.source IS 'Source of savings (Deposit, Dividend, etc.)';

-- =====================================================
-- 14. CREATE DEFAULT ADMIN USER
-- =====================================================

-- Create admin user if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@sacco.com') THEN
        INSERT INTO users (
            full_name,
            id_number,
            email,
            phone,
            password,
            role,
            sacco_number
        ) VALUES (
            'System Admin',
            'ADMIN-001',
            'admin@sacco.com',
            '0700000000',
            crypt('admin123', gen_salt('bf')),
            'ADMIN',
            NULL
        );
        RAISE NOTICE 'Default admin user created successfully';
    ELSE
        RAISE NOTICE 'Admin user already exists';
    END IF;
END $$;

-- =====================================================
-- 15. VERIFICATION & SUMMARY
-- =====================================================

-- Display table counts
SELECT 
    'Database setup complete!' AS status,
    (SELECT COUNT(*) FROM users WHERE role='ADMIN') AS admin_count,
    (SELECT COUNT(*) FROM users WHERE role='MEMBER') AS member_count,
    (SELECT COUNT(*) FROM savings) AS savings_count,
    (SELECT COUNT(*) FROM loans) AS loans_count;

-- List all tables created
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- =====================================================
-- DEPLOYMENT COMPLETE
-- =====================================================

SELECT 'AIC TESTIMONY SACCO - Database Ready for Production!' AS message;