@echo off
echo Budowanie bazy danych (Windows)
echo ================================

docker-compose down -v --remove-orphans
docker-compose rm -f migrate 2>nul || echo Migrate container nie istnieje - OK

echo Usuwanie starych obrazow migrate...
for /f "tokens=3" %%i in ('docker images ^| findstr "usosweb.*migrate"') do (
    docker rmi -f %%i 2>nul || echo Obraz juz usuniety
)

echo Budowanie migrate container...
docker-compose build --no-cache migrate

echo Uruchamianie PostgreSQL...
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

echo TIMEOUT: PostgreSQL nie odpowiada po 30 sekundach
exit /b 1

:ready
echo Uruchamianie migracji...
docker-compose run --rm migrate up

echo Wypelnianie bazy danymi...
docker-compose --profile seeder run --rm seeder

echo Baza danych zostala zbudowana i wypelniona! 