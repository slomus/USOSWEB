DO $$
BEGIN
    IF (SELECT COUNT(*) FROM users) < 8 THEN
        RAISE EXCEPTION 'Użytkownicy nie zostali jeszcze stworzeni! Uruchom najpierw init-users script.';
    END IF;
    RAISE NOTICE 'Znaleziono % użytkowników. Populuję relacje...', (SELECT COUNT(*) FROM users);
END $$;

INSERT INTO messages (sender_id, title, content, send_date) VALUES
(
    (SELECT user_id FROM users WHERE email = 'agnieszka.kowalik@edu.pl'),
    'Rozpoczęcie semestru',
    'Witam wszystkich studentów na pierwszych zajęciach z Programowania 1. Proszę o przygotowanie środowiska programistycznego.',
    '2024-10-01 10:00:00'
), -- message_id = 1
(
    (SELECT user_id FROM users WHERE email = 'weronika.mazurek@edu.pl'),
    'Harmonogram egzaminów',
    'Informuję o terminach egzaminów z Matematyki 1. Szczegóły w załączniku.',
    '2024-10-02 14:30:00'
), -- message_id = 2
(
    (SELECT user_id FROM users WHERE email = 'agnieszka.kowalik@edu.pl'),
    'Zmiana godzin w dziekanacie',
    'Od przyszłego tygodnia dziekanat będzie czynny w godzinach 8:00-15:00.',
    '2024-10-03 09:15:00'
), -- message_id = 3
(
    (SELECT user_id FROM users WHERE email = 'kacper.pawlak@edu.pl'),
    'Laboratorium z Fizyki',
    'Przypominam o obowiązku przynoszenia kalkulatora na zajęcia laboratoryjne.',
    '2024-10-04 11:20:00'
) -- message_id = 4
ON CONFLICT DO NOTHING;

-- === RECIPIENTS WIADOMOŚCI ===
INSERT INTO message_recipients (message_id, recipient_id, read_at) VALUES
-- Wiadomość 1 (programowanie) do studentów
(1, (SELECT user_id FROM users WHERE email = 'michal.grzonkowski@student.edu.pl'), '2024-10-01 12:30:00'), -- Michał przeczytał
(1, (SELECT user_id FROM users WHERE email = 'jan.kowalski@student.edu.pl'), NULL), -- Jan nie przeczytał
(1, (SELECT user_id FROM users WHERE email = 'anna.nowak@student.edu.pl'), '2024-10-01 15:45:00'), -- Anna przeczytała

-- Wiadomość 2 (matematyka) do studentów
(2, (SELECT user_id FROM users WHERE email = 'michal.grzonkowski@student.edu.pl'), '2024-10-02 16:00:00'),
(2, (SELECT user_id FROM users WHERE email = 'jan.kowalski@student.edu.pl'), '2024-10-02 17:30:00'),
(2, (SELECT user_id FROM users WHERE email = 'anna.nowak@student.edu.pl'), NULL),

-- Wiadomość 3 (dziekanat) do wszystkich
(3, (SELECT user_id FROM users WHERE email = 'michal.grzonkowski@student.edu.pl'), NULL),
(3, (SELECT user_id FROM users WHERE email = 'jan.kowalski@student.edu.pl'), NULL),
(3, (SELECT user_id FROM users WHERE email = 'anna.nowak@student.edu.pl'), NULL),
(3, (SELECT user_id FROM users WHERE email = 'emil.kosicki@edu.pl'), '2024-10-03 10:00:00'),
(3, (SELECT user_id FROM users WHERE email = 'weronika.mazurek@edu.pl'), '2024-10-03 10:15:00'),

-- Wiadomość 4 (fizyka) do studentów fizyki
(4, (SELECT user_id FROM users WHERE email = 'michal.grzonkowski@student.edu.pl'), NULL),
(4, (SELECT user_id FROM users WHERE email = 'jan.kowalski@student.edu.pl'), '2024-10-04 12:00:00'),
(4, (SELECT user_id FROM users WHERE email = 'anna.nowak@student.edu.pl'), '2024-10-04 13:30:00')
ON CONFLICT DO NOTHING;

