CREATE TABLE IF NOT EXISTS messages(
  message_id serial PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  recipients JSON NOT NULL, --TODO: przemyśleć jak chcemy trzymać listę odbiorców
  title VARCHAR(255) NOT NULL,
  content TEXT,
  attachment JSON, --TODO: tak samo przemyśleć typ
  send_date TIMESTAMP 
 
);

