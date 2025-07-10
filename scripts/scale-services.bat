@echo off
if "%1"=="" (
    echo Uzycie: scripts\scale-services.bat ^<serwis^> ^<replicas^>
    echo.
    echo Przyklad:
    echo   scripts\scale-services.bat calendar 3
    echo   scripts\scale-services.bat api-gateway 2
    echo   scripts\scale-services.bat messaging 1
    echo.
    echo Dostepne serwisy: api-gateway, calendar, messaging, common, frontend
    exit /b 1
)

if "%2"=="" (
    echo BLAD: Nie podano liczby replik
    echo Uzycie: scripts\scale-services.bat ^<serwis^> ^<replicas^>
    exit /b 1
)

set SERVICE=%1
set REPLICAS=%2

echo Skalowanie %SERVICE% do %REPLICAS% replik...
kubectl scale deployment %SERVICE% --replicas=%REPLICAS% -n usosweb

if errorlevel 1 (
    echo BLAD: Nie udalo sie przeskalowac %SERVICE%
    exit /b 1
)

echo %SERVICE% przeskalowany do %REPLICAS% replik!

echo.
echo Status podow:
kubectl get pods -n usosweb -l app=%SERVICE% 