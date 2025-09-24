-- Remove status constraint
ALTER TABLE applications
  DROP CONSTRAINT IF EXISTS applications_status_chk;

-- Recreate legacy columns (without data backfill)
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS category VARCHAR(255),
  ADD COLUMN IF NOT EXISTS registration_round_start TIMESTAMP,
  ADD COLUMN IF NOT EXISTS registration_round_end TIMESTAMP,
  ADD COLUMN IF NOT EXISTS application_link TEXT;

-- Allow NULL category_id since legacy columns are back
ALTER TABLE applications
  ALTER COLUMN category_id DROP NOT NULL;

