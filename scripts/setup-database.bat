@echo off

REM Exit on error
setlocal enabledelayedexpansion

:check_docker
where docker >nul 2>&1
if errorlevel 1 (
    echo [translate:Docker nie jest zainstalowany lub niedostępny]
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo [translate:Docker daemon nie dziala. Uruchom Docker Desktop.]
    exit /b 1
)

:check_docker_compose
where docker-compose >nul 2>&1
if %errorlevel%==0 (
    set "DOCKER_COMPOSE=docker-compose"
) else (
    docker compose version >nul 2>&1
    if errorlevel 1 (
        echo [translate:docker-compose lub docker compose nie jest dostepny]
        exit /b 1
    ) else (
        set "DOCKER_COMPOSE=docker compose"
    )
)

:wait_for_postgres
set max_attempts=30
set /a attempt=1

:wait_loop
%DOCKER_COMPOSE% ps postgres | findstr /R /C:"Up" >nul
if not errorlevel 1 (
    timeout /t 2 >nul
    echo [translate:PostgreSQL jest gotowy]
    goto :after_wait
)

if !attempt! leq !max_attempts! (
    echo [translate:  Proba !attempt!/!max_attempts! - PostgreSQL jeszcze sie uruchamia...]
    timeout /t 2 >nul
    set /a attempt+=1
    goto wait_loop
)

echo [translate:PostgreSQL nie uruchomil sie w oczekiwanym czasie]
exit /b 1

:after_wait

rem Verify seeder does nothing in original

:verify_users
for /f "tokens=*" %%A in ('%DOCKER_COMPOSE% exec -T postgres psql -U postgres -d mydb -t -c "SELECT COUNT(*) FROM users;" 2^>nul') do set user_count=%%A
set user_count=%user_count: =%
if %user_count% gtr 0 (
    exit /b 0
) else (
    exit /b 1
)

:enrich_init_users_data

echo.
echo [translate:Uzupelniam danych dla uzytkownikow z init_users.go...]

set script_path=.\src\backend\database\seeds\enrich_init_users_data.sql

if not exist "%script_path%" (
    echo [translate:Nie znaleziono]: %script_path%
    echo [translate:Pomijam uzupelnianie danych init_users]
    exit /b 0
)

echo [translate:Uruchamiam]: %script_path%

%DOCKER_COMPOSE% exec -T postgres psql -U postgres -d mydb < "%script_path%" 2>&1 | findstr "ERROR"
if not errorlevel 1 (
    echo [translate:Blad podczas uzupelniania danych]
    echo [translate:Kontynuuje...]
) else (
    echo [translate:Dane uzupelnione!]
)

call :check_docker
call :check_docker_compose

echo [translate:Uruchamiam PostgreSQL...]
%DOCKER_COMPOSE% up -d postgres
call :wait_for_postgres

echo.
echo [translate:Uruchamiam migracje...]
%DOCKER_COMPOSE% run --rm migrate

echo.
echo [translate:Builduje seeder...]
%DOCKER_COMPOSE% --profile seeder build --no-cache seeder

echo.
echo [translate:Uruchamiam seeder (podstawowe dane)...]
%DOCKER_COMPOSE% --profile seeder run --rm seeder

call :verify_seeder

%DOCKER_COMPOSE% --profile init run --rm init-users

%DOCKER_COMPOSE% --profile generator build --no-cache generator || exit /b 1

%DOCKER_COMPOSE% --profile generator run --rm generator || exit /b 1

call :enrich_init_users_data

echo Done
