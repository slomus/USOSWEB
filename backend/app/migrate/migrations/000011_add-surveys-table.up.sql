CREATE TABLE IF NOT EXISTS surveys(
  survey_id serial PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(class_id),
  question TEXT NOT NULL,
  mark INTEGER
);

