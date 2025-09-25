-- Drop email_app_password column
ALTER TABLE users
DROP COLUMN IF EXISTS email_app_password;

