@echo off
echo Wdrazanie calej aplikacji USOSWEB na Kubernetes (Windows)
echo =========================================================

REM Sprawdz czy kubectl dziala
kubectl cluster-info >nul 2>&1
if errorlevel 1 (
    echo BLAD: Kubernetes nie jest dostepny. Sprawdz czy Docker Desktop dziala.
    exit /b 1
)

echo Kubernetes cluster dostepny

REM Sprawdz czy namespace istnieje
kubectl get namespace usosweb >nul 2>&1
if errorlevel 1 (
    echo Tworzenie namespace...
    kubectl apply -f k8s/namespace.yaml
)

echo Budowanie obrazow Docker...

REM Buduj backend
cd src\backend

echo Budowanie API Gateway...
if exist modules\api-gateway\Dockerfile.k8s (
    docker build -f modules\api-gateway\Dockerfile.k8s -t usosweb-api-gateway:latest .
    echo API Gateway zbudowany
) else (
    echo BLAD: Nie znaleziono Dockerfile.k8s dla API Gateway
)

echo Budowanie Calendar...
if exist modules\calendar\Dockerfile.k8s (
    docker build -f modules\calendar\Dockerfile.k8s -t usosweb-calendar:latest .
    echo Calendar zbudowany
) else (
    docker build -f modules\calendar\Dockerfile -t usosweb-calendar:latest .
    echo Calendar zbudowany (oryginalna wersja)
)

echo Budowanie Messaging...
if exist modules\messaging\Dockerfile.k8s (
    docker build -f modules\messaging\Dockerfile.k8s -t usosweb-messaging:latest .
    echo Messaging zbudowany
) else (
    docker build -f modules\messaging\Dockerfile -t usosweb-messaging:latest .
    echo Messaging zbudowany (oryginalna wersja)
)

echo Budowanie Common...
if exist modules\common\Dockerfile.k8s (
    docker build -f modules\common\Dockerfile.k8s -t usosweb-common:latest .
    echo Common zbudowany
) else (
    docker build -f modules\common\Dockerfile -t usosweb-common:latest .
    echo Common zbudowany (oryginalna wersja)
)

cd ..\..

REM Buduj frontend
echo Budowanie Frontend...
cd src\frontend
docker build -t usosweb-frontend:latest .
echo Frontend zbudowany
cd ..\..

echo Wdrazanie na Kubernetes...

REM Wdroz PostgreSQL
echo Wdrazanie PostgreSQL...
kubectl apply -f k8s\postgres.yaml

REM Wdroz backend serwisy
echo Wdrazanie API Gateway...
kubectl apply -f k8s\api-gateway.yaml

echo Wdrazanie Calendar...
kubectl apply -f k8s\calendar.yaml

echo Wdrazanie Messaging...
kubectl apply -f k8s\messaging.yaml

echo Wdrazanie Common...
kubectl apply -f k8s\common.yaml

REM Wdroz frontend
echo Wdrazanie Frontend...
kubectl apply -f k8s\frontend.yaml

echo Czekanie na gotowsc serwisow...

REM Czekaj na API Gateway
kubectl wait --for=condition=ready pod -l app=api-gateway -n usosweb --timeout=300s

echo Status wdrozenia:
kubectl get pods -n usosweb

echo.
echo Status serwisow:
kubectl get svc -n usosweb

echo.
echo Dostep do aplikacji:
echo Frontend:     http://localhost:30000
echo API Gateway:  http://localhost:30083
echo.
echo gRPC serwisy (wewnetrzne):
echo Calendar:     calendar-service:3001
echo Messaging:    messaging-service:3002
echo Common:       common-service:3003

echo.
echo Przydatne komendy:
echo   kubectl get pods -n usosweb                          # Status podow
echo   kubectl logs -f deployment/api-gateway -n usosweb    # Logi API Gateway
echo   kubectl logs -f deployment/calendar -n usosweb       # Logi Calendar
echo   kubectl logs -f deployment/messaging -n usosweb      # Logi Messaging
echo   kubectl logs -f deployment/common -n usosweb         # Logi Common
echo   kubectl logs -f deployment/frontend -n usosweb       # Logi Frontend

echo.
echo Wszystkie serwisy zostaly wdrozone! 