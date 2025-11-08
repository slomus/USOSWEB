-- ========================================
-- Ten skrypt dodaje realistyczne dane dla 9 użytkowników utworzonych przez init_users.go:
-- - Studentów: Michał Grzonkowski, Jan Kowalski, Anna Nowak
-- - Nauczycieli: Emil Kosicki, Weronika Mazurek, Kacper Pawlak
-- - Administrację: Agnieszka Kowalik
--
-- Wypełnia: enrollments, classes, student_classes, schedules, exams, grades
-- ========================================

DO $$
DECLARE
    v_michal_user_id INT;
    v_jan_user_id INT;
    v_anna_user_id INT;
    v_michal_album_nr INT;
    v_jan_album_nr INT;
    v_anna_album_nr INT;
    v_emil_staff_id INT;
    v_weronika_staff_id INT;
    v_kacper_staff_id INT;
    v_current_semester TEXT;
    v_current_year INT;
BEGIN
    -- Pobierz user_id dla studentów
    SELECT user_id INTO v_michal_user_id FROM users WHERE email = 'michal.grzonkowski@student.edu.pl';
    SELECT user_id INTO v_jan_user_id FROM users WHERE email = 'jan.kowalski@student.edu.pl';
    SELECT user_id INTO v_anna_user_id FROM users WHERE email = 'anna.nowak@student.edu.pl';
    
    -- Pobierz album_nr dla studentów
    SELECT album_nr INTO v_michal_album_nr FROM students WHERE user_id = v_michal_user_id;
    SELECT album_nr INTO v_jan_album_nr FROM students WHERE user_id = v_jan_user_id;
    SELECT album_nr INTO v_anna_album_nr FROM students WHERE user_id = v_anna_user_id;
    
    -- Pobierz teaching_staff_id
    SELECT teaching_staff_id INTO v_emil_staff_id FROM teaching_staff WHERE user_id = (SELECT user_id FROM users WHERE email = 'emil.kosicki@edu.pl');
    SELECT teaching_staff_id INTO v_weronika_staff_id FROM teaching_staff WHERE user_id = (SELECT user_id FROM users WHERE email = 'weronika.mazurek@edu.pl');
    SELECT teaching_staff_id INTO v_kacper_staff_id FROM teaching_staff WHERE user_id = (SELECT user_id FROM users WHERE email = 'kacper.pawlak@edu.pl');
    
    -- Określ aktualny semestr
    v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    v_current_semester := CASE 
        WHEN EXTRACT(MONTH FROM CURRENT_DATE) BETWEEN 10 AND 2 THEN 'zimowy'
        ELSE 'letni'
    END;
    
    RAISE NOTICE '=== Uzupełnianie danych dla użytkowników init_users.go ===';
    RAISE NOTICE 'Michał (user_id: %, album_nr: %)', v_michal_user_id, v_michal_album_nr;
    RAISE NOTICE 'Jan (user_id: %, album_nr: %)', v_jan_user_id, v_jan_album_nr;
    RAISE NOTICE 'Anna (user_id: %, album_nr: %)', v_anna_user_id, v_anna_album_nr;
    RAISE NOTICE 'Emil (staff_id: %)', v_emil_staff_id;
    RAISE NOTICE 'Weronika (staff_id: %)', v_weronika_staff_id;
    RAISE NOTICE 'Kacper (staff_id: %)', v_kacper_staff_id;
    RAISE NOTICE 'Aktualny semestr: % %', v_current_semester, v_current_year;
    
    -- ========================================
    -- 1. DODAJ ENROLLMENTS DLA STUDENTÓW
    -- ========================================
    RAISE NOTICE 'Dodawanie enrollments dla studentów...';
    
    -- Michał Grzonkowski - Informatyka, rok 3
    INSERT INTO enrollments (
        album_nr, subject_id, semester, academic_year, 
        enrollment_date, status, final_grade
    ) VALUES
    -- Semestr zimowy 2024/2025 (aktualny)
    (v_michal_album_nr, 1, 'zimowy', '2024/2025', '2024-09-20 10:00:00', 'enrolled', NULL), -- Programowanie 1
    (v_michal_album_nr, 4, 'zimowy', '2024/2025', '2024-09-20 10:05:00', 'enrolled', NULL), -- Algorytmy 1
    (v_michal_album_nr, 5, 'zimowy', '2024/2025', '2024-09-20 10:10:00', 'enrolled', NULL), -- Systemy operacyjne
    (v_michal_album_nr, 3, 'zimowy', '2024/2025', '2024-09-20 10:15:00', 'enrolled', NULL), -- Bazy danych
    (v_michal_album_nr, 6, 'zimowy', '2024/2025', '2024-09-20 10:20:00', 'enrolled', NULL), -- Sieci komputerowe
    -- Semestr letni 2023/2024 (zaliczony)
    (v_michal_album_nr, 2, 'letni', '2023/2024', '2024-02-15 09:00:00', 'completed', '4.5'), -- Matematyka 1
    (v_michal_album_nr, 7, 'letni', '2023/2024', '2024-02-15 09:05:00', 'completed', '4.0')  -- Fizyka 1
    ON CONFLICT (album_nr, subject_id, semester, academic_year) DO NOTHING;
    
    -- Jan Kowalski - Informatyka, rok 2
    INSERT INTO enrollments (
        album_nr, subject_id, semester, academic_year, 
        enrollment_date, status, final_grade
    ) VALUES
    -- Semestr zimowy 2024/2025 (aktualny)
    (v_jan_album_nr, 1, 'zimowy', '2024/2025', '2024-09-20 11:00:00', 'enrolled', NULL), -- Programowanie 1
    (v_jan_album_nr, 4, 'zimowy', '2024/2025', '2024-09-20 11:05:00', 'enrolled', NULL), -- Algorytmy 1
    (v_jan_album_nr, 3, 'zimowy', '2024/2025', '2024-09-20 11:10:00', 'enrolled', NULL), -- Bazy danych
    (v_jan_album_nr, 2, 'zimowy', '2024/2025', '2024-09-20 11:15:00', 'enrolled', NULL), -- Matematyka 1
    -- Semestr letni 2023/2024 (zaliczony)
    (v_jan_album_nr, 5, 'letni', '2023/2024', '2024-02-15 10:00:00', 'completed', '3.5'), -- Systemy operacyjne
    (v_jan_album_nr, 7, 'letni', '2023/2024', '2024-02-15 10:05:00', 'completed', '3.0')  -- Fizyka 1
    ON CONFLICT (album_nr, subject_id, semester, academic_year) DO NOTHING;
    
    -- Anna Nowak - Matematyka, rok 4
    INSERT INTO enrollments (
        album_nr, subject_id, semester, academic_year, 
        enrollment_date, status, final_grade
    ) VALUES
    -- Semestr zimowy 2024/2025 (aktualny)
    (v_anna_album_nr, 1, 'zimowy', '2024/2025', '2024-09-20 12:00:00', 'enrolled', NULL), -- Programowanie 1
    (v_anna_album_nr, 2, 'zimowy', '2024/2025', '2024-09-20 12:05:00', 'enrolled', NULL), -- Matematyka 1
    (v_anna_album_nr, 8, 'zimowy', '2024/2025', '2024-09-20 12:10:00', 'enrolled', NULL), -- Analiza matematyczna
    -- Semestr letni 2023/2024 (zaliczony - bardzo dobre oceny)
    (v_anna_album_nr, 4, 'letni', '2023/2024', '2024-02-15 11:00:00', 'completed', '5.0'), -- Algorytmy 1
    (v_anna_album_nr, 7, 'letni', '2023/2024', '2024-02-15 11:05:00', 'completed', '5.0')  -- Fizyka 1
    ON CONFLICT (album_nr, subject_id, semester, academic_year) DO NOTHING;
    
    -- ========================================
    -- 2. DODAJ ZAJĘCIA (CLASSES) DLA ZAJĘĆ PROWADZONYCH PRZEZ NAUCZYCIELI
    -- ========================================
    RAISE NOTICE 'Dodawanie dodatkowych zajęć dla nauczycieli...';
    
    -- Sprawdź dostępne subject_id
    -- Zakładając że mamy przedmioty: 1=PROG1, 2=MAT1, 3=BD1, 4=ALG1, 5=SYS1, 6=SK1, 7=FIZ1, 8=AM1
    
    -- Emil Kosicki - dodatkowe zajęcia
    INSERT INTO classes (subject_id, class_type, semester, academic_year, max_students, classroom, building_id)
    SELECT 6, 'wykład', 'zimowy', '2024/2025', 120, 101, 1 WHERE NOT EXISTS (
        SELECT 1 FROM classes WHERE subject_id = 6 AND class_type = 'wykład' AND semester = 'zimowy' AND academic_year = '2024/2025'
    );
    
    INSERT INTO classes (subject_id, class_type, semester, academic_year, max_students, classroom, building_id)
    SELECT 6, 'laboratorium', 'zimowy', '2024/2025', 24, 205, 2 WHERE NOT EXISTS (
        SELECT 1 FROM classes WHERE subject_id = 6 AND class_type = 'laboratorium' AND semester = 'zimowy' AND academic_year = '2024/2025' AND classroom = 205
    );
    
    -- Weronika Mazurek - zajęcia z analizy matematycznej
    INSERT INTO classes (subject_id, class_type, semester, academic_year, max_students, classroom, building_id)
    SELECT 8, 'ćwiczenia', 'zimowy', '2024/2025', 30, 302, 1 WHERE NOT EXISTS (
        SELECT 1 FROM classes WHERE subject_id = 8 AND class_type = 'ćwiczenia' AND semester = 'zimowy' AND academic_year = '2024/2025' AND classroom = 302
    );
    
    -- Kacper Pawlak - dodatkowe laboratorium fizyki
    INSERT INTO classes (subject_id, class_type, semester, academic_year, max_students, classroom, building_id)
    SELECT 7, 'laboratorium', 'zimowy', '2024/2025', 20, 401, 3 WHERE NOT EXISTS (
        SELECT 1 FROM classes WHERE subject_id = 7 AND class_type = 'laboratorium' AND semester = 'zimowy' AND academic_year = '2024/2025' AND classroom = 401
    );
    
    -- ========================================
    -- 3. PRZYPISZ STUDENTÓW DO ZAJĘĆ (STUDENT_CLASSES)
    -- ========================================
    RAISE NOTICE 'Przypisywanie studentów do zajęć...';
    
    -- Michał na zajęciach z aktualnego semestru
    INSERT INTO student_classes (class_id, album_nr)
    SELECT c.class_id, v_michal_album_nr
    FROM classes c
    WHERE c.subject_id IN (1, 3, 4, 5, 6)
      AND c.semester = 'zimowy'
      AND c.academic_year = '2024/2025'
      AND NOT EXISTS (
          SELECT 1 FROM student_classes sc 
          WHERE sc.class_id = c.class_id AND sc.album_nr = v_michal_album_nr
      );
    
    -- Jan na zajęciach z aktualnego semestru
    INSERT INTO student_classes (class_id, album_nr)
    SELECT c.class_id, v_jan_album_nr
    FROM classes c
    WHERE c.subject_id IN (1, 2, 3, 4)
      AND c.semester = 'zimowy'
      AND c.academic_year = '2024/2025'
      AND NOT EXISTS (
          SELECT 1 FROM student_classes sc 
          WHERE sc.class_id = c.class_id AND sc.album_nr = v_jan_album_nr
      );
    
    -- Anna na zajęciach z aktualnego semestru
    INSERT INTO student_classes (class_id, album_nr)
    SELECT c.class_id, v_anna_album_nr
    FROM classes c
    WHERE c.subject_id IN (1, 2, 8)
      AND c.semester = 'zimowy'
      AND c.academic_year = '2024/2025'
      AND NOT EXISTS (
          SELECT 1 FROM student_classes sc 
          WHERE sc.class_id = c.class_id AND sc.album_nr = v_anna_album_nr
      );
    
    -- ========================================
    -- 4. DODAJ HARMONOGRAM ZAJĘĆ (CALENDAR_EVENTS dla schedule)
    -- ========================================
    RAISE NOTICE 'Dodawanie harmonogramu zajęć do kalendarza...';
    
    -- Harmonogram dla Michała - Programowanie 1
    INSERT INTO calendar_events (
        title, description, start_date, end_date, 
        event_type, location, applies_to, related_id
    )
    SELECT 
        'Programowanie 1 - wykład',
        'Wykład z podstaw programowania',
        '2024-10-07 08:00:00', -- Poniedziałek 8:00
        '2024-10-07 09:30:00',
        'class',
        'sala 101, Budynek A',
        CONCAT('student:', v_michal_album_nr),
        c.class_id
    FROM classes c
    WHERE c.subject_id = 1 AND c.class_type = 'wykład' 
      AND c.semester = 'zimowy' AND c.academic_year = '2024/2025'
      AND NOT EXISTS (
          SELECT 1 FROM calendar_events ce 
          WHERE ce.related_id = c.class_id 
            AND ce.applies_to = CONCAT('student:', v_michal_album_nr)
            AND ce.start_date = '2024-10-07 08:00:00'
      )
    LIMIT 1;
    
    -- Powtarzaj dla każdego studenta i przedmiotu (tutaj przykłady)
    -- Jan - Bazy danych
    INSERT INTO calendar_events (
        title, description, start_date, end_date, 
        event_type, location, applies_to, related_id
    )
    SELECT 
        'Bazy danych - wykład',
        'Wykład z projektowania baz danych',
        '2024-10-08 10:00:00', -- Wtorek 10:00
        '2024-10-08 11:30:00',
        'class',
        'sala 201, Budynek A',
        CONCAT('student:', v_jan_album_nr),
        c.class_id
    FROM classes c
    WHERE c.subject_id = 3 AND c.class_type = 'wykład'
      AND c.semester = 'zimowy' AND c.academic_year = '2024/2025'
      AND NOT EXISTS (
          SELECT 1 FROM calendar_events ce 
          WHERE ce.related_id = c.class_id 
            AND ce.applies_to = CONCAT('student:', v_jan_album_nr)
            AND ce.start_date = '2024-10-08 10:00:00'
      )
    LIMIT 1;
    
    -- Anna - Analiza matematyczna
    INSERT INTO calendar_events (
        title, description, start_date, end_date, 
        event_type, location, applies_to, related_id
    )
    SELECT 
        'Analiza matematyczna - ćwiczenia',
        'Ćwiczenia z analizy matematycznej',
        '2024-10-09 12:00:00', -- Środa 12:00
        '2024-10-09 13:30:00',
        'class',
        'sala 302, Budynek A',
        CONCAT('student:', v_anna_album_nr),
        c.class_id
    FROM classes c
    WHERE c.subject_id = 8 AND c.class_type = 'ćwiczenia'
      AND c.semester = 'zimowy' AND c.academic_year = '2024/2025'
      AND NOT EXISTS (
          SELECT 1 FROM calendar_events ce 
          WHERE ce.related_id = c.class_id 
            AND ce.applies_to = CONCAT('student:', v_anna_album_nr)
            AND ce.start_date = '2024-10-09 12:00:00'
      )
    LIMIT 1;
    
    -- ========================================
    -- 5. DODAJ EGZAMINY
    -- ========================================
    RAISE NOTICE 'Dodawanie egzaminów...';
    
    -- Egzamin z Programowania 1 dla Michała i Jana
    INSERT INTO exams (
        class_id, exam_date, duration_minutes, 
        location, exam_type, max_points, description
    )
    SELECT 
        c.class_id,
        '2025-01-20 10:00:00', -- Egzamin w styczniu
        120,
        'Aula A, Budynek A',
        'final',
        100,
        'Egzamin końcowy z podstaw programowania - test praktyczny i teoretyczny'
    FROM classes c
    WHERE c.subject_id = 1 AND c.class_type = 'wykład'
      AND c.semester = 'zimowy' AND c.academic_year = '2024/2025'
      AND NOT EXISTS (
          SELECT 1 FROM exams e 
          WHERE e.class_id = c.class_id AND e.exam_date = '2025-01-20 10:00:00'
      )
    LIMIT 1;
    
    -- Egzamin z Baz danych
    INSERT INTO exams (
        class_id, exam_date, duration_minutes, 
        location, exam_type, max_points, description
    )
    SELECT 
        c.class_id,
        '2025-01-25 14:00:00',
        90,
        'sala 201, Budynek A',
        'final',
        100,
        'Egzamin końcowy - projektowanie i optymalizacja baz danych'
    FROM classes c
    WHERE c.subject_id = 3 AND c.class_type = 'wykład'
      AND c.semester = 'zimowy' AND c.academic_year = '2024/2025'
      AND NOT EXISTS (
          SELECT 1 FROM exams e 
          WHERE e.class_id = c.class_id AND e.exam_date = '2025-01-25 14:00:00'
      )
    LIMIT 1;
    
    -- Egzamin z Analizy matematycznej dla Anny
    INSERT INTO exams (
        class_id, exam_date, duration_minutes, 
        location, exam_type, max_points, description
    )
    SELECT 
        c.class_id,
        '2025-01-18 09:00:00',
        180,
        'Aula B, Budynek A',
        'final',
        150,
        'Egzamin końcowy z analizy matematycznej - część pisemna i ustna'
    FROM classes c
    WHERE c.subject_id = 8 AND c.class_type = 'ćwiczenia'
      AND c.semester = 'zimowy' AND c.academic_year = '2024/2025'
      AND NOT EXISTS (
          SELECT 1 FROM exams e 
          WHERE e.class_id = c.class_id AND e.exam_date = '2025-01-18 09:00:00'
      )
    LIMIT 1;
    
    -- Kolokwium z Algorytmów dla Michała i Jana
    INSERT INTO exams (
        class_id, exam_date, duration_minutes, 
        location, exam_type, max_points, description
    )
    SELECT 
        c.class_id,
        '2024-12-15 12:00:00', -- Kolokwium w grudniu (już było)
        60,
        'sala 105, Budynek A',
        'midterm',
        50,
        'Kolokwium śródsemestralne - złożoność algorytmów'
    FROM classes c
    WHERE c.subject_id = 4 AND c.class_type = 'wykład'
      AND c.semester = 'zimowy' AND c.academic_year = '2024/2025'
      AND NOT EXISTS (
          SELECT 1 FROM exams e 
          WHERE e.class_id = c.class_id AND e.exam_date = '2024-12-15 12:00:00'
      )
    LIMIT 1;
    
    -- ========================================
    -- 6. DODAJ WIĘCEJ OCEN
    -- ========================================
    RAISE NOTICE 'Dodawanie dodatkowych ocen...';
    
    -- Michał - student bardzo dobry (4.0-5.0)
    INSERT INTO grades (
        album_nr, class_id, subject_id, value, weight, 
        attempt, added_by_teaching_staff_id, comment, created_at
    )
    SELECT 
        v_michal_album_nr,
        c.class_id,
        c.subject_id,
        '4.5',
        2,
        1,
        v_emil_staff_id,
        'Bardzo dobra znajomość tematu, aktywny na zajęciach',
        '2024-11-15 10:00:00'
    FROM classes c
    WHERE c.subject_id = 4 AND c.class_type = 'wykład'
      AND c.semester = 'zimowy' AND c.academic_year = '2024/2025'
      AND NOT EXISTS (
          SELECT 1 FROM grades g 
          WHERE g.album_nr = v_michal_album_nr 
            AND g.class_id = c.class_id 
            AND g.created_at = '2024-11-15 10:00:00'
      )
    LIMIT 1;
    
    INSERT INTO grades (
        album_nr, class_id, subject_id, value, weight, 
        attempt, added_by_teaching_staff_id, comment, created_at
    )
    SELECT 
        v_michal_album_nr,
        c.class_id,
        c.subject_id,
        '4.0',
        1,
        1,
        v_emil_staff_id,
        'Poprawnie wykonane zadanie laboratoryjne',
        '2024-11-20 14:30:00'
    FROM classes c
    WHERE c.subject_id = 3 AND c.class_type = 'laboratorium'
      AND c.semester = 'zimowy' AND c.academic_year = '2024/2025'
      AND NOT EXISTS (
          SELECT 1 FROM grades g 
          WHERE g.album_nr = v_michal_album_nr 
            AND g.class_id = c.class_id 
            AND g.created_at = '2024-11-20 14:30:00'
      )
    LIMIT 1;
    
    -- Jan - student przeciętny (3.0-3.5)
    INSERT INTO grades (
        album_nr, class_id, subject_id, value, weight, 
        attempt, added_by_teaching_staff_id, comment, created_at
    )
    SELECT 
        v_jan_album_nr,
        c.class_id,
        c.subject_id,
        '3.0',
        2,
        1,
        v_emil_staff_id,
        'Zaliczone, wymaga więcej pracy',
        '2024-11-15 10:05:00'
    FROM classes c
    WHERE c.subject_id = 4 AND c.class_type = 'wykład'
      AND c.semester = 'zimowy' AND c.academic_year = '2024/2025'
      AND NOT EXISTS (
          SELECT 1 FROM grades g 
          WHERE g.album_nr = v_jan_album_nr 
            AND g.class_id = c.class_id 
            AND g.created_at = '2024-11-15 10:05:00'
      )
    LIMIT 1;
    
    INSERT INTO grades (
        album_nr, class_id, subject_id, value, weight, 
        attempt, added_by_teaching_staff_id, comment, created_at
    )
    SELECT 
        v_jan_album_nr,
        c.class_id,
        c.subject_id,
        '3.5',
        1,
        1,
        v_weronika_staff_id,
        'Poprawne rozwiązanie zadań matematycznych',
        '2024-11-22 11:00:00'
    FROM classes c
    WHERE c.subject_id = 2 AND c.class_type = 'ćwiczenia'
      AND c.semester = 'zimowy' AND c.academic_year = '2024/2025'
      AND NOT EXISTS (
          SELECT 1 FROM grades g 
          WHERE g.album_nr = v_jan_album_nr 
            AND g.class_id = c.class_id 
            AND g.created_at = '2024-11-22 11:00:00'
      )
    LIMIT 1;
    
    -- Anna - bardzo dobra studentka (4.5-5.0)
    INSERT INTO grades (
        album_nr, class_id, subject_id, value, weight, 
        attempt, added_by_teaching_staff_id, comment, created_at
    )
    SELECT 
        v_anna_album_nr,
        c.class_id,
        c.subject_id,
        '5.0',
        2,
        1,
        v_weronika_staff_id,
        'Wybitne rozwiązania, perfekcyjna znajomość',
        '2024-11-18 09:30:00'
    FROM classes c
    WHERE c.subject_id = 8 AND c.class_type = 'ćwiczenia'
      AND c.semester = 'zimowy' AND c.academic_year = '2024/2025'
      AND NOT EXISTS (
          SELECT 1 FROM grades g 
          WHERE g.album_nr = v_anna_album_nr 
            AND g.class_id = c.class_id 
            AND g.created_at = '2024-11-18 09:30:00'
      )
    LIMIT 1;
    
    INSERT INTO grades (
        album_nr, class_id, subject_id, value, weight, 
        attempt, added_by_teaching_staff_id, comment, created_at
    )
    SELECT 
        v_anna_album_nr,
        c.class_id,
        c.subject_id,
        '5.0',
        1,
        1,
        v_emil_staff_id,
        'Kreatywne podejście do programowania',
        '2024-11-25 15:00:00'
    FROM classes c
    WHERE c.subject_id = 1 AND c.class_type = 'wykład'
      AND c.semester = 'zimowy' AND c.academic_year = '2024/2025'
      AND NOT EXISTS (
          SELECT 1 FROM grades g 
          WHERE g.album_nr = v_anna_album_nr 
            AND g.class_id = c.class_id 
            AND g.created_at = '2024-11-25 15:00:00'
      )
    LIMIT 1;
    
    -- ========================================
    -- 7. DODAJ COURSE_INSTRUCTORS DLA NOWYCH ZAJĘĆ
    -- ========================================
    RAISE NOTICE 'Przypisywanie nauczycieli do nowych zajęć...';
    
    -- Emil do nowych zajęć Sieci komputerowe
    INSERT INTO course_instructors (class_id, teaching_staff_id)
    SELECT c.class_id, v_emil_staff_id
    FROM classes c
    WHERE c.subject_id = 6 
      AND c.semester = 'zimowy' 
      AND c.academic_year = '2024/2025'
      AND NOT EXISTS (
          SELECT 1 FROM course_instructors ci 
          WHERE ci.class_id = c.class_id AND ci.teaching_staff_id = v_emil_staff_id
      );
    
    -- Weronika do Analizy matematycznej
    INSERT INTO course_instructors (class_id, teaching_staff_id)
    SELECT c.class_id, v_weronika_staff_id
    FROM classes c
    WHERE c.subject_id = 8
      AND c.semester = 'zimowy' 
      AND c.academic_year = '2024/2025'
      AND NOT EXISTS (
          SELECT 1 FROM course_instructors ci 
          WHERE ci.class_id = c.class_id AND ci.teaching_staff_id = v_weronika_staff_id
      );
    
    -- Kacper do nowych laboratoriów fizyki
    INSERT INTO course_instructors (class_id, teaching_staff_id)
    SELECT c.class_id, v_kacper_staff_id
    FROM classes c
    WHERE c.subject_id = 7 
      AND c.class_type = 'laboratorium'
      AND c.semester = 'zimowy' 
      AND c.academic_year = '2024/2025'
      AND NOT EXISTS (
          SELECT 1 FROM course_instructors ci 
          WHERE ci.class_id = c.class_id AND ci.teaching_staff_id = v_kacper_staff_id
      );
    
    RAISE NOTICE '=== ZAKOŃCZONO UZUPEŁNIANIE DANYCH ===';
    
