CREATE TABLE IF NOT EXISTS users(
   user_id serial PRIMARY KEY,
   name VARCHAR (255) NOT NULL,
   surname VARCHAR (255) NOT NULL,
   password VARCHAR (50) NOT NULL,
   email VARCHAR (255) UNIQUE NOT NULL,
   PESEL VARCHAR (11) UNIQUE NOT NULL CHECK (PESEL ~ '^[0-9]{11}$'),
   phone_nr VARCHAR (255) UNIQUE NOT NULL,
   postal_address VARCHAR (255) NOT NULL,
   registration_address VARCHAR (255) NOT NULL,
   bank_account_nr VARCHAR (26) UNIQUE,
   active BOOLEAN,
   activation_date TIMESTAMP NOT NULL,
   deactivation_date TIMESTAMP 
);
