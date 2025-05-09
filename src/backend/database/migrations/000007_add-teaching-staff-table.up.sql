CREATE TABLE IF NOT EXISTS teaching_staff(
  teaching_staff_id serial PRIMARY KEY,
  degree VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  faculty_id INTEGER NOT NULL REFERENCES faculties(faculty_id),
  user_id INTEGER NOT NULL REFERENCES users(user_id)
);

