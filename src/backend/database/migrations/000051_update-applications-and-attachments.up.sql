-- Update applications structure: add title, content, status, category_id, timestamps
-- Ensure table exists (from 000006) then alter

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'applications'
    ) THEN
        CREATE TABLE applications(
          application_id serial PRIMARY KEY,
          category VARCHAR(255) NOT NULL,
          registration_round_start TIMESTAMP NOT NULL,
          registration_round_end TIMESTAMP NOT NULL,
          application_link TEXT,
          album_nr INTEGER NOT NULL REFERENCES students(album_nr)
        );
    END IF;
END $$;

-- New columns
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS title VARCHAR(255) NOT NULL DEFAULT 'Wniosek',
  ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS category_id INTEGER NULL REFERENCES application_categories(category_id),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Backfill content if empty
UPDATE applications SET content = COALESCE(content, '') WHERE content IS NULL;

-- Optional: link existing category name to category_id if names match
UPDATE applications a
SET category_id = ac.category_id
FROM application_categories ac
WHERE a.category_id IS NULL AND a.category = ac.name;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_applications_album_nr ON applications(album_nr);
CREATE INDEX IF NOT EXISTS idx_applications_category_id ON applications(category_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- Link attachments with applications
ALTER TABLE attachments
  ADD COLUMN IF NOT EXISTS application_id INTEGER NULL REFERENCES applications(application_id);

CREATE INDEX IF NOT EXISTS idx_attachments_application_id ON attachments(application_id);