END $$;

-- ========================================
-- PODSUMOWANIE PO WYKONANIU SKRYPTU
-- ========================================
SELECT '=== PODSUMOWANIE DANYCH DLA INIT_USERS ===' as info;

-- Sprawdź enrollments
SELECT 
    'ENROLLMENTS' as kategoria,
    u.email,
    COUNT(e.enrollment_id) as liczba_zapisow
FROM users u
LEFT JOIN students s ON u.user_id = s.user_id
LEFT JOIN enrollments e ON s.album_nr = e.album_nr
WHERE u.email IN (
    'michal.grzonkowski@student.edu.pl',
    'jan.kowalski@student.edu.pl', 
    'anna.nowak@student.edu.pl'
)
GROUP BY u.email
ORDER BY u.email;

-- Sprawdź grades
SELECT 
    'GRADES' as kategoria,
    u.email,
    COUNT(g.grade_id) as liczba_ocen,
    ROUND(AVG(CASE WHEN g.value ~ '^[0-9.]+$' THEN g.value::numeric ELSE NULL END), 2) as srednia
FROM users u
LEFT JOIN students s ON u.user_id = s.user_id
LEFT JOIN grades g ON s.album_nr = g.album_nr
WHERE u.email IN (
    'michal.grzonkowski@student.edu.pl',
    'jan.kowalski@student.edu.pl',
    'anna.nowak@student.edu.pl'
)
GROUP BY u.email
ORDER BY u.email;

