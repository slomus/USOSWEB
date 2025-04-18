CREATE TABLE IF NOT EXISTS course_instructors(
  class_id INTEGER NOT NULL REFERENCES classes(class_id),
  teaching_staff_id INTEGER NOT NULL REFERENCES teaching_staff(teaching_staff_id),
  PRIMARY KEY(class_id, teaching_staff_id)
);
