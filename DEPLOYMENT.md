# USOSWEB - Sposoby uruchomienia

## 1. Kubernetes (OrbStack/Docker Desktop)

```bash
# Uruchom całą aplikację
./scripts/deploy-all.sh

# Dostęp:
# Frontend: http://localhost:30000
# API Gateway: http://localhost:30083
```

**Porty w Kubernetes:**
- Frontend: NodePort `30000`
- API Gateway: NodePort `30083` → wewnętrzny `8083`
- Serwisy gRPC: wewnętrzne `3001`, `3002`, `3003`

---

## 2. Docker Compose (lokalne środowisko)

```bash
# Uruchom przez docker-compose
make up

# Dostęp:
# Frontend: http://localhost:3000
# API Gateway: http://localhost:8083
```

**Porty w Docker Compose:**
- Frontend: `3000:3000`
- API Gateway: `8083:8083`
- Calendar: `3001:3001`
- Messaging: `3002:3002`
- Common: `3004:3003`

---

## 3. Zmienne środowiskowe

Frontend automatycznie dostosowuje się do środowiska:

### Kubernetes
```yaml
env:
- name: NEXT_PUBLIC_API_URL
  value: "http://localhost:30083"
```

### Docker Compose
```yaml
environment:
- NEXT_PUBLIC_API_URL=http://localhost:8083
```

### Lokalne uruchomienie
```bash
# Utwórz .env.local w src/frontend/
echo "NEXT_PUBLIC_API_URL=http://localhost:8083" > src/frontend/.env.local
```

---

## 4. Fallback

Jeśli nie ustawisz zmiennej środowiskowej, frontend używa:
```javascript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8083";
```

Domyślnie łączy się z `localhost:8083` (docker-compose).

---

## 5. Szybki wybór

| Środowisko | Komenda | Frontend | API Gateway |
|------------|---------|----------|-------------|
| **Kubernetes** | `./scripts/deploy-all.sh` | `:30000` | `:30083` |
| **Docker Compose** | `make up` | `:3000` | `:8083` |
| **Lokalny dev** | `npm run dev` | `:3000` | `:8083` |

## 6. Troubleshooting

### Frontend nie łączy się z API
```bash
# Sprawdź zmienną środowiskową
echo $NEXT_PUBLIC_API_URL

# W przeglądarce sprawdź DevTools → Network
# Zobaczysz do jakiego URL frontend się łączy
```

### Różne porty w różnych środowiskach
To jest normalne! Kubernetes używa NodePort `30083`, Docker Compose używa `8083`.
Frontend automatycznie wybiera właściwy port dzięki zmiennej środowiskowej.

---

## 7. Windows Support

### Windows Batch (.bat)
```cmd
REM Kubernetes
scripts\deploy-all.bat
scripts\k8s-clean.bat

REM Docker Compose  
scripts\docker-up.bat
scripts\docker-down.bat

REM Database
scripts\db-build.bat
scripts\db-reset.bat
```

### PowerShell (.ps1)
```powershell
# Kubernetes (z kolorami)
.\scripts\deploy-all.ps1

# Sprawdź execution policy jeśli jest błąd:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Make na Windows
```cmd
REM Zobacz dostępne komendy Windows
make help

REM Użyj Windows-specific commands
make windows-deploy
make windows-db-build
make windows-docker-up
```

### Rozwiązywanie problemów Windows

**Problem: `timeout` command not found**
✅ **Rozwiązane**: Skrypty .bat używają wbudowanego `timeout`

**Problem: Forward slash vs backslash**
✅ **Rozwiązane**: Skrypty używają Windows-style paths (`\`)

**Problem: Make nie działa**
✅ **Alternatywa**: Użyj skryptów `.bat` lub `.ps1`

**Problem: PowerShell execution policy**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 8. Podsumowanie dla różnych OS

| OS | Zalecana metoda | Alternatywy |
|---|---|---|
| **macOS/Linux** | `./scripts/deploy-all.sh` | `make k8s-deploy` |
| **Windows** | `scripts\deploy-all.bat` | `.\scripts\deploy-all.ps1`, `make windows-deploy` | 