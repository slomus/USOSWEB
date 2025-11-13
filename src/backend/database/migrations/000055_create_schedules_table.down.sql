DROP FUNCTION IF EXISTS get_semester_week(DATE, DATE);

DROP INDEX IF EXISTS idx_schedules_valid_period;
DROP INDEX IF EXISTS idx_schedules_day_time;
DROP INDEX IF EXISTS idx_schedules_class_id;

DROP TABLE IF EXISTS schedules;
