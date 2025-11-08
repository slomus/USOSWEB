-- ========================================
-- SKRYPT UZUPEŁNIAJĄCY DANE DLA UŻYTKOWNIKÓW Z INIT_USERS.GO
-- Wersja 3.1 - poprawiona (bez max_points, z poprawnym castowaniem ENUM)
-- ========================================

DO $$
DECLARE
    v_michal_album_nr INT;
    v_jan_album_nr INT;
    v_anna_album_nr INT;
    v_emil_staff_id INT;
    v_weronika_staff_id INT;
    v_kacper_staff_id INT;
BEGIN
    -- Pobierz album_nr dla studentów
    SELECT album_nr INTO v_michal_album_nr FROM students WHERE user_id = (SELECT user_id FROM users WHERE email = 'michal.grzonkowski@student.edu.pl');
    SELECT album_nr INTO v_jan_album_nr FROM students WHERE user_id = (SELECT user_id FROM users WHERE email = 'jan.kowalski@student.edu.pl');
    SELECT album_nr INTO v_anna_album_nr FROM students WHERE user_id = (SELECT user_id FROM users WHERE email = 'anna.nowak@student.edu.pl');
    
    -- Pobierz teaching_staff_id
    SELECT teaching_staff_id INTO v_emil_staff_id FROM teaching_staff WHERE user_id = (SELECT user_id FROM users WHERE email = 'emil.kosicki@edu.pl');
    SELECT teaching_staff_id INTO v_weronika_staff_id FROM teaching_staff WHERE user_id = (SELECT user_id FROM users WHERE email = 'weronika.mazurek@edu.pl');
    SELECT teaching_staff_id INTO v_kacper_staff_id FROM teaching_staff WHERE user_id = (SELECT user_id FROM users WHERE email = 'kacper.pawlak@edu.pl');
    
    RAISE NOTICE '=== Uzupełnianie danych dla użytkowników init_users.go ===';
    RAISE NOTICE 'Michał (album_nr: %)', v_michal_album_nr;
    RAISE NOTICE 'Jan (album_nr: %)', v_jan_album_nr;
    RAISE NOTICE 'Anna (album_nr: %)', v_anna_album_nr;
    
    -- ========================================
    -- 1. PRZYPISZ STUDENTÓW DO ISTNIEJĄCYCH ZAJĘĆ
    -- ========================================
    RAISE NOTICE 'Przypisywanie studentów do zajęć...';
    
    -- Michał - zapisz na losowe zajęcia (max 15)
    INSERT INTO student_classes (class_id, album_nr)
    SELECT c.class_id, v_michal_album_nr
    FROM classes c
    WHERE NOT EXISTS (
        SELECT 1 FROM student_classes sc 
        WHERE sc.class_id = c.class_id AND sc.album_nr = v_michal_album_nr
    )
    ORDER BY RANDOM()
    LIMIT 15;
    
    -- Jan - zapisz na losowe zajęcia (max 12)
    INSERT INTO student_classes (class_id, album_nr)
    SELECT c.class_id, v_jan_album_nr
    FROM classes c
    WHERE NOT EXISTS (
        SELECT 1 FROM student_classes sc 
        WHERE sc.class_id = c.class_id AND sc.album_nr = v_jan_album_nr
    )
    ORDER BY RANDOM()
    LIMIT 12;
    
    -- Anna - zapisz na losowe zajęcia (max 10)
    INSERT INTO student_classes (class_id, album_nr)
    SELECT c.class_id, v_anna_album_nr
    FROM classes c
    WHERE NOT EXISTS (
        SELECT 1 FROM student_classes sc 
        WHERE sc.class_id = c.class_id AND sc.album_nr = v_anna_album_nr
    )
    ORDER BY RANDOM()
    LIMIT 10;
    
    -- ========================================
    -- 2. DODAJ HARMONOGRAM DO SCHEDULES
    -- ========================================
    RAISE NOTICE 'Dodawanie harmonogramu...';
    
    -- Harmonogramy dla zajęć Michała
    INSERT INTO schedules (class_id, day_of_week, start_time, end_time, valid_from, valid_to)
    SELECT 
        sc.class_id,
        1 + (ROW_NUMBER() OVER (ORDER BY sc.class_id) - 1) % 5, -- pon-pt
        '08:00:00'::time + (INTERVAL '2 hours' * ((ROW_NUMBER() OVER (ORDER BY sc.class_id) - 1) % 4)),
        '08:00:00'::time + (INTERVAL '2 hours' * ((ROW_NUMBER() OVER (ORDER BY sc.class_id) - 1) % 4)) + INTERVAL '1.5 hours',
        '2024-10-01',
        '2025-01-31'
    FROM student_classes sc
    WHERE sc.album_nr = v_michal_album_nr
      AND NOT EXISTS (
          SELECT 1 FROM schedules s WHERE s.class_id = sc.class_id
      )
    LIMIT 5;
    
    -- Harmonogramy dla zajęć Jana
    INSERT INTO schedules (class_id, day_of_week, start_time, end_time, valid_from, valid_to)
    SELECT 
        sc.class_id,
        1 + (ROW_NUMBER() OVER (ORDER BY sc.class_id) - 1) % 5,
        '10:00:00'::time + (INTERVAL '2 hours' * ((ROW_NUMBER() OVER (ORDER BY sc.class_id) - 1) % 3)),
        '10:00:00'::time + (INTERVAL '2 hours' * ((ROW_NUMBER() OVER (ORDER BY sc.class_id) - 1) % 3)) + INTERVAL '1.5 hours',
        '2024-10-01',
        '2025-01-31'
    FROM student_classes sc
    WHERE sc.album_nr = v_jan_album_nr
      AND NOT EXISTS (
          SELECT 1 FROM schedules s WHERE s.class_id = sc.class_id
      )
    LIMIT 5;
    
    -- Harmonogramy dla zajęć Anny
    INSERT INTO schedules (class_id, day_of_week, start_time, end_time, valid_from, valid_to)
    SELECT 
        sc.class_id,
        1 + (ROW_NUMBER() OVER (ORDER BY sc.class_id) - 1) % 5,
        '12:00:00'::time + (INTERVAL '2 hours' * ((ROW_NUMBER() OVER (ORDER BY sc.class_id) - 1) % 3)),
        '12:00:00'::time + (INTERVAL '2 hours' * ((ROW_NUMBER() OVER (ORDER BY sc.class_id) - 1) % 3)) + INTERVAL '1.5 hours',
        '2024-10-01',
        '2025-01-31'
    FROM student_classes sc
    WHERE sc.album_nr = v_anna_album_nr
      AND NOT EXISTS (
          SELECT 1 FROM schedules s WHERE s.class_id = sc.class_id
      )
    LIMIT 5;
    
    -- ========================================
    -- 3. DODAJ EGZAMINY (bez max_points)
    -- ========================================
    RAISE NOTICE 'Dodawanie egzaminów...';
    
    -- Egzaminy dla zajęć Michała
    INSERT INTO exams (class_id, exam_date, duration_minutes, location, exam_type, description)
    SELECT 
        sc.class_id,
        '2025-01-20 10:00:00'::timestamp + (INTERVAL '1 day' * (ROW_NUMBER() OVER (ORDER BY sc.class_id) - 1)),
        90,
        'Sala egzaminacyjna',
        'final',
        'Egzamin końcowy'
    FROM student_classes sc
    WHERE sc.album_nr = v_michal_album_nr
      AND NOT EXISTS (
          SELECT 1 FROM exams e WHERE e.class_id = sc.class_id
      )
    LIMIT 3;
    
    -- Egzaminy dla zajęć Jana
    INSERT INTO exams (class_id, exam_date, duration_minutes, location, exam_type, description)
    SELECT 
        sc.class_id,
        '2025-01-22 14:00:00'::timestamp + (INTERVAL '1 day' * (ROW_NUMBER() OVER (ORDER BY sc.class_id) - 1)),
        90,
        'Sala egzaminacyjna',
        'final',
        'Egzamin końcowy'
    FROM student_classes sc
    WHERE sc.album_nr = v_jan_album_nr
      AND NOT EXISTS (
          SELECT 1 FROM exams e WHERE e.class_id = sc.class_id
      )
    LIMIT 3;
    
    -- Egzaminy dla zajęć Anny
    INSERT INTO exams (class_id, exam_date, duration_minutes, location, exam_type, description)
    SELECT 
        sc.class_id,
        '2025-01-18 09:00:00'::timestamp + (INTERVAL '1 day' * (ROW_NUMBER() OVER (ORDER BY sc.class_id) - 1)),
        120,
        'Sala egzaminacyjna',
        'final',
        'Egzamin końcowy'
    FROM student_classes sc
    WHERE sc.album_nr = v_anna_album_nr
      AND NOT EXISTS (
          SELECT 1 FROM exams e WHERE e.class_id = sc.class_id
      )
    LIMIT 3;
    
    -- ========================================
    -- 4. DODAJ WIĘCEJ OCEN
    -- ========================================
    RAISE NOTICE 'Dodawanie dodatkowych ocen...';
    
    -- Oceny dla Michała (bardzo dobry student 4.0-5.0)
    INSERT INTO grades (album_nr, class_id, subject_id, value, weight, attempt, added_by_teaching_staff_id, comment, created_at)
    SELECT 
        v_michal_album_nr,
        sc.class_id,
        c.subject_id,
        (ARRAY['4.0', '4.5', '5.0'])[1 + (ROW_NUMBER() OVER (ORDER BY sc.class_id) - 1) % 3]::grade_value,
        2,
        1,
        v_emil_staff_id,
        'Bardzo dobra znajomość tematu',
        '2024-11-15 10:00:00'::timestamp + (INTERVAL '1 day' * (ROW_NUMBER() OVER (ORDER BY sc.class_id) - 1))
    FROM student_classes sc
    JOIN classes c ON sc.class_id = c.class_id
    WHERE sc.album_nr = v_michal_album_nr
      AND NOT EXISTS (
          SELECT 1 FROM grades g 
          WHERE g.album_nr = v_michal_album_nr 
            AND g.class_id = sc.class_id
      )
    LIMIT 3;
    
    -- Oceny dla Jana (przeciętny student 3.0-3.5)
    INSERT INTO grades (album_nr, class_id, subject_id, value, weight, attempt, added_by_teaching_staff_id, comment, created_at)
    SELECT 
        v_jan_album_nr,
        sc.class_id,
        c.subject_id,
        (ARRAY['3.0', '3.5', '3.0'])[1 + (ROW_NUMBER() OVER (ORDER BY sc.class_id) - 1) % 3]::grade_value,
        2,
        1,
        v_emil_staff_id,
        'Zaliczone',
        '2024-11-15 10:00:00'::timestamp + (INTERVAL '1 day' * (ROW_NUMBER() OVER (ORDER BY sc.class_id) - 1))
    FROM student_classes sc
    JOIN classes c ON sc.class_id = c.class_id
    WHERE sc.album_nr = v_jan_album_nr
      AND NOT EXISTS (
          SELECT 1 FROM grades g 
          WHERE g.album_nr = v_jan_album_nr 
            AND g.class_id = sc.class_id
      )
    LIMIT 3;
    
    -- Oceny dla Anny (wybitna studentka 4.5-5.0)
    INSERT INTO grades (album_nr, class_id, subject_id, value, weight, attempt, added_by_teaching_staff_id, comment, created_at)
    SELECT 
        v_anna_album_nr,
        sc.class_id,
        c.subject_id,
        (ARRAY['5.0', '5.0', '4.5'])[1 + (ROW_NUMBER() OVER (ORDER BY sc.class_id) - 1) % 3]::grade_value,
        2,
        1,
        v_weronika_staff_id,
        'Wybitne rozwiązania',
        '2024-11-18 09:30:00'::timestamp + (INTERVAL '1 day' * (ROW_NUMBER() OVER (ORDER BY sc.class_id) - 1))
    FROM student_classes sc
    JOIN classes c ON sc.class_id = c.class_id
    WHERE sc.album_nr = v_anna_album_nr
      AND NOT EXISTS (
          SELECT 1 FROM grades g 
          WHERE g.album_nr = v_anna_album_nr 
            AND g.class_id = sc.class_id
      )
    LIMIT 3;
    
    -- ========================================
    -- 5. PRZYPISZ NAUCZYCIELI DO ZAJĘĆ
    -- ========================================
    RAISE NOTICE 'Przypisywanie nauczycieli...';
    
    -- Emil do losowych zajęć (jeśli nie ma przypisań)
    INSERT INTO course_instructors (class_id, teaching_staff_id)
    SELECT c.class_id, v_emil_staff_id
    FROM classes c
    WHERE NOT EXISTS (
        SELECT 1 FROM course_instructors ci 
        WHERE ci.class_id = c.class_id AND ci.teaching_staff_id = v_emil_staff_id
    )
    ORDER BY RANDOM()
    LIMIT 5;
    
    -- Weronika
    INSERT INTO course_instructors (class_id, teaching_staff_id)
    SELECT c.class_id, v_weronika_staff_id
    FROM classes c
    WHERE NOT EXISTS (
        SELECT 1 FROM course_instructors ci 
        WHERE ci.class_id = c.class_id AND ci.teaching_staff_id = v_weronika_staff_id
    )
    ORDER BY RANDOM()
    LIMIT 3;
    
    -- Kacper
    INSERT INTO course_instructors (class_id, teaching_staff_id)
    SELECT c.class_id, v_kacper_staff_id
    FROM classes c
    WHERE NOT EXISTS (
        SELECT 1 FROM course_instructors ci 
        WHERE ci.class_id = c.class_id AND ci.teaching_staff_id = v_kacper_staff_id
    )
    ORDER BY RANDOM()
    LIMIT 3;
    
    RAISE NOTICE '=== ZAKOŃCZONO UZUPEŁNIANIE DANYCH ===';
    
