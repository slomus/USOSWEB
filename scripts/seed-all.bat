@echo off
setlocal

echo ==========================================
echo   USOSWEB - Pelne seedowanie bazy danych
echo ==========================================
echo.

REM Sprawdz czy Docker Compose dziala
docker compose ps >nul 2>&1
if errorlevel 1 (
    echo [BLAD] Docker Compose nie dziala!
    echo.
    echo Najpierw uruchom serwisy:
    echo   docker compose up -d --build
    echo.
    pause
    exit /b 1
)

REM Sprawdz czy postgres dziala
docker compose ps postgres | findstr "Up" >nul
if errorlevel 1 (
    echo [BLAD] PostgreSQL nie dziala!
    echo.
    echo Najpierw uruchom serwisy:
    echo   docker compose up -d --build
    echo.
    pause
    exit /b 1
)

echo [OK] Serwisy dzialaja. Rozpoczynam seedowanie...
echo.

echo [1/7] Uruchamianie podstawowych serwisow...
docker compose up -d postgres redis

echo [2/7] Czekam na gotowosc PostgreSQL...
timeout /t 5 /nobreak >nul

echo [3/7] Uruchamianie migracji...
docker compose up migrate

echo [4/7] Wgrywanie danych podstawowych (mock_data.sql)...
docker compose run --rm seeder

echo [5/7] Uruchamianie API Gateway i Common...
docker compose up -d api-gateway common
timeout /t 3 /nobreak >nul

echo [6/7] Rejestrowanie uzytkownikow (9 osob)...
docker compose run --rm init-users

echo [7/7] Wgrywanie relacji (wiadomosci, oceny, etc.)...
docker compose run --rm init-relations

echo.
set /p GENERATE_MORE="Czy chcesz wygenerowac dodatkowe dane (91 uzytkownikow + duzo relacji)? [t/N] "
if /i "%GENERATE_MORE%"=="t" (
    echo [BONUS] Generowanie dodatkowych danych...
    docker compose run --rm generator
)

echo.
echo ==========================================
echo   * Seedowanie zakonczone pomyslnie!
echo ==========================================
echo.
echo Mozesz teraz uruchomic wszystkie serwisy:
echo   docker compose up -d
echo.
echo Dane logowania:
echo   - admin@system.com / SystemAdmin123!
echo   - michal.grzonkowski@student.edu.pl / Michal123!
echo   - jan.kowalski@student.edu.pl / Jan123!
echo   - anna.nowak@student.edu.pl / Anna123!
echo   - emil.kosicki@edu.pl / Emil123!
echo.

pause

