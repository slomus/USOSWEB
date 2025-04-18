CREATE TABLE IF NOT EXISTS classes(
  class_id serial PRIMARY KEY,
  class_type VARCHAR(255) NOT NULL, --wyklad/lab/cw
  credit VARCHAR(255) NOT NULL, --zaliczenie na ocene/kolokwium...
  span_of_hours INTEGER NOT NULL,
  group_nr INTEGER NOT NULL,
  current_capacity INTEGER NOT NULL,
  capacity INTEGER NOT NULL,
  classroom INTEGER NOT NULL,
  building_id INTEGER NOT NULL REFERENCES buildings(building_id),
  subject_id INTEGER NOT NULL REFERENCES subjects(subject_id)
);

