CREATE TABLE IF NOT EXISTS message_recipients (
    message_id INTEGER REFERENCES messages(message_id) ON DELETE CASCADE,
    recipient_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, recipient_id)
);
