CREATE INDEX IF NOT EXISTS idx_message_recipients_recipient ON message_recipients(recipient_id);
CREATE INDEX IF NOT EXISTS idx_message_recipients_message ON message_recipients(message_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_send_date ON messages(send_date);
