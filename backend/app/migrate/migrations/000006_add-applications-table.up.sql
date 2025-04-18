CREATE TABLE IF NOT EXISTS applications(
  application_id serial PRIMARY KEY,
  category VARCHAR(255) NOT NULL,
  registration_round_start TIMESTAMP NOT NULL,
  registration_round_end TIMESTAMP NOT NULL,
  application_link PATH, 
  album_nr INTEGER NOT NULL REFERENCES students(album_nr)
);
