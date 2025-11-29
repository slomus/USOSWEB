CREATE TABLE exams (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
  exam_date TIMESTAMP NOT NULL,
  location VARCHAR(100),
  duration_minutes INTEGER DEFAULT 90,
  description TEXT,
  exam_type VARCHAR(50) DEFAULT 'final' CHECK (exam_type IN ('final', 'retake', 'commission', 'midterm', 'quiz', 'project', 'test')),
  max_students INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_exams_class_id ON exams(class_id);
CREATE INDEX idx_exams_date ON exams(exam_date);
CREATE INDEX idx_exams_type ON exams(exam_type);