END $$;

-- ========================================
-- PODSUMOWANIE
-- ========================================
SELECT '=== PODSUMOWANIE ===' as info;

SELECT 
    'student_classes' as tabela,
    u.email,
    COUNT(sc.class_id) as liczba
FROM users u
JOIN students s ON u.user_id = s.user_id
LEFT JOIN student_classes sc ON s.album_nr = sc.album_nr
WHERE u.email IN (
    'michal.grzonkowski@student.edu.pl',
    'jan.kowalski@student.edu.pl',
    'anna.nowak@student.edu.pl'
)
GROUP BY u.email;

SELECT 
    'grades' as tabela,
    u.email,
    COUNT(g.grade_id) as liczba,
    ROUND(AVG(CASE 
        WHEN g.value::text IN ('2.0', '3.0', '3.5', '4.0', '4.5', '5.0') 
        THEN g.value::text::numeric 
        ELSE NULL 
    END), 2) as srednia
FROM users u
JOIN students s ON u.user_id = s.user_id
LEFT JOIN grades g ON s.album_nr = g.album_nr
WHERE u.email IN (
    'michal.grzonkowski@student.edu.pl',
    'jan.kowalski@student.edu.pl',
    'anna.nowak@student.edu.pl'
)
GROUP BY u.email;

SELECT 
    'schedules' as tabela,
    COUNT(*) as liczba
FROM schedules s
JOIN student_classes sc ON s.class_id = sc.class_id
WHERE sc.album_nr IN (
    SELECT album_nr FROM students st 
    JOIN users u ON st.user_id = u.user_id 
    WHERE u.email IN (
        'michal.grzonkowski@student.edu.pl',
        'jan.kowalski@student.edu.pl',
        'anna.nowak@student.edu.pl'
    )
);

SELECT 
    'exams' as tabela,
    COUNT(*) as liczba
FROM exams e
JOIN student_classes sc ON e.class_id = sc.class_id
WHERE sc.album_nr IN (
    SELECT album_nr FROM students st 
    JOIN users u ON st.user_id = u.user_id 
    WHERE u.email IN (
        'michal.grzonkowski@student.edu.pl',
        'jan.kowalski@student.edu.pl',
        'anna.nowak@student.edu.pl'
    )
);

SELECT '✅ Gotowe!' as status;
