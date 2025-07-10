#!/bin/bash

set -e

echo "Wdrazanie calej aplikacji USOSWEB na OrbStack Kubernetes"
echo "========================================================="

# Sprawdz czy kubectl dziala
if ! kubectl cluster-info > /dev/null 2>&1; then
    echo "BLAD: Kubernetes nie jest dostepny. Sprawdz czy OrbStack dziala."
    exit 1
fi

echo "Kubernetes cluster dostepny"

# Sprawdz czy namespace istnieje
if ! kubectl get namespace usosweb > /dev/null 2>&1; then
    echo "Tworzenie namespace..."
    kubectl apply -f k8s/namespace.yaml
fi

echo "Budowanie obrazow Docker..."

# Buduj backend
cd src/backend

echo "Budowanie API Gateway..."
if [ -f modules/api-gateway/Dockerfile.k8s ]; then
    docker build -f modules/api-gateway/Dockerfile.k8s -t usosweb-api-gateway:latest .
    echo "API Gateway zbudowany"
else
    echo "BLAD: Nie znaleziono Dockerfile.k8s dla API Gateway"
fi

echo "Budowanie Calendar..."
if [ -f modules/calendar/Dockerfile.k8s ]; then
    docker build -f modules/calendar/Dockerfile.k8s -t usosweb-calendar:latest .
    echo "Calendar zbudowany"
else
    docker build -f modules/calendar/Dockerfile -t usosweb-calendar:latest .
    echo "Calendar zbudowany (oryginalna wersja)"
fi

echo "Budowanie Messaging..."
if [ -f modules/messaging/Dockerfile.k8s ]; then
    docker build -f modules/messaging/Dockerfile.k8s -t usosweb-messaging:latest .
    echo "Messaging zbudowany"
else
    docker build -f modules/messaging/Dockerfile -t usosweb-messaging:latest .
    echo "Messaging zbudowany (oryginalna wersja)"
fi

echo "Budowanie Common..."
if [ -f modules/common/Dockerfile.k8s ]; then
    docker build -f modules/common/Dockerfile.k8s -t usosweb-common:latest .
    echo "Common zbudowany"
else
    docker build -f modules/common/Dockerfile -t usosweb-common:latest .
    echo "Common zbudowany (oryginalna wersja)"
fi

cd ../..

# Buduj frontend
echo "Budowanie Frontend..."
cd src/frontend
docker build -t usosweb-frontend:latest .
echo "Frontend zbudowany"
cd ../..

echo "Wdrazanie na Kubernetes..."

# Wdroz PostgreSQL
echo "Wdrazanie PostgreSQL..."
kubectl apply -f k8s/postgres.yaml

# Wdroz backend serwisy
echo "Wdrazanie API Gateway..."
kubectl apply -f k8s/api-gateway.yaml

echo "Wdrazanie Calendar..."
kubectl apply -f k8s/calendar.yaml

echo "Wdrazanie Messaging..."
kubectl apply -f k8s/messaging.yaml

echo "Wdrazanie Common..."
kubectl apply -f k8s/common.yaml

# Wdroz frontend
echo "Wdrazanie Frontend..."
kubectl apply -f k8s/frontend.yaml

echo "Czekanie na gotowsc serwisow..."

# Czekaj na API Gateway
kubectl wait --for=condition=ready pod -l app=api-gateway -n usosweb --timeout=300s

echo "Status wdrozenia:"
kubectl get pods -n usosweb

echo ""
echo "Status serwisow:"
kubectl get svc -n usosweb

echo ""
echo "Dostep do aplikacji:"
echo "Frontend:     http://localhost:30000"
echo "API Gateway:  http://localhost:30083"
echo ""
echo "gRPC serwisy (wewnetrzne):"
echo "Calendar:     calendar-service:3001"
echo "Messaging:    messaging-service:3002"
echo "Common:       common-service:3003"

echo ""
echo "Przydatne komendy:"
echo "  kubectl get pods -n usosweb                          # Status podow"
echo "  kubectl logs -f deployment/api-gateway -n usosweb    # Logi API Gateway"
echo "  kubectl logs -f deployment/calendar -n usosweb       # Logi Calendar"
echo "  kubectl logs -f deployment/messaging -n usosweb      # Logi Messaging"
echo "  kubectl logs -f deployment/common -n usosweb         # Logi Common"
echo "  kubectl logs -f deployment/frontend -n usosweb       # Logi Frontend"

echo ""
echo "Wszystkie serwisy zostaly wdrozone!" 