ALTER TABLE exams 
  DROP CONSTRAINT IF EXISTS exams_exam_type_check;

ALTER TABLE exams
  ADD CONSTRAINT exams_exam_type_check 
  CHECK (exam_type IN ('final', 'retake', 'commission', 'midterm', 'quiz', 'project', 'test'));

