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

-- ========================================
-- UWAGA: USERS, STUDENTS, TEACHING_STAFF, ADMINISTRATIVE_STAFF
-- są teraz tworzone przez init-users script
-- ========================================

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
('Instytut Mechatroniki', 'ul. Kopernika 1, Bydgoszcz');

INSERT INTO subjects (alias, name, ECTS, description, syllabus) VALUES
('PROG1', 'Programowanie', 6.0, 'Podstawy programowania w języku C', 'Zmienne, funkcje, struktury danych, algorytmy'),
('MAT1', 'Matematyka', 5.0, 'Analiza matematyczna dla informatyków', 'Granice, pochodne, całki, szeregi'),
('BD1', 'Bazy Danych', 4.0, 'Projektowanie i implementacja baz danych', 'SQL, normalizacja, transakcje'),
('ALG1', 'Algorytmy i Struktury Danych', 6.0, 'Podstawowe algorytmy i struktury danych', 'Sortowanie, drzewa, grafy, złozoność'),
('FIZ1', 'Fizyka', 5.0, 'Mechanika klasyczna', 'Kinematyka, dynamika, termodynamika'),
('SYS1', 'Systemy Wbudowane', 5.0, 'Programowanie płytek','Wykorzystanie języka C do programowania płytek Arduino');

INSERT INTO courses (alias, name, year, semester, course_mode, degree_type, degree, faculty_id) VALUES
('INF-S-I', 'Informatyka', 1, 1, 'stacjonarne', 'inzynierskie', '1', 1),
('INF-NS-M', 'Informatyka', 5, 8, 'niestacjonarne', 'magisterskie', '2', 1),
('MAT-S-L', 'Matematyka', 1, 1, 'stacjonarne', 'licencjackie', '1', 2),
('FIZ-S-I', 'Fizyka', 2, 5, 'stacjonarne', 'inzynierskie', '1', 3),
('MECH-NS-I', 'Mechatronika', 3, 6, 'niestacjonarne', 'inzynierskie', '1', 4);

INSERT INTO modules (alias, name, course_id) VALUES
('INF-ERP', 'ERP - systemy typu CRM', 2),
('INF-PROG', 'Programowanie', 2),
('MAT-ANALIZA', 'Analiza Matematyczna', 3),
('FIZ-MECHANIKA', 'Mechanika', 4),
('MECH-3D', 'Technologie 3D', 5);

INSERT INTO classes (class_type, credit, span_of_hours, group_nr, current_capacity, capacity, classroom, building_id, subject_id) VALUES
('wykład', 'egzamin', 30, 1, 45, 50, 101, 1, 1), -- class_id = 1, PROG1 wykład
('laboratorium', 'zaliczenie na ocenę', 15, 1, 12, 15, 201, 2, 1), -- class_id = 2, PROG1 lab grupa 1
('laboratorium', 'zaliczenie na ocenę', 15, 2, 10, 15, 201, 2, 4), -- class_id = 3, ALG1 lab grupa 2
('wykład', 'egzamin', 45, 1, 60, 80, 102, 1, 5), -- class_id = 4, FIZ1 wykład
('ćwiczenia', 'kolokwium', 30, 1, 20, 25, 301, 3, 2), -- class_id = 5, MAT1 ćwiczenia
('wykład', 'egzamin', 30, 1, 35, 40, 103, 1, 3), -- class_id = 6, BD1 wykład
('laboratorium', 'projekt', 15, 1, 15, 20, 202, 2, 6); -- class_id = 7, SYS1 lab

INSERT INTO calendar_events (event_type, title, description, start_date, end_date, academic_year, target_audience, is_holiday) VALUES
-- Semestry
('semester', 'Semestr zimowy 2024/2025', 'Zajęcia dydaktyczne semestru zimowego', '2024-10-01', '2025-01-26', '2024/2025', 'all', FALSE),
('semester', 'Semestr letni 2024/2025', 'Zajęcia dydaktyczne semestru letniego', '2025-02-17', '2025-06-14', '2024/2025', 'all', FALSE),

-- Sesje egzaminacyjne
('exam_session', 'Sesja zimowa', 'Sesja egzaminacyjna semestru zimowego', '2025-01-27', '2025-02-14', '2024/2025', 'all', FALSE),
('exam_session', 'Sesja letnia', 'Sesja egzaminacyjna semestru letniego', '2025-06-16', '2025-07-11', '2024/2025', 'all', FALSE),
('exam_session', 'Sesja poprawkowa', 'Sesja poprawkowa dla obu semestrów', '2025-09-01', '2025-09-15', '2024/2025', 'all', FALSE),

-- Święta państwowe
('holiday', 'Nowy Rok', 'Święto Nowego Roku', '2025-01-01', NULL, '2024/2025', 'all', TRUE),
('holiday', 'Święto Trzech Króli', 'Objawienie Pańskie', '2025-01-06', NULL, '2024/2025', 'all', TRUE),
('holiday', 'Wielkanoc', 'Niedziela Wielkanocna', '2025-04-20', NULL, '2024/2025', 'all', TRUE),
('holiday', 'Poniedziałek Wielkanocny', 'Lany Poniedziałek', '2025-04-21', NULL, '2024/2025', 'all', TRUE),
('holiday', 'Boże Ciało', 'Boże Ciało 2025', '2025-06-19', NULL, '2024/2025', 'all', FALSE),

-- Święta majowe
('holiday', 'Święto Pracy', 'Święto Państwowe', '2025-05-01', NULL, '2024/2025', 'all', TRUE),
('holiday', 'Święto Konstytucji 3 Maja', 'Święto Narodowe', '2025-05-03', NULL, '2024/2025', 'all', TRUE),

-- Przerwy świąteczne
('break', 'Ferie zimowe', 'Przerwa zimowa w zajęciach', '2025-01-27', '2025-01-31', '2024/2025', 'all', FALSE),
('break', 'Przerwa wielkanocna', 'Przerwa świąteczna', '2025-04-17', '2025-04-22', '2024/2025', 'all', FALSE),

-- Zapisy
('registration', 'Zapisy na semestr zimowy', 'Okres zapisów na zajęcia', '2024-09-15', '2024-09-30', '2024/2025', 'all', TRUE),
('registration', 'Zapisy na semestr letni', 'Okres zapisów na zajęcia', '2025-02-01', '2025-02-15', '2024/2025', 'all', TRUE),

-- Ważne daty administracyjne
('deadline', 'Koniec roku akademickiego', 'Zakończenie roku akademickiego 2024/2025', '2025-09-30', NULL, '2024/2025', 'all', FALSE),
('event', 'Dzień Otwarty', 'Dni otwarte uczelni', '2025-03-15', NULL, '2024/2025', 'all', FALSE);

INSERT INTO application_categories (name, description, application_start_date, application_end_date, active) VALUES
('Stypendium socjalne', 'Wniosek o stypendium socjalne' , '2024-09-01 00:00:00', '2026-09-30 23:59:59', true),
('Urlop dziekański', 'Wniosek o urlop dziekański', '2024-09-15 00:00:00', '2026-10-31 23:59:59', true),
('Zapomoga', 'Wniosek o jednorazową zapomogę', '2024-09-15 00:00:00', '2026-10-31 23:59:59', true)
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- KOMENTARZ: Te tabele będą populowane przez drugi skrypt (init_relations.sql)
-- który uruchomi się PO stworzeniu użytkowników przez init-users:
-- - messages (potrzebuje sender_id)
-- - message_recipients (potrzebuje message_id, recipient_id)
-- - attachments (potrzebuje message_id)
-- - applications (potrzebuje album_nr)
-- - surveys (potrzebuje class_id)
-- - course_instructors (potrzebuje teaching_staff_id)
-- - student_classes (potrzebuje album_nr)
-- - course_subjects i module_subjects można już teraz
-- ========================================

INSERT INTO course_subjects (course_id, subject_id) VALUES
(1, 1), -- INF-S-I zawiera PROG1
(1, 2), -- INF-S-I zawiera MAT1
(2, 3), -- INF-NS-M zawiera BD1
(2, 4), -- INF-NS-M zawiera ALG1
(3, 2), -- MAT-S-L zawiera MAT1
(4, 5), -- FIZ-S-I zawiera FIZ1
(5, 6); -- MECH-NS-I zawiera SYS1

INSERT INTO module_subjects (module_id, subject_id) VALUES
(1, 1), -- INF-ERP zawiera PROG1
(2, 1), -- INF-PROG zawiera PROG1
(2, 4), -- INF-PROG zawiera ALG1
(3, 2), -- MAT-ANALIZA zawiera MAT1
(4, 5), -- FIZ-MECHANIKA zawiera FIZ1
(5, 6); -- MECH-3D zawiera SYS1

SELECT 'Mock dane podstawowe zostały załadowane!' as info;
SELECT 'UWAGA: Użytkownicy będą utworzeni przez init-users script' as info;
