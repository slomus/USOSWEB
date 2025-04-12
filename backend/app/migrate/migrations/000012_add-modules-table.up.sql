CREATE TABLE IF NOT EXISTS modules(
  module_id serial PRIMARY KEY,
  alias VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) UNIQUE NOT NULL,
  course_id INTEGER NOT NULL REFERENCES courses(course_id)
);
