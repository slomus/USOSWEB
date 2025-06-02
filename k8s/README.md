# USOSWEB - Instrukcja uruchomienia

## Wymagania

1. **OrbStack** lub **Docker Desktop** z włączonym Kubernetes
2. **kubectl** zainstalowany i skonfigurowany
3. **Docker** do budowania obrazów

## Sprawdzenie gotowości

Sprawdź czy Kubernetes działa:
```bash
kubectl cluster-info
```

## Uruchomienie aplikacji

### Krok 1: Uruchom cała aplikację jednym poleceniem
```bash
./scripts/deploy-all.sh
```

Ten skrypt:
- Sprawdzi czy Kubernetes działa
- Zbuduje wszystkie obrazy Docker (backend + frontend)
- Wdroży wszystkie serwisy na Kubernetes
- Pokaże status wdrożenia

### Krok 2: Sprawdź czy wszystko działa
```bash
kubectl get pods -n usosweb
```

Wszystkie pody powinny mieć status `Running`.

## Dostęp do aplikacji

Po uruchomieniu aplikacja będzie dostępna pod:

- **Frontend**: http://localhost:30000
- **API Gateway**: http://localhost:30083

## Przydatne komendy

### Status aplikacji
```bash
# Status wszystkich podów
kubectl get pods -n usosweb

# Status serwisów
kubectl get svc -n usosweb

# Szczegóły konkretnego poda
kubectl describe pod <nazwa-poda> -n usosweb
```

### Logi
```bash
# Logi API Gateway
kubectl logs -f deployment/api-gateway -n usosweb

# Logi Frontend
kubectl logs -f deployment/frontend -n usosweb

# Logi Calendar
kubectl logs -f deployment/calendar -n usosweb

# Logi Messaging
kubectl logs -f deployment/messaging -n usosweb

# Logi Common
kubectl logs -f deployment/common -n usosweb

# Logi PostgreSQL
kubectl logs -f deployment/postgres -n usosweb
```

### Skalowanie serwisów
```bash
# Zwiększ ilość podów Calendar do 3
./scripts/scale-services.sh calendar 3

# Zwiększ ilość podów API Gateway do 2
./scripts/scale-services.sh api-gateway 2

# Powróć do 1 poda
./scripts/scale-services.sh calendar 1
```

### Restart serwisu
```bash
# Restart konkretnego serwisu
kubectl rollout restart deployment/api-gateway -n usosweb
kubectl rollout restart deployment/frontend -n usosweb
```

### Czyszczenie
```bash
# Usuń wszystkie serwisy
kubectl delete namespace usosweb

# Usuń obrazy Docker (opcjonalnie)
docker rmi usosweb-api-gateway:latest
docker rmi usosweb-calendar:latest
docker rmi usosweb-messaging:latest
docker rmi usosweb-common:latest
docker rmi usosweb-frontend:latest
```

## Architektura portów

### Porty zewnętrzne (dostęp z hosta)
- Frontend: `30000`
- API Gateway HTTP: `30083`

### Porty wewnętrzne (komunikacja między serwisami)
- Calendar gRPC: `3001`
- Messaging gRPC: `3002`
- Common gRPC: `3003`
- API Gateway gRPC: `9090`
- PostgreSQL: `5432`

## Troubleshooting

### Problem: Pod nie startuje
```bash
# Sprawdź szczegóły
kubectl describe pod <nazwa-poda> -n usosweb

# Sprawdź logi
kubectl logs <nazwa-poda> -n usosweb
```

### Problem: Serwis nie odpowiada
```bash
# Sprawdź czy serwis istnieje
kubectl get svc -n usosweb

# Sprawdź endpointy
kubectl get endpoints -n usosweb
```

### Problem: Błąd połączenia z bazą danych
```bash
# Sprawdź status PostgreSQL
kubectl get pods -l app=postgres -n usosweb

# Sprawdź logi PostgreSQL
kubectl logs -f deployment/postgres -n usosweb
```

### Problem: Obrazy Docker nie są dostępne
```bash
# Przebuduj obrazy
cd src/backend
docker build -f modules/api-gateway/Dockerfile.k8s -t usosweb-api-gateway:latest .
docker build -f modules/calendar/Dockerfile.k8s -t usosweb-calendar:latest .
docker build -f modules/messaging/Dockerfile.k8s -t usosweb-messaging:latest .
docker build -f modules/common/Dockerfile.k8s -t usosweb-common:latest .

cd ../frontend
docker build -t usosweb-frontend:latest .
```

## Struktura projektu

```
USOSWEB/
├── src/
│   ├── backend/
│   │   ├── modules/
│   │   │   ├── api-gateway/
│   │   │   ├── calendar/
│   │   │   ├── messaging/
│   │   │   └── common/
│   │   └── Database/
│   └── frontend/
├── k8s/
│   ├── namespace.yaml
│   ├── postgres.yaml
│   ├── api-gateway.yaml
│   ├── calendar.yaml
│   ├── messaging.yaml
│   ├── common.yaml
│   └── frontend.yaml
└── scripts/
    ├── deploy-all.sh
    └── scale-services.sh
``` 