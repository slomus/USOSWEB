-- Placeholder down migration for version 49 to satisfy migration tool
-- If grades table/type exist, this will drop them on DOWN
DROP TABLE IF EXISTS grades;
DROP TYPE IF EXISTS grade_value;

