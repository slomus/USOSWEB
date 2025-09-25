-- Map old category -> category_id if needed
UPDATE applications a
SET category_id = ac.category_id
FROM application_categories ac
WHERE a.category_id IS NULL AND a.category = ac.name;

-- Enforce NOT NULL on category_id after mapping
ALTER TABLE applications
  ALTER COLUMN category_id SET NOT NULL;

-- Drop legacy columns no longer needed
ALTER TABLE applications
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS registration_round_start,
  DROP COLUMN IF EXISTS registration_round_end,
  DROP COLUMN IF EXISTS application_link;

-- Optional: status constraint for allowed values
ALTER TABLE applications
  ADD CONSTRAINT applications_status_chk
  CHECK (status IN ('submitted','under_review','approved','rejected'));