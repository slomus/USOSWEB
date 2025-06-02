# USOSWEB - Szybki start

## Checklist

### Przed uruchomieniem
- [ ] OrbStack lub Docker Desktop z Kubernetes włączony
- [ ] kubectl zainstalowany
- [ ] Jesteś w katalogu głównym projektu

### Uruchomienie
1. **Sprawdź Kubernetes**
   ```bash
   kubectl cluster-info
   ```

2. **Uruchom aplikację**
   ```bash
   ./scripts/deploy-all.sh
   ```

3. **Sprawdź status**
   ```bash
   kubectl get pods -n usosweb
   ```

### Dostęp
- Frontend: http://localhost:30000
- API: http://localhost:30083

### Skalowanie
```bash
./scripts/scale-services.sh calendar 2
```

### Czyszczenie
```bash
kubectl delete namespace usosweb
```

## Struktura serwisów

```
API Gateway (30083) 
    ↓ gRPC
Common (3003) ←─── Auth/Hello
    ↓ DB
PostgreSQL (5432)

Frontend (30000)
    ↓ HTTP
API Gateway (30083)

Calendar (3001) ←─── gRPC (w przyszłości)
Messaging (3002) ←─── gRPC (w przyszłości)
``` 