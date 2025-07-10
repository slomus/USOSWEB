-- Make name column nullable (allow NULL)
ALTER TABLE users ALTER COLUMN name DROP NOT NULL;

-- Make email column NOT NULL (required)
-- First, update any existing NULL emails to empty string (if any)
UPDATE users SET email = '' WHERE email IS NULL;

-- Then add NOT NULL constraint
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
