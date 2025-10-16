@echo off
REM Setup Database Script - Windows Batch
REM Autor: Skrypt do inicjalizacji bazy danych w odpowiedniej kolejności

setlocal EnableDelayedExpansion


REM Funkcja do sprawdzania czy Docker działa

docker --version >nul 2>&1
if errorlevel 1 (
    echo  Docker nie jest zainstalowany lub niedostępny
    pause
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo  Docker daemon nie działa. Uruchom Docker Desktop.
    pause
    exit /b 1
)

REM Sprawdź czy docker-compose jest dostępny
docker-compose --version >nul 2>&1
if errorlevel 1 (
    docker compose version >nul 2>&1
    if errorlevel 1 (
        echo  docker-compose ani docker compose nie jest dostępny
        pause
        exit /b 1
    ) else (
        set DOCKER_COMPOSE=docker compose
    )
) else (
    set DOCKER_COMPOSE=docker-compose
)


!DOCKER_COMPOSE! up -d postgres

echo  Czekam na uruchomienie PostgreSQL...
timeout /t 10 /nobreak >nul

REM Sprawdź czy PostgreSQL jest gotowy (prosty sposób)
set /a attempts=0
:wait_postgres
set /a attempts+=1
!DOCKER_COMPOSE! ps postgres | find "Up" >nul 2>&1
if errorlevel 1 (
    if !attempts! geq 15 (
        echo  PostgreSQL nie uruchomił się w oczekiwanym czasie
        pause
        exit /b 1
    )
    echo    Próba !attempts!/15 - PostgreSQL jeszcze się uruchamia...
    timeout /t 2 /nobreak >nul
    goto wait_postgres
)

timeout /t 2 /nobreak >nul

!DOCKER_COMPOSE! run --rm migrate
if errorlevel 1 (
    echo  Migracje nie powiodły się
    pause
    exit /b 1
)

!DOCKER_COMPOSE! --profile seeder build --no-cache seeder
if errorlevel 1 (
    echo  Budowanie seedera nie powiodło się
    pause
    exit /b 1
)

!DOCKER_COMPOSE! --profile seeder run --rm seeder
if errorlevel 1 (
    echo  Seeder nie powiódł się
    pause
    exit /b 1
)


!DOCKER_COMPOSE! --profile init run --rm init-users
if errorlevel 1 (
    echo  Tworzenie użytkowników nie powiodło się
    pause
    exit /b 1
)


!DOCKER_COMPOSE! --profile init run --rm init-relations
if errorlevel 1 (
    echo  Tworzenie relacji nie powiodło się
    pause
    exit /b 1
)
pause
