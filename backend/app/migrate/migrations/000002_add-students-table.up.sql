CREATE TABLE IF NOT EXISTS students (
  album_nr serial PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id)
);
