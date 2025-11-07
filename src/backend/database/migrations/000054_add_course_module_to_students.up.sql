ALTER TABLE students ADD COLUMN course_id INT REFERENCES courses(course_id);
ALTER TABLE students ADD COLUMN module_id INT REFERENCES modules(module_id);

CREATE INDEX idx_students_course_id ON students(course_id);
CREATE INDEX idx_students_module_id ON students(module_id);
