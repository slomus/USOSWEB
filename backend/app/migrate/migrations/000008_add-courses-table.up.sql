CREATE TABLE IF NOT EXISTS courses(
  course_id serial PRIMARY KEY,
  alias VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  year INTEGER NOT NULL,
  semester INTEGER NOT NULL,
  course_mode VARCHAR(255) NOT NULL, --stacjonarne/niestacjonarne
  degree_type VARCHAR(255) NOT NULL, --inzyneirskie, licencjacjkie
  degree VARCHAR(255) NOT NULL, --stopień 1/2
  faculty_id INTEGER NOT NULL REFERENCES faculties(faculty_id)
);
