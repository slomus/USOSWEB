# USOSWEB - Instrukcja dla Windows

## 🚀 Szybki start

### Metoda 1: Kubernetes (zalecane)
```cmd
REM Sprawdź czy Kubernetes działa
kubectl cluster-info

REM Uruchom całą aplikację
scripts\deploy-all.bat

REM Dostęp:
REM Frontend: http://localhost:30000
REM API Gateway: http://localhost:30083
```

### Metoda 2: Docker Compose (lokalne środowisko)
```cmd
REM Zbuduj i uruchom bazę danych
scripts\db-build.bat

REM Uruchom wszystkie serwisy
scripts\docker-up.bat

REM Dostęp:
REM Frontend: http://localhost:3000  
REM API Gateway: http://localhost:8083
```

---

## 📋 Wymagania

- **Docker Desktop** (z włączonym Kubernetes dla K8s)
- **Git for Windows**
- **cmd.exe** (wbudowany)
- **PowerShell** (opcjonalnie, dla ładniejszego outputu)

### Sprawdzenie wymagań:
```cmd
docker --version
kubectl version --client
git --version
```

---

## 🎯 Skrypty Windows (.bat)

### Kubernetes
```cmd
scripts\deploy-all.bat     REM Kompletne wdrożenie K8s
scripts\k8s-clean.bat     REM Usuń namespace K8s
```

### Docker Compose
```cmd
scripts\docker-up.bat      REM Uruchom aplikację
scripts\docker-down.bat    REM Zatrzymaj aplikację
```

### Baza danych
```cmd
scripts\db-build.bat       REM Zbuduj i wypełnij bazę
scripts\db-reset.bat       REM Zresetuj bazę danych
```

---

## 💫 PowerShell (.ps1) - z kolorami

### Kubernetes
```powershell
# Uruchom z ładnymi kolorami
.\scripts\deploy-all.ps1

# Jeśli błąd execution policy:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 🔨 Make dla Windows

Jeśli masz zainstalowany make (np. przez Git Bash):

```cmd
REM Zobacz dostępne komendy Windows
make help

REM Użyj Windows-specific commands
make windows-deploy       REM = scripts\deploy-all.bat
make windows-db-build     REM = scripts\db-build.bat
make windows-docker-up    REM = scripts\docker-up.bat
make windows-docker-down  REM = scripts\docker-down.bat
make windows-k8s-clean    REM = scripts\k8s-clean.bat
```

---

## 📊 Monitorowanie

### Status aplikacji
```cmd
REM Kubernetes
kubectl get pods -n usosweb
kubectl get svc -n usosweb
kubectl get endpoints -n usosweb

REM Docker Compose
docker-compose ps
docker-compose logs
```

### Logi w czasie rzeczywistym
```cmd
REM Kubernetes - logi poszczególnych serwisów
kubectl logs -f deployment/api-gateway -n usosweb
kubectl logs -f deployment/frontend -n usosweb
kubectl logs -f deployment/calendar -n usosweb
kubectl logs -f deployment/messaging -n usosweb
kubectl logs -f deployment/common -n usosweb
kubectl logs -f deployment/postgres -n usosweb

REM Docker Compose
docker-compose logs -f api-gateway
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Restart serwisów
```cmd
REM Kubernetes
kubectl rollout restart deployment/api-gateway -n usosweb
kubectl rollout restart deployment/frontend -n usosweb

REM Docker Compose
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

## ⚖ Skalowanie (tylko Kubernetes)

```cmd
REM Zwiększ ilość podów Calendar do 3
scripts\scale-services.bat calendar 3

REM Zwiększ ilość podów API Gateway do 2  
scripts\scale-services.bat api-gateway 2

REM Powróć do 1 poda
scripts\scale-services.bat messaging 1
```

**Uwaga:** Plik `scale-services.bat` trzeba utworzyć lub użyć:
```cmd
kubectl scale deployment calendar --replicas=3 -n usosweb
kubectl scale deployment api-gateway --replicas=2 -n usosweb
```

---

## 🧹 Czyszczenie

### Zatrzymanie
```cmd
REM Kubernetes
scripts\k8s-clean.bat
REM lub bezpośrednio:
kubectl delete namespace usosweb

REM Docker Compose
scripts\docker-down.bat
REM lub bezpośrednio:
docker-compose down --remove-orphans
```

### Usunięcie obrazów Docker
```cmd
REM Usuń obrazy USOSWEB
docker rmi usosweb-api-gateway:latest
docker rmi usosweb-calendar:latest
docker rmi usosweb-messaging:latest
docker rmi usosweb-common:latest
docker rmi usosweb-frontend:latest

REM Usuń wszystkie nieużywane obrazy
docker image prune -a
```

### Pełne czyszczenie
```cmd
REM Zatrzymaj wszystko
scripts\docker-down.bat
scripts\k8s-clean.bat

REM Usuń volumes
docker-compose down -v

REM Usuń obrazy
docker image prune -a
```

---

## ⚠ Troubleshooting Windows

### Problem: "timeout command not found"
✅ **Rozwiązane**: Skrypty `.bat` używają Windows `timeout /t 3`

### Problem: "Forward slash vs backslash"
✅ **Rozwiązane**: Skrypty używają Windows paths (`scripts\file.bat`)

### Problem: "Make nie działa"
**Rozwiązania:**
1. Użyj skryptów `.bat`: `scripts\deploy-all.bat`
2. Zainstaluj make przez Chocolatey: `choco install make`
3. Użyj Git Bash (ma wbudowany make)

### Problem: PowerShell execution policy
```powershell
# Sprawdź obecną policy
Get-ExecutionPolicy

# Ustaw dla bieżącego użytkownika
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Lub jednorazowo
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-all.ps1
```

### Problem: PostgreSQL nie startuje w db-build
```cmd
REM Sprawdź logi
docker-compose logs postgres

REM Wymuszenie rebuildu
docker-compose down -v
scripts\db-build.bat
```

### Problem: Port już używany
```cmd
REM Sprawdź co używa portu
netstat -ano | findstr :3000     REM Frontend
netstat -ano | findstr :8083     REM API Gateway
netstat -ano | findstr :5433     REM PostgreSQL

REM Zatrzymaj proces (znajdź PID z powyższego polecenia)
taskkill /PID <PID> /F
```

### Problem: Docker Desktop nie działa
1. Sprawdź czy Docker Desktop jest uruchomiony
2. Restart Docker Desktop
3. W ustawieniach włącz Kubernetes
4. Sprawdź: `docker version` i `kubectl version`

### Problem: Długie ścieżki Windows
```cmd
REM Włącz obsługę długich ścieżek (jako Administrator)
gpedit.msc
REM Computer Configuration > Administrative Templates > System > Filesystem > Enable Win32 long paths
```

### Problem: Antywirus blokuje Docker
1. Dodaj katalog projektu do wyjątków antywirusa
2. Dodaj Docker Desktop do wyjątków
3. Tymczasowo wyłącz real-time protection

---

## 💡 Przydatne komendy Windows

### Debug
```cmd
REM Sprawdź szczegóły poda
kubectl describe pod <pod-name> -n usosweb

REM Połącz się z kontenerem (Windows/PowerShell)
kubectl exec -it <pod-name> -n usosweb -- cmd

REM Docker Compose debug
docker-compose exec api-gateway cmd
```

### Wydajność
```cmd
REM Użycie zasobów Kubernetes
kubectl top pods -n usosweb
kubectl top nodes

REM Docker stats
docker stats
```

### Backup bazy danych
```cmd
REM Kubernetes
kubectl exec deployment/postgres -n usosweb -- pg_dump -U postgres usosweb > backup.sql

REM Docker Compose
docker-compose exec postgres pg_dump -U postgres mydb > backup.sql
```

### PowerShell Aliasy (opcjonalnie)
```powershell
# Dodaj do swojego PowerShell profile
Set-Alias k kubectl
Set-Alias dc docker-compose

# Użycie
k get pods -n usosweb
dc ps
```

---

## 🔧 Instalacja narzędzi Windows

### Docker Desktop
1. Pobierz z https://www.docker.com/products/docker-desktop
2. Zainstaluj i uruchom
3. W Settings włącz Kubernetes
4. Sprawdź: `docker version` i `kubectl version`

### Git for Windows
1. Pobierz z https://git-scm.com/download/win
2. Podczas instalacji wybierz "Git Bash Here"
3. Sprawdź: `git --version`

### Chocolatey (opcjonalnie)
```cmd
REM Uruchom PowerShell jako Administrator
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

REM Zainstaluj make (opcjonalnie)
choco install make
```

---

## 📚 Więcej informacji

- **[Szczegóły deploymentu](DEPLOYMENT.md)**
- **[Instrukcje Unix/Linux/macOS](README-UNIX.md)**
- **[Główny README](README.md)**

---

**Happy coding on Windows! 🪟🚀** 