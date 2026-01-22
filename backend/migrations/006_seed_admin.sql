-- Create admin user ONLY if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM users WHERE email = 'admin@sacco.com'
    ) THEN
        INSERT INTO users (
            full_name,
            id_number,
            email,
            phone,
            password,
            role
        ) VALUES (
            'System Admin',
            'ADMIN-001',
            'admin@sacco.com',
            '0700000000',
            crypt('admin123', gen_salt('bf')),
            'ADMIN'
        );
    END IF;
END
$$;
