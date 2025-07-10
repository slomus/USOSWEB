# PowerShell script for Windows
Write-Host "Wdrazanie calej aplikacji USOSWEB na Kubernetes (PowerShell)" -ForegroundColor Green
Write-Host "=============================================================="

# Sprawdz czy kubectl dziala
try {
    kubectl cluster-info | Out-Null
    Write-Host "Kubernetes cluster dostepny" -ForegroundColor Green
} catch {
    Write-Host "BLAD: Kubernetes nie jest dostepny. Sprawdz czy Docker Desktop dziala." -ForegroundColor Red
    exit 1
}

# Sprawdz czy namespace istnieje
$namespaceExists = kubectl get namespace usosweb 2>$null
if (-not $namespaceExists) {
    Write-Host "Tworzenie namespace..." -ForegroundColor Yellow
    kubectl apply -f k8s/namespace.yaml
}

Write-Host "Budowanie obrazow Docker..." -ForegroundColor Cyan

# Buduj backend
Set-Location src\backend

Write-Host "Budowanie API Gateway..." -ForegroundColor Yellow
if (Test-Path "modules\api-gateway\Dockerfile.k8s") {
    docker build -f modules\api-gateway\Dockerfile.k8s -t usosweb-api-gateway:latest .
    Write-Host "API Gateway zbudowany" -ForegroundColor Green
} else {
    Write-Host "BLAD: Nie znaleziono Dockerfile.k8s dla API Gateway" -ForegroundColor Red
}

Write-Host "Budowanie Calendar..." -ForegroundColor Yellow
if (Test-Path "modules\calendar\Dockerfile.k8s") {
    docker build -f modules\calendar\Dockerfile.k8s -t usosweb-calendar:latest .
    Write-Host "Calendar zbudowany" -ForegroundColor Green
} else {
    docker build -f modules\calendar\Dockerfile -t usosweb-calendar:latest .
    Write-Host "Calendar zbudowany (oryginalna wersja)" -ForegroundColor Green
}

Write-Host "Budowanie Messaging..." -ForegroundColor Yellow
if (Test-Path "modules\messaging\Dockerfile.k8s") {
    docker build -f modules\messaging\Dockerfile.k8s -t usosweb-messaging:latest .
    Write-Host "Messaging zbudowany" -ForegroundColor Green
} else {
    docker build -f modules\messaging\Dockerfile -t usosweb-messaging:latest .
    Write-Host "Messaging zbudowany (oryginalna wersja)" -ForegroundColor Green
}

Write-Host "Budowanie Common..." -ForegroundColor Yellow
if (Test-Path "modules\common\Dockerfile.k8s") {
    docker build -f modules\common\Dockerfile.k8s -t usosweb-common:latest .
    Write-Host "Common zbudowany" -ForegroundColor Green
} else {
    docker build -f modules\common\Dockerfile -t usosweb-common:latest .
    Write-Host "Common zbudowany (oryginalna wersja)" -ForegroundColor Green
}

Set-Location ..\..

# Buduj frontend
Write-Host "Budowanie Frontend..." -ForegroundColor Yellow
Set-Location src\frontend
docker build -t usosweb-frontend:latest .
Write-Host "Frontend zbudowany" -ForegroundColor Green
Set-Location ..\..

Write-Host "Wdrazanie na Kubernetes..." -ForegroundColor Cyan

# Wdroz serwisy
Write-Host "Wdrazanie PostgreSQL..." -ForegroundColor Yellow
kubectl apply -f k8s\postgres.yaml

Write-Host "Wdrazanie API Gateway..." -ForegroundColor Yellow
kubectl apply -f k8s\api-gateway.yaml

Write-Host "Wdrazanie Calendar..." -ForegroundColor Yellow
kubectl apply -f k8s\calendar.yaml

Write-Host "Wdrazanie Messaging..." -ForegroundColor Yellow
kubectl apply -f k8s\messaging.yaml

Write-Host "Wdrazanie Common..." -ForegroundColor Yellow
kubectl apply -f k8s\common.yaml

Write-Host "Wdrazanie Frontend..." -ForegroundColor Yellow
kubectl apply -f k8s\frontend.yaml

Write-Host "Czekanie na gotowsc serwisow..." -ForegroundColor Yellow
kubectl wait --for=condition=ready pod -l app=api-gateway -n usosweb --timeout=300s

Write-Host "`nStatus wdrozenia:" -ForegroundColor Cyan
kubectl get pods -n usosweb

Write-Host "`nStatus serwisow:" -ForegroundColor Cyan  
kubectl get svc -n usosweb

Write-Host "`nDostep do aplikacji:" -ForegroundColor Green
Write-Host "Frontend:     http://localhost:30000" -ForegroundColor White
Write-Host "API Gateway:  http://localhost:30083" -ForegroundColor White

Write-Host "`nWszystkie serwisy zostaly wdrozone!" -ForegroundColor Green 