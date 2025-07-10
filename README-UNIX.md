# USOSWEB - Instrukcja dla macOS/Linux/Unix

## 🚀 Szybki start

### Metoda 1: Kubernetes (zalecane)
```bash
# Sprawdź czy Kubernetes działa
kubectl cluster-info

# Uruchom całą aplikację
./scripts/deploy-all.sh

# Dostęp:
# Frontend: http://localhost:30000
# API Gateway: http://localhost:30083
```

### Metoda 2: Docker Compose (lokalne środowisko)
```bash
# Zbuduj i uruchom bazę danych
make db-build

# Uruchom wszystkie serwisy
make up

# Dostęp:
# Frontend: http://localhost:3000  
# API Gateway: http://localhost:8083
```

---

## 📋 Wymagania

- **Docker Desktop** lub **OrbStack** 
- **kubectl** (dla Kubernetes)
- **make** (zazwyczaj preinstalowany)
- **bash** (zazwyczaj preinstalowany)
- **Git**

### Sprawdzenie wymagań:
```bash
docker --version
kubectl version --client
make --version
git --version
```

---

## 🎯 Komendy Make

### Docker Compose
```bash
make build          # Zbuduj wszystkie serwisy
make up              # Uruchom aplikację
make down            # Zatrzymaj aplikację

# Poszczególne serwisy
make postgres-up     # Tylko PostgreSQL
make frontend-up     # Tylko frontend
make api-gateway-up  # Tylko API Gateway
```

### Baza danych
```bash
make db-build        # Zbuduj i wypełnij bazę danych
make db-reset        # Zresetuj bazę danych
make db-seed         # Tylko wypełnij danymi
make migrate         # Uruchom migracje
```

### Kubernetes
```bash
make k8s-deploy      # Wdróż na Kubernetes
make k8s-status      # Status podów i serwisów
make k8s-clean       # Usuń namespace
```

---

## 🔧 Skrypty bash

### Kubernetes
```bash
./scripts/deploy-all.sh       # Kompletne wdrożenie
./scripts/scale-services.sh   # Skalowanie serwisów
```

**Przykłady skalowania:**
```bash
./scripts/scale-services.sh calendar 3      # 3 pody Calendar
./scripts/scale-services.sh api-gateway 2   # 2 pody API Gateway
./scripts/scale-services.sh messaging 1     # Powrót do 1 poda
```

---

## 📊 Monitorowanie

### Status aplikacji
```bash
# Kubernetes
kubectl get pods -n usosweb
kubectl get svc -n usosweb
kubectl get endpoints -n usosweb

# Docker Compose
docker-compose ps
docker-compose logs
```

### Logi w czasie rzeczywistym
```bash
# Kubernetes
kubectl logs -f deployment/api-gateway -n usosweb
kubectl logs -f deployment/frontend -n usosweb
kubectl logs -f deployment/calendar -n usosweb
kubectl logs -f deployment/messaging -n usosweb
kubectl logs -f deployment/common -n usosweb
kubectl logs -f deployment/postgres -n usosweb

# Docker Compose
docker-compose logs -f api-gateway
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Restart serwisów
```bash
# Kubernetes
kubectl rollout restart deployment/api-gateway -n usosweb
kubectl rollout restart deployment/frontend -n usosweb

# Docker Compose
docker-compose restart api-gateway
docker-compose restart frontend
```

---

## 🌐 Dostęp do aplikacji

### Kubernetes
- **Frontend**: http://localhost:30000
- **API Gateway**: http://localhost:30083
- **PostgreSQL**: localhost:5432 (wewnętrzny)

### Docker Compose
- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:8083
- **PostgreSQL**: localhost:5433 (mapowany z 5432)

---

## 🧹 Czyszczenie

### Zatrzymanie
```bash
# Kubernetes
kubectl delete namespace usosweb

# Docker Compose
make down
# lub
docker-compose down
```

### Usunięcie obrazów Docker
```bash
# Usuń obrazy USOSWEB
docker rmi usosweb-api-gateway:latest
docker rmi usosweb-calendar:latest
docker rmi usosweb-messaging:latest
docker rmi usosweb-common:latest
docker rmi usosweb-frontend:latest

# Usuń wszystkie nieużywane obrazy
docker image prune -a
```

### Pełne czyszczenie
```bash
# Zatrzymaj wszystko
make down
kubectl delete namespace usosweb

# Usuń volumes
docker-compose down -v

# Usuń obrazy
docker image prune -a
```

---

## ⚠ Troubleshooting

### Problem: "make: command not found"
```bash
# macOS
xcode-select --install

# Ubuntu/Debian
sudo apt-get install build-essential

# CentOS/RHEL
sudo yum groupinstall "Development Tools"
```

### Problem: "kubectl: command not found"
```bash
# macOS
brew install kubectl

# Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

### Problem: PostgreSQL nie startuje w make db-build
```bash
# Sprawdź logi
docker-compose logs postgres

# Wymuszenie rebuildu
docker-compose down -v
make db-build
```

### Problem: Port już używany
```bash
# Sprawdź co używa portu
lsof -i :3000    # Frontend
lsof -i :8083    # API Gateway
lsof -i :5433    # PostgreSQL

# Zatrzymaj konfliktujące usługi
sudo kill -9 <PID>
```

### Problem: Obrazy Docker nie budują się
```bash
# Wyczyść cache Docker
docker system prune -a

# Sprawdź miejsce na dysku
df -h
docker system df
```

### Problem: Frontend nie łączy się z API
```bash
# Sprawdź zmienną środowiskową
echo $NEXT_PUBLIC_API_URL

# W przeglądarce otwórz DevTools → Network
# Zobaczysz do jakiego URL frontend się łączy
```

---

## 💡 Przydatne komendy

### Debug
```bash
# Sprawdź szczegóły poda
kubectl describe pod <pod-name> -n usosweb

# Połącz się z kontenerem
kubectl exec -it <pod-name> -n usosweb -- sh

# Docker Compose debug
docker-compose exec api-gateway sh
```

### Wydajność
```bash
# Użycie zasobów Kubernetes
kubectl top pods -n usosweb
kubectl top nodes

# Docker stats
docker stats
```

### Backup bazy danych
```bash
# Kubernetes
kubectl exec deployment/postgres -n usosweb -- pg_dump -U postgres usosweb > backup.sql

# Docker Compose
docker-compose exec postgres pg_dump -U postgres mydb > backup.sql
```

---

## 📚 Więcej informacji

- **[Szczegóły deploymentu](DEPLOYMENT.md)**
- **[Instrukcje Windows](README-WINDOWS.md)**
- **[Główny README](README.md)**

---

**Happy coding! 🚀** 