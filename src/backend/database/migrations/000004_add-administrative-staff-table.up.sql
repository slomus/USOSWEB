CREATE TABLE IF NOT EXISTS administrative_staff(
  administrative_staff_id serial PRIMARY KEY,
  role VARCHAR(255) NOT NULL,
  faculty_id INTEGER NOT NULL REFERENCES faculties(faculty_id),
  user_id INTEGER NOT NULL REFERENCES users(user_id)
);
