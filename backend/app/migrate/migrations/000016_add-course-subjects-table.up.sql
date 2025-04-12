CREATE TABLE IF NOT EXISTS course_subjects(
  course_id INTEGER NOT NULL REFERENCES courses(course_id),
  subject_id INTEGER NOT NULL REFERENCES subjects(subject_id),
  PRIMARY KEY(course_id, subject_id)
);
