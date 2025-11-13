CREATE TABLE class_cancellations (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  cancelled_date DATE NOT NULL,
  reason VARCHAR(255),
  cancelled_by INTEGER REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(schedule_id, cancelled_date)
);

CREATE INDEX idx_cancellations_schedule_id ON class_cancellations(schedule_id);
CREATE INDEX idx_cancellations_date ON class_cancellations(cancelled_date);
CREATE INDEX idx_cancellations_cancelled_by ON class_cancellations(cancelled_by);

