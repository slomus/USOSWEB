CREATE TABLE IF NOT EXISTS academic_calendar (
  calendar_id serial PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL, -- 'holiday', 'exam_session', 'semester_start', 'semester_end', 'registration', 'break'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  academic_year VARCHAR(20) NOT NULL, -- '2024/2025'
  applies_to VARCHAR(50), -- 'all', 'winter', 'summer', 'year_1', 'year_2',
  is_recurring BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_academic_calendar_dates ON academic_calendar(start_date, end_date);
CREATE INDEX idx_academic_calendar_year ON academic_calendar(academic_year);
CREATE INDEX idx_academic_calendar_type ON academic_calendar(event_type);