-- === ZAŁĄCZNIKI ===
INSERT INTO attachments (message_id, filename, original_filename, file_size, mime_type, file_path) VALUES
(2, '20241002_harmonogram_egzaminow.pdf', 'Harmonogram egzaminów MAT1.pdf', 245760, 'application/pdf', '/uploads/2024/10/02/20241002_harmonogram_egzaminow.pdf'),
(1, '20241001_srodowisko_prog.zip', 'Instrukcja instalacji środowiska.zip', 1048576, 'application/zip', '/uploads/2024/10/01/20241001_srodowisko_prog.zip'),
(4, '20241004_instrukcja_lab.docx', 'Instrukcja laboratorium fizyka.docx', 524288, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '/uploads/2024/10/04/20241004_instrukcja_lab.docx')
ON CONFLICT DO NOTHING;

-- === PODANIA STUDENTÓW ===
-- Używamy album_nr (które jest SERIAL, więc Michał=1, Jan=2, Anna=3)
INSERT INTO applications (category_id, album_nr, title, content, status) VALUES
(1, 1, 'Wniosek o stypendium socjalne', 'Proszę o przyznanie stypendium socjalnego na semestr zimowy.', 'submitted'), -- Michał
(2, 2, 'Wniosek o urlop dziekański', 'Proszę o udzielenie urlopu dziekańskiego z powodów zdrowotnych.', 'submitted') -- Jan
ON CONFLICT DO NOTHING;

-- === ANKIETY ===
INSERT INTO surveys (class_id, question, mark) VALUES
(1, 'Jak oceniasz przydatność wykładu?', 4),
(1, 'Czy tempo prowadzenia zajęć było odpowiednie?', 5),
(2, 'Jak oceniasz jakość materiałów laboratoryjnych?', 3),
(4, 'Czy wykład był zrozumiały?', 5),
(5, 'Jak oceniasz trudność ćwiczeń?', 4)
ON CONFLICT DO NOTHING;

-- === INSTRUKTORZY KURSÓW ===
-- Używamy teaching_staff_id (Emil=1, Weronika=2, Kacper=3)
INSERT INTO course_instructors (class_id, teaching_staff_id) VALUES
(1, 1), -- Emil prowadzi wykład PROG1
(2, 1), -- Emil prowadzi lab PROG1
(3, 1), -- Emil prowadzi lab ALG1
(4, 3), -- Kacper prowadzi wykład FIZ1
(5, 2), -- Weronika prowadzi ćwiczenia MAT1
(6, 1), -- Emil prowadzi wykład BD1
(7, 1) -- Emil prowadzi lab SYS1
ON CONFLICT DO NOTHING;

-- === STUDENCI NA ZAJĘCIACH ===
-- Używamy album_nr (Michał=1, Jan=2, Anna=3)
INSERT INTO student_classes (class_id, album_nr) VALUES
-- Michał Grzonkowski (album_nr=1) na zajęciach
(1, 1), (2, 1), (3, 1), (4, 1),
-- Jan Kowalski (album_nr=2) na zajęciach
(1, 2), (2, 2), (3, 2), (4, 2), (6, 2),
-- Anna Nowak (album_nr=3) na zajęciach
(1, 3), (5, 3)
ON CONFLICT DO NOTHING;

-- === OCENY ===
-- Używamy: album_nr (Michał=1, Jan=2, Anna=3), teaching_staff_id (Emil=1, Weronika=2, Kacper=3)
-- class_id: 1=PROG1 wykład, 2=PROG1 lab, 3=ALG1 lab, 4=FIZ1 wykład, 5=MAT1 ćwiczenia, 6=BD1 wykład, 7=SYS1 lab

INSERT INTO grades (album_nr, class_id, subject_id, value, weight, attempt, added_by_teaching_staff_id, comment, created_at) VALUES
-- Michał Grzonkowski (album_nr=1) - dobry student
(1, 1, 1, '4.5', 1, 1, 1, 'Bardzo dobra znajomość podstaw programowania', '2024-12-15 10:30:00'),
(1, 2, 1, '4.0', 1, 1, 1, 'Poprawnie wykonane zadania laboratoryjne', '2024-12-10 14:45:00'),
(1, 3, 4, '4.5', 1, 1, 1, 'Świetne zrozumienie algorytmów', '2024-12-12 11:20:00'),
(1, 4, 5, '3.5', 1, 1, 3, 'Zaliczone, ale wymaga więcej pracy z teorią', '2024-12-08 16:00:00'),

