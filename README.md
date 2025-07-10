# USOSWEB - System Zarządzania Uczelnią

## 🚀 Wybierz swoją platformę

### 🍎 macOS / 🐧 Linux
**[📖 Instrukcja dla Unix/Linux/macOS →](README-UNIX.md)**

Skrypty bash, make, standardowe narzędzia Unix.

```bash
# Szybki start
./scripts/deploy-all.sh
```

---

### 🪟 Windows
**[📖 Instrukcja dla Windows →](README-WINDOWS.md)**

Skrypty .bat, PowerShell, wsparcie dla Windows.

```cmd
REM Szybki start
scripts\deploy-all.bat
```

---

## 📋 Co to jest USOSWEB?

System zarządzania uczelnią zbudowany w architekturze mikrousług:

- **Frontend**: Next.js (React)
- **Backend**: Go (gRPC + HTTP)
- **Baza danych**: PostgreSQL
- **Deployment**: Docker + Kubernetes

### Serwisy:
- **API Gateway** - główny punkt wejścia HTTP/REST
- **Calendar** - zarządzanie kalendarzem akademickim
- **Messaging** - system wiadomości
- **Common** - uwierzytelnianie i wspólne funkcje

### Środowiska:
- **Docker Compose** - rozwój lokalny
- **Kubernetes** - produkcja/staging

---

## 🛠 Wymagania

### Podstawowe (wszystkie platformy):
- Docker Desktop / OrbStack
- Git

### Kubernetes (opcjonalnie):
- kubectl
- Kubernetes włączony w Docker Desktop

### Specyficzne dla platformy:

**macOS/Linux:**
- bash
- make (zazwyczaj preinstalowany)

**Windows:**
- cmd.exe (wbudowany)
- PowerShell (opcjonalnie, dla ładniejszego outputu)

---

## 🎯 Architektura

```
Frontend (Next.js)
    ↓ HTTP
API Gateway (Go)
    ↓ gRPC
┌─────────────────────────────────┐
│ Calendar │ Messaging │ Common  │
└─────────────────────────────────┘
    ↓ SQL
PostgreSQL
```

### Porty:

**Docker Compose:**
- Frontend: http://localhost:3000
- API Gateway: http://localhost:8083

**Kubernetes:**
- Frontend: http://localhost:30000
- API Gateway: http://localhost:30083

---

## 📚 Dokumentacja

- **[Instrukcje Unix/Linux/macOS](README-UNIX.md)**
- **[Instrukcje Windows](README-WINDOWS.md)**
- **[Szczegóły deploymentu](DEPLOYMENT.md)**

---

## 🆘 Szybka pomoc

### Problem z portami?
Frontend automatycznie dostosowuje się do środowiska przez zmienną `NEXT_PUBLIC_API_URL`.

### Problem z połączeniem?
Sprawdź czy Docker/Kubernetes działa:
```bash
# Unix/Linux/macOS
docker --version && kubectl cluster-info

# Windows  
docker --version && kubectl cluster-info
```

### Chcesz dopiero zacząć?
1. Wybierz swoją platformę powyżej
2. Przejdź do odpowiedniej instrukcji
3. Uruchom szybki start

---

**Miłego kodowania! 🎉** 