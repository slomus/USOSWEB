CREATE TABLE IF NOT EXISTS users(
   user_id serial PRIMARY KEY,
   name VARCHAR (255) NOT NULL,
   surname VARCHAR (255) NULL,
   password VARCHAR (255) NOT NULL,
   email VARCHAR (255) UNIQUE NULL,
   PESEL VARCHAR (11) UNIQUE NULL CHECK (PESEL ~ '^[0-9]{11}$'),
   phone_nr VARCHAR (255) UNIQUE NULL,
   postal_address VARCHAR (255) NULL,
   registration_address VARCHAR (255) NULL,
   bank_account_nr VARCHAR (26) UNIQUE NULL,
   active BOOLEAN DEFAULT TRUE,
   activation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   deactivation_date TIMESTAMP NULL
);