-- Jan Kowalski (album_nr=2) - student przeciętny
(2, 1, 1, '3.0', 1, 1, 1, 'Podstawowa znajomość, potrzebuje więcej praktyki', '2024-12-15 10:35:00'),
(2, 2, 1, '3.5', 1, 1, 1, 'Zadania wykonane poprawnie, ale bez inwencji', '2024-12-10 14:50:00'),
(2, 3, 4, '3.0', 1, 1, 1, 'Minimum programowe zaliczone', '2024-12-12 11:25:00'),
(2, 4, 5, '4.0', 1, 1, 3, 'Dobra znajomość fizyki teoretycznej', '2024-12-08 16:05:00'),
(2, 6, 3, '3.5', 1, 1, 1, 'Poprawnie zaprojektowana baza danych', '2024-12-14 13:15:00'),

-- Anna Nowak (album_nr=3) - bardzo dobra studentka matematyki
(3, 1, 1, '5.0', 1, 1, 1, 'Wybitna znajomość programowania, kreatywne rozwiązania', '2024-12-15 10:40:00'),
(3, 5, 2, '5.0', 1, 1, 2, 'Perfekcyjna znajomość analizy matematycznej', '2024-12-09 12:30:00'),

-- Dodatkowe oceny z różnych terminów (drugie podejścia, kolokwia)
(1, 1, 1, '4.0', 2, 1, 1, 'Kolokwium - dobry wynik', '2024-11-20 09:15:00'),
(2, 1, 1, '2.0', 2, 1, 1, 'Pierwsze kolokwium - nieudane', '2024-11-20 09:20:00'),
(2, 1, 1, '3.5', 2, 2, 1, 'Poprawa kolokwium - znacznie lepiej', '2024-12-05 09:15:00'),
(3, 5, 2, '4.5', 2, 1, 2, 'Kolokwium z analizy - bardzo dobrze', '2024-11-15 10:00:00'),

-- Oceny zaliczeniowe
(1, 2, 1, 'ZAL', 1, 1, 1, 'Zaliczenie laboratorium - wszystkie zadania wykonane', '2024-12-20 15:00:00'),
(2, 2, 1, 'ZAL', 1, 1, 1, 'Zaliczenie laboratorium', '2024-12-20 15:05:00'),
(3, 1, 1, 'ZAL', 1, 1, 1, 'Zaliczenie przedmiotu przed egzaminem', '2024-12-20 15:10:00'),

-- Jedna ocena niezaliczająca
(2, 3, 4, 'NZAL', 1, 1, 1, 'Nie zaliczono - brak oddanych zadań', '2024-11-30 16:00:00'),
(2, 3, 4, '3.0', 1, 2, 1, 'Poprawa - zadania uzupełnione', '2024-12-18 16:00:00')
ON CONFLICT (album_nr, class_id, attempt) DO NOTHING;

-- === PODSUMOWANIE ===
SELECT 'PODSUMOWANIE DANYCH PO INICJALIZACJI:' as info;

SELECT
    'users' as tabela,
    COUNT(*) as liczba_rekordow,
    'Użytkownicy: studenci, wykładowcy, administracja' as opis
FROM users
UNION ALL
SELECT 'students', COUNT(*), 'Studenci zapisani w systemie' FROM students
UNION ALL
SELECT 'teaching_staff', COUNT(*), 'Kadra nauczycielska' FROM teaching_staff
UNION ALL
SELECT 'administrative_staff', COUNT(*), 'Kadra administracyjna' FROM administrative_staff
UNION ALL
SELECT 'messages', COUNT(*), 'Wiadomości w systemie' FROM messages
UNION ALL
SELECT 'classes', COUNT(*), 'Zajęcia/grupy' FROM classes
UNION ALL
SELECT 'attachments', COUNT(*), 'Załączniki do wiadomości' FROM attachments
UNION ALL
SELECT 'applications', COUNT(*), 'Podania studentów' FROM applications
UNION ALL
SELECT 'surveys', COUNT(*), 'Ankiety ocen' FROM surveys
UNION ALL
SELECT 'course_instructors', COUNT(*), 'Przypisania nauczycieli do zajęć' FROM course_instructors
UNION ALL
SELECT 'student_classes', COUNT(*), 'Zapisy studentów na zajęcia' FROM student_classes
UNION ALL
SELECT 'grades', COUNT(*), 'Oceny studentów' FROM grades;

SELECT 'Wszystkie dane zostały pomyślnie załadowane!' as success_message;
