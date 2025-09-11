CREATE TABLE IF NOT EXISTS application_categories(
  category_id serial PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NULL,
  application_start_date TIMESTAMP NOT NULL,
  application_end_date TIMESTAMP NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true
);


