TRUNCATE TABLE
    module_subjects,
    course_subjects,
    student_classes,
    course_instructors,
    surveys,
    applications,
    attachments,
    message_recipients,
    messages,
    classes,
    modules,
    courses,
    teaching_staff,
    administrative_staff,
    students,
    subjects,
    buildings,
    faculties,
    users
RESTART IDENTITY CASCADE;

INSERT INTO faculties (name) VALUES
('Wydział Informatyki'),
('Wydział Matematyki'), 
('Wydział Fizyki'),
('Wydział Mechatroniki');

INSERT INTO buildings (name, address) VALUES
('Budynek Główny', 'ul. J.K.Chodkiewicza 30, Bydgoszcz'),
('Instytut Informatyki', 'ul. Kopernika 1, Bydgoszcz'),
('Laboratorium Fizyczne', 'ul. Weyssenhoffa 11, Bydgoszcz'),
('Biblioteka Centralna', 'ul. Karola Szymanowskiego 3, Bydgoszcz'),
('Instytut Mechatroniki', 'ul. Kopernika 1, Bydgoszcz'),
('Centrum Języków Obcych', 'ul. Chodkiewicza 30, Bydgoszcz'),
('Wydzial Matematyki - budynek A', 'ul. Fordońska 123, Bydgoszcz'),
('Centrum Sportowe', 'ul. Sportowa 2, Bydgoszcz');

INSERT INTO application_categories (name, description, application_start_date, application_end_date, active) VALUES
('Stypendium socjalne', 'Wniosek o stypendium socjalne', '2024-09-01 00:00:00', '2026-09-30 23:59:59', true),
('Urlop dziekański', 'Wniosek o urlop dziekański', '2024-09-15 00:00:00', '2026-10-31 23:59:59', true),
('Zapomoga', 'Wniosek o jednorazową zapomogę', '2024-09-15 00:00:00', '2026-10-31 23:59:59', true),
('Stypendium naukowe', 'Wniosek o stypendium za wyniki w nauce', '2024-09-01 00:00:00', '2026-10-15 23:59:59', true),
('Wymiana zagraniczna', 'Wniosek o wyjazd na wymianę studencką', '2024-10-01 00:00:00', '2026-03-31 23:59:59', true)
ON CONFLICT (name) DO NOTHING;