-- Sprawdź student_classes
SELECT 
    'STUDENT_CLASSES' as kategoria,
    u.email,
    COUNT(sc.class_id) as liczba_zajec
FROM users u
LEFT JOIN students s ON u.user_id = s.user_id
LEFT JOIN student_classes sc ON s.album_nr = sc.album_nr
WHERE u.email IN (
    'michal.grzonkowski@student.edu.pl',
    'jan.kowalski@student.edu.pl',
    'anna.nowak@student.edu.pl'
)
GROUP BY u.email
ORDER BY u.email;

-- Sprawdź calendar_events (schedule)
SELECT 
    'CALENDAR_EVENTS' as kategoria,
    COUNT(*) as liczba_wydarzen,
    COUNT(DISTINCT applies_to) as liczba_studentow
FROM calendar_events
WHERE applies_to LIKE 'student:%'
  AND applies_to IN (
      SELECT CONCAT('student:', album_nr) 
      FROM students s 
      JOIN users u ON s.user_id = u.user_id 
      WHERE u.email IN (
          'michal.grzonkowski@student.edu.pl',
          'jan.kowalski@student.edu.pl',
          'anna.nowak@student.edu.pl'
      )
  );

-- Sprawdź exams
SELECT 
    'EXAMS' as kategoria,
    COUNT(*) as liczba_egzaminow,
    MIN(exam_date) as najblizszy_egzamin
FROM exams
WHERE exam_date >= CURRENT_DATE;

-- Sprawdź course_instructors dla nauczycieli
SELECT 
    'COURSE_INSTRUCTORS' as kategoria,
    u.email,
    COUNT(ci.class_id) as liczba_prowadzonych_zajec
FROM users u
LEFT JOIN teaching_staff ts ON u.user_id = ts.user_id
LEFT JOIN course_instructors ci ON ts.teaching_staff_id = ci.teaching_staff_id
WHERE u.email IN (
    'emil.kosicki@edu.pl',
    'weronika.mazurek@edu.pl',
    'kacper.pawlak@edu.pl'
)
GROUP BY u.email
ORDER BY u.email;

SELECT '=== Dane zostały pomyślnie uzupełnione! ===' as sukces;
