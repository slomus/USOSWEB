@echo off
echo Reset bazy danych (Windows)
echo ============================

docker-compose down -v --remove-orphans
docker-compose up -d postgres --remove-orphans

echo Czekam na PostgreSQL...
for /L %%i in (1,1,10) do (
    docker-compose exec postgres pg_isready -h localhost -p 5432 >nul 2>&1
    if errorlevel 0 (
        echo PostgreSQL jest gotowy!
        goto :ready
    ) else (
        echo Proba %%i/10 - czekam 3 sekundy...
        timeout /t 3 >nul
    )
)

:ready
docker-compose run migrate
docker-compose --profile seeder run seeder

echo Baza danych zostala zresetowana! 