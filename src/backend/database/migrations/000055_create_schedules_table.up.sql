CREATE TABLE schedules (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Poniedziałek, 7=Niedziela
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(50),
  building VARCHAR(100),
  
  frequency VARCHAR(20) DEFAULT 'weekly' CHECK (frequency IN ('weekly', 'biweekly_odd', 'biweekly_even')),
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_schedules_class_id ON schedules(class_id);
CREATE INDEX idx_schedules_day_time ON schedules(day_of_week, start_time);
CREATE INDEX idx_schedules_valid_period ON schedules(valid_from, valid_to);

CREATE OR REPLACE FUNCTION get_semester_week(check_date DATE, semester_start DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN FLOOR((check_date - semester_start) / 7) + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

