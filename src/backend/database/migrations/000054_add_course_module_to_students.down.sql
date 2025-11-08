DROP INDEX IF EXISTS idx_students_module_id;
DROP INDEX IF EXISTS idx_students_course_id;

ALTER TABLE students DROP COLUMN IF EXISTS module_id;
ALTER TABLE students DROP COLUMN IF EXISTS course_id;
