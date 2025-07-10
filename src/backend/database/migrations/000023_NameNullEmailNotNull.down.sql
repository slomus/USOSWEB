-- Revert email column to allow NULL
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Revert name column to NOT NULL
-- First, update any NULL names to empty string
UPDATE users SET name = '' WHERE name IS NULL;

-- Then add NOT NULL constraint back to name
ALTER TABLE users ALTER COLUMN name SET NOT NULL;
