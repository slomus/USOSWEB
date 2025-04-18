CREATE TABLE IF NOT EXISTS student_classes(
  class_id INTEGER NOT NULL REFERENCES classes(class_id),
  album_nr INTEGER NOT NULL REFERENCES students(album_nr),
  PRIMARY KEY(class_id, album_nr)
);
