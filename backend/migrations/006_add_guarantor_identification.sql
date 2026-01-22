BEGIN;

ALTER TABLE guarantors
ADD COLUMN IF NOT EXISTS guarantor_id_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS guarantor_phone VARCHAR(20);

UPDATE guarantors
SET
  guarantor_id_number = COALESCE(guarantor_id_number, 'PENDING'),
  guarantor_phone = COALESCE(guarantor_phone, 'PENDING');

COMMIT;
