-- Add email_app_password column to users for per-user mail auth (e.g., Gmail App Password)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_app_password VARCHAR(255);

-- Optional: create an index if you will query on it (unlikely). Skipped.

