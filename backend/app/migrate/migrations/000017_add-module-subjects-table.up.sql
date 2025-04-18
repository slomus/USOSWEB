CREATE TABLE IF NOT EXISTS module_subjects(
  module_id INTEGER NOT NULL REFERENCES modules(module_id),
  subject_id INTEGER NOT NULL REFERENCES subjects(subject_id),
  PRIMARY KEY(module_id, subject_id)
);
