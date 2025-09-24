CREATE TYPE grade_value AS ENUM (
  '2.0', '3.0', '3.5', '4.0', '4.5', '5.0',
  'NZAL', 'ZAL'
);

CREATE TABLE IF NOT EXISTS grades(
  grade_id serial PRIMARY KEY,
  album_nr INTEGER NOT NULL REFERENCES students(album_nr),
  class_id INTEGER NOT NULL REFERENCES classes(class_id),
  subject_id INTEGER NOT NULL REFERENCES subjects(subject_id),
  value grade_value NOT NULL,
  weight INTEGER NOT NULL DEFAULT 1,
  attempt INTEGER NOT NULL DEFAULT 1,
  added_by_teaching_staff_id INTEGER NOT NULL REFERENCES teaching_staff(teaching_staff_id),
  comment TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(album_nr, class_id, attempt)
);

CREATE INDEX IF NOT EXISTS idx_grades_album_nr ON grades(album_nr);
CREATE INDEX IF NOT EXISTS idx_grades_class_id ON grades(class_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject_id ON grades(subject_id);

