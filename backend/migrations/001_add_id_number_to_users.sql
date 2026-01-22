-- Migration: Add id_number to users table

ALTER TABLE users
ADD COLUMN IF NOT EXISTS id_number VARCHAR(50) UNIQUE;

-- Optional: populate existing users
UPDATE users
SET id_number = 'ID' || id
WHERE id_number IS NULL;
