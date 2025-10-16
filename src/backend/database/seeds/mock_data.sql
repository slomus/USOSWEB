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

INSERT INTO users (email, password, name, surname, active)
VALUES ('admin@system.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System', 'Admin', true);

INSERT INTO administrative_staff (role, faculty_id, user_id)
VALUES ('System Administrator', 1, (SELECT user_id FROM users WHERE email = 'admin@system.com'));

INSERT INTO users (name, surname, password, email, PESEL, phone_nr, postal_address, registration_address, bank_account_nr, active, activation_date, email_app_password) VALUES
('Michał', 'Grzonkowski', '$2a$10$hashedpassword3', 'michal.grzonkowski@student.ukw.edu.pl', '92030334567', '+48345678901', 'ul. Młodziezowa 3, Gdańsk', 'ul. Młodzieżowa 3, Gdańsk', '34567890123456789012345678', true, '2024-09-01 12:00:00', ''),
('Jan', 'Kowalski', '$2a$10$hashedpassword1', 'jan.kowalski@student.ukw.edu.pl', '93040445678', '+48123456789', 'ul. Studencka 1, Warszawa', 'ul. Studencka 1, Warszawa', '12345678901234567890123456', true, '2024-09-01 10:00:00', ''),
('Anna', 'Nowak', '$2a$10$hashedpassword2', 'anna.nowak@student.ukw.edu.pl', '94050556789', '+48234567890', 'ul. Akademicka 2, Kraków', 'ul. Akademicka 2, Kraków', '23456789012345678901234567', true, '2024-09-01 11:00:00', ''),
('Emil', 'Kosicki', '$2a$10$hashedpassword4', 'emil.kosicki@student.ukw.edu.pl', '75040445678', '+48456789012', 'ul. Profesorska 10, Warszawa', 'ul. Profesorska 10, Warszawa', '45678901234567890123456789', true, '2024-08-15 09:00:00', ''),
('Weronika', 'Mazurek', '$2a$10$hashedpassword5', 'weronika.mazurek@student.ukw.edu.pl', '70050556789', '+48567890123', 'ul. Naukowa 15, Kraków', 'ul. Naukowa 15, Kraków', '56789012345678901234567890', true, '2024-08-15 10:00:00', ''),
('Kacper', 'Pawlak', '$2a$10$hashedpassword6', 'kacper.pawlak@student.ukw.edu.pl', '68060667890', '+48678901234', 'ul. Uniwersytecka 20, Gdańsk', 'ul. Uniwersytecka 20, Gdańsk', '67890123456789012345678901', true, '2024-08-15 11:00:00', ''),
('Agnieszka', 'Kowalik', '$2a$10$hashedpassword7', 'agnieszka.kowalik@student.ukw.edu.pl', '80070778901', '+48789012345', 'ul. Biurowa 5, Warszawa', 'ul. Biurowa 5, Warszawa', '78901234567890123456789012', true, '2024-08-01 08:00:00', ''),
('Karol', 'Kudłacz', '$2a$10$los4KGgs7C7id1QCy6QtnO7lGyqZVYQGLp9bxhHtlkWHWk80scYvq', 'karol.kudlacz@student.ukw.edu.pl', '82080889012', '+48890123456', 'ul. Administracyjna 7, Kraków', 'ul. Administracyjna 7, Kraków', '89012345678901234567890123', true, '2024-08-01 09:00:00', '');

INSERT INTO faculties (name) VALUES
('Wydział Informatyki'),
('Wydział Matematyki'),
('Wydział Fizyki'),
('Wydział Mechatroniki');

-- ========================================
-- UWAGA: USERS, STUDENTS, TEACHING_STAFF, ADMINISTRATIVE_STAFF
-- są teraz tworzone przez init-users script
-- ========================================

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
-- - grades (potrzebuje album_nr i teaching_staff_id)
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
