# USOSWEB - Dokumentacja Techniczna

## Spis Treści

1. [Przegląd Systemu](#przegląd-systemu)
2. [Architektura](#architektura)
3. [Komponenty Systemu](#komponenty-systemu)
4. [Struktura Projektu](#struktura-projektu)
5. [Technologie](#technologie)
6. [Konfiguracja](#konfiguracja)
7. [Deployment](#deployment)
8. [Baza Danych](#baza-danych)
9. [API](#api)
10. [Bezpieczeństwo](#bezpieczeństwo)
11. [Rozwój i Utrzymanie](#rozwój-i-utrzymanie)

---

## Przegląd Systemu

USOSWEB to system zarządzania uczelnią wyższą zbudowany w architekturze mikrousług. System umożliwia zarządzanie studentami, wykładowcami, przedmiotami, zajęciami, ocenami, kalendarzem akademickim oraz komunikacją między użytkownikami.

### Główne Funkcjonalności

- Zarządzanie użytkownikami (studenci, wykładowcy, administratorzy)
- System uwierzytelniania i autoryzacji
- Zarządzanie przedmiotami i kursami
- System oceniania
- Kalendarz akademicki
- System wiadomości
- Zarządzanie podaniami
- Wyszukiwanie globalne
- Panel administracyjny

---

## Architektura

System wykorzystuje architekturę mikrousług z następującymi warstwami:

```
┌─────────────────────────────────────────┐
│         Frontend (Next.js)             │
│         Port: 3000/30000               │
└─────────────────┬───────────────────────┘
                  │ HTTP/REST
                  ↓
┌─────────────────────────────────────────┐
│         API Gateway (Go)                │
│         Port: 8083/30083                │
│         Metrics: 9090/31632             │
└─────┬───────────┬───────────┬───────────┘
      │ gRPC      │ gRPC      │ gRPC
      ↓           ↓           ↓
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Calendar │ │Messaging│ │  Common  │
│  :3001   │ │  :3002  │ │  :3003   │
└────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │
     └────────────┴────────────┘
                  │ SQL
                  ↓
         ┌────────────────┐
         │   PostgreSQL   │
         │     :5432      │
         └────────────────┘
                  │
         ┌────────────────┐
         │     Redis      │
         │     :6379      │
         └────────────────┘
```

### Przepływ Danych

1. Frontend wysyła żądania HTTP do API Gateway
2. API Gateway przekierowuje żądania do odpowiednich serwisów gRPC
3. Serwisy gRPC wykonują operacje na bazie danych PostgreSQL
4. Redis wykorzystywany jest do cache'owania i sesji
5. Wszystkie serwisy logują zdarzenia do wspólnego systemu logowania

---

## Komponenty Systemu

### Frontend

**Technologia:** Next.js 15.2.4, React 19, TypeScript, TailwindCSS 4

**Porty:**
- Docker Compose: 3000
- Kubernetes: 30000 (NodePort)

**Główne Moduły:**
- System uwierzytelniania (logowanie, rejestracja, reset hasła)
- Dashboard dla studentów, wykładowców i administratorów
- Kalendarz akademicki z integracją FullCalendar
- System wiadomości
- Zarządzanie ocenami
- Panel administracyjny
- Wyszukiwanie globalne
- Zarządzanie podaniami

**Struktura:**
```
src/frontend/
├── app/
│   ├── (main)/          # Główne strony aplikacji
│   │   ├── admin/       # Panel administracyjny
│   │   ├── calendar/    # Kalendarz
│   │   ├── marks/       # Oceny
│   │   ├── messages/    # Wiadomości
│   │   └── ...
│   ├── components/      # Komponenty React
│   ├── config/          # Konfiguracja API
│   └── hooks/           # React hooks
```

### API Gateway

**Technologia:** Go, gRPC Gateway

**Porty:**
- HTTP: 8083 (Docker Compose) / 30083 (Kubernetes NodePort)
- Metrics: 9090 (Docker Compose) / 31632 (Kubernetes NodePort)

**Funkcjonalności:**
- Routing HTTP do serwisów gRPC
- Obsługa CORS
- Middleware logowania
- Obsługa cookies dla sesji
- Metryki Prometheus
- Transformacja protobuf do JSON

**Konfiguracja:**
- Endpointy gRPC dla serwisów Calendar, Messaging, Common
- Konfiguracja CORS (dozwolone originy)
- JWT secret key
- Połączenia z bazą danych i Redis

### Common Service

**Technologia:** Go, gRPC

**Port:** 3003

**Funkcjonalności:**
- Uwierzytelnianie i autoryzacja (JWT)
- Zarządzanie użytkownikami
- Zarządzanie przedmiotami i kursami
- System oceniania
- Zarządzanie podaniami
- Wyszukiwanie globalne
- Zarządzanie zapisami na zajęcia

**Moduły:**
- `auth` - uwierzytelnianie, rejestracja, reset hasła
- `academic` - dane akademickie (wydziały, budynki)
- `course` - zarządzanie kursami i przedmiotami
- `grades` - system oceniania
- `applications` - zarządzanie podaniami
- `search` - wyszukiwanie globalne

### Calendar Service

**Technologia:** Go, gRPC

**Port:** 3001

**Funkcjonalności:**
- Zarządzanie kalendarzem akademickim
- Tworzenie i modyfikacja wydarzeń
- Integracja z systemem zajęć
- Zarządzanie sesjami egzaminacyjnymi

### Messaging Service

**Technologia:** Go, gRPC

**Port:** 3002

**Funkcjonalności:**
- System wiadomości między użytkownikami
- Obsługa załączników
- Powiadomienia email
- Zarządzanie konwersacjami

### Infrastruktura

**PostgreSQL**
- Wersja: 18
- Port: 5432 (wewnętrzny), 5433 (Docker Compose)
- Baza danych: usosweb/mydb
- Migracje: golang-migrate

**Redis**
- Wersja: 7-alpine
- Port: 6379
- Funkcje: cache, sesje, kolejki

---

## Struktura Projektu

```
USOSWEB/
├── src/
│   ├── backend/
│   │   ├── modules/
│   │   │   ├── api-gateway/      # API Gateway
│   │   │   ├── common/           # Common Service
│   │   │   ├── calendar/         # Calendar Service
│   │   │   └── messaging/        # Messaging Service
│   │   ├── database/
│   │   │   ├── migrations/       # Migracje bazy danych
│   │   │   └── seeds/            # Dane testowe
│   │   ├── pkg/                  # Wspólne pakiety
│   │   │   ├── cache/            # Implementacja cache (Redis)
│   │   │   ├── crypto/           # Funkcje kryptograficzne
│   │   │   ├── error/            # Obsługa błędów
│   │   │   ├── logger/           # System logowania
│   │   │   └── validation/       # Walidacja danych
│   │   ├── configs/               # Konfiguracja
│   │   └── scripts/               # Skrypty pomocnicze
│   └── frontend/
│       ├── app/                   # Next.js App Router
│       ├── components/            # Komponenty React
│       ├── config/                # Konfiguracja
│       └── public/                # Pliki statyczne
├── k8s/                           # Konfiguracja Kubernetes
│   ├── api-gateway.yaml
│   ├── calendar.yaml
│   ├── common.yaml
│   ├── messaging.yaml
│   ├── frontend.yaml
│   ├── postgres.yaml
│   ├── redis.yaml
│   ├── migrate.yaml
│   └── ingress.yml
├── scripts/                       # Skrypty deploymentu
├── docker-compose.yml             # Konfiguracja Docker Compose
├── Makefile                       # Automatyzacja zadań
└── DEPLOYMENT.md                  # Instrukcje deploymentu
```

---

## Technologie

### Backend

- **Go 1.23.0** - język programowania
- **gRPC** - komunikacja między serwisami
- **gRPC Gateway** - transformacja HTTP do gRPC
- **PostgreSQL** - baza danych relacyjna
- **Redis** - cache i sesje
- **JWT** - uwierzytelnianie
- **golang-migrate** - migracje bazy danych
- **logrus** - logowanie
- **bcrypt** - hashowanie haseł

### Frontend

- **Next.js 15.2.4** - framework React
- **React 19** - biblioteka UI
- **TypeScript** - typowanie statyczne
- **TailwindCSS 4** - stylowanie
- **FullCalendar** - komponent kalendarza
- **react-toastify** - powiadomienia
- **next-themes** - obsługa motywów (jasny/ciemny)

### Infrastruktura

- **Docker** - konteneryzacja
- **Docker Compose** - orkiestracja lokalna
- **Kubernetes** - orkiestracja produkcyjna
- **Traefik** - reverse proxy (K3s)
- **cert-manager** - zarządzanie certyfikatami SSL
- **Let's Encrypt** - certyfikaty SSL

---

## Konfiguracja

### Zmienne Środowiskowe

#### API Gateway

```env
DB_HOST=postgres-service
DB_PORT=5432
DB_NAME=usosweb
DB_USER=admin
DB_PASSWORD=<secret>
REDIS_HOST=redis-service
REDIS_PORT=6379
GRPC_COMMON_HOST=common-service
GRPC_COMMON_PORT=3003
GRPC_CALENDAR_HOST=calendar-service
GRPC_CALENDAR_PORT=3001
GRPC_MESSAGING_HOST=messaging-service
GRPC_MESSAGING_PORT=3002
ALLOWED_ORIGINS=https://asos.elmar.pro,http://localhost:3000
JWT_SECRET_KEY=<secret>
```

#### Common Service

```env
DB_HOST=postgres-service
DB_PORT=5432
DB_NAME=usosweb
DB_USER=admin
DB_PASSWORD=<secret>
REDIS_HOST=redis-service
REDIS_PORT=6379
CACHE_ENABLED=true
CACHE_DEFAULT_TTL=1h
EMAIL_APP_SECRET_KEY=<secret>
```

#### Frontend

```env
NEXT_PUBLIC_API_URL=http://localhost:8083
NODE_ENV=development
```

### Konfiguracja Kubernetes

Wszystkie serwisy używają ConfigMap do przechowywania zmiennych środowiskowych. Wrażliwe dane (hasła, klucze) przechowywane są w Secrets.

**ConfigMaps:**
- `api-gateway-config`
- `common-config`
- `calendar-config`
- `messaging-config`

**Secrets:**
- `postgres-secret` - hasło do bazy danych
- `ghcr-secret` - credentials do GitHub Container Registry

---

## Deployment

### Docker Compose (Środowisko Lokalne)

**Uruchomienie:**

```bash
# Budowanie i uruchomienie wszystkich serwisów
docker compose up -d --build

# Lub używając Makefile
make up
```

**Porty:**
- Frontend: http://localhost:3000
- API Gateway: http://localhost:8083
- PostgreSQL: localhost:5433
- Redis: localhost:6379

**Zatrzymanie:**

```bash
docker compose down
# Lub
make down
```

### Kubernetes (Produkcja/Staging)

**Wymagania:**
- kubectl
- Kubernetes cluster (K3s/Docker Desktop)
- cert-manager (dla SSL)

**Deployment:**

```bash
# Automatyczny deployment wszystkich komponentów
./scripts/deploy-all.sh

# Lub ręcznie:
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/migrate.yaml
kubectl apply -f k8s/common.yaml
kubectl apply -f k8s/calendar.yaml
kubectl apply -f k8s/messaging.yaml
kubectl apply -f k8s/api-gateway.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingres.yml
```

**Porty:**
- Frontend: http://localhost:30000 (NodePort)
- API Gateway: http://localhost:30083 (NodePort)
- Produkcja: https://asos.elmar.pro

**Status:**

```bash
kubectl get pods -n usosweb
kubectl get svc -n usosweb
kubectl get ingress -n usosweb
```

**Logi:**

```bash
kubectl logs -f deployment/<service-name> -n usosweb
```

### Migracje Bazy Danych

**Docker Compose:**

```bash
docker compose run --rm migrate up
```

**Kubernetes:**

```bash
kubectl apply -f k8s/migrate.yaml
kubectl logs -f job/migrate -n usosweb
```

---

## Baza Danych

### Schemat Bazy Danych

#### Główne Tabele

**users**
- `user_id` (SERIAL PRIMARY KEY) - unikalny identyfikator użytkownika
- `name` (VARCHAR(255)) - imię
- `surname` (VARCHAR(255)) - nazwisko
- `password` (VARCHAR(255)) - zahashowane hasło (bcrypt)
- `email` (VARCHAR(255)) - adres email (unikalny)
- `pesel` (VARCHAR(11)) - numer PESEL z walidacją (11 cyfr)
- `phone_nr` (VARCHAR(255)) - numer telefonu
- `postal_address` (VARCHAR(255)) - adres korespondencyjny
- `registration_address` (VARCHAR(255)) - adres zameldowania
- `bank_account_nr` (VARCHAR(26)) - numer konta bankowego
- `active` (BOOLEAN) - status aktywności (domyślnie TRUE)
- `activation_date` (TIMESTAMP) - data aktywacji
- `deactivation_date` (TIMESTAMP) - data deaktywacji
- `profile_photo_path` (VARCHAR(255)) - ścieżka do zdjęcia profilowego
- `profile_photo_mime_type` (VARCHAR(50)) - typ MIME zdjęcia

**students**
- `album_nr` (SERIAL PRIMARY KEY) - numer albumu studenta
- `user_id` (INTEGER REFERENCES users(user_id)) - powiązanie z użytkownikiem
- `course_id` (INTEGER REFERENCES courses(course_id)) - przypisany kurs
- `module_id` (INTEGER REFERENCES modules(module_id)) - przypisany moduł

**teaching_staff**
- `teaching_staff_id` (SERIAL PRIMARY KEY)
- `user_id` (INTEGER REFERENCES users(user_id))
- `degree` (VARCHAR(255)) - stopień naukowy (dr, prof., etc.)
- `title` (VARCHAR(255)) - tytuł (inż., mgr, etc.)

**administrative_staff**
- `administrative_staff_id` (SERIAL PRIMARY KEY)
- `user_id` (INTEGER REFERENCES users(user_id))
- `admin_role` (VARCHAR(255)) - rola administracyjna

**faculties**
- `faculty_id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR(255)) - nazwa wydziału

**buildings**
- `building_id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR(255)) - nazwa budynku
- `address` (VARCHAR(255)) - adres budynku

**courses**
- `course_id` (SERIAL PRIMARY KEY)
- `alias` (VARCHAR(255) UNIQUE) - skrót kursu (np. "INF-2024-1")
- `name` (VARCHAR(255)) - pełna nazwa kursu
- `year` (INTEGER) - rok studiów (1-5)
- `semester` (INTEGER) - semestr (1 lub 2)
- `course_mode` (VARCHAR(255)) - tryb: "stacjonarne" lub "niestacjonarne"
- `degree_type` (VARCHAR(255)) - typ stopnia: "inżynierskie", "licencjackie", "magisterskie"
- `degree` (VARCHAR(255)) - stopień: "1" lub "2"
- `faculty_id` (INTEGER REFERENCES faculties(faculty_id))

**modules**
- `module_id` (SERIAL PRIMARY KEY)
- `alias` (VARCHAR(255)) - skrót modułu
- `name` (VARCHAR(255)) - nazwa modułu
- `course_id` (INTEGER REFERENCES courses(course_id))
- `supervisor_id` (INTEGER REFERENCES teaching_staff(teaching_staff_id))

**subjects**
- `subject_id` (SERIAL PRIMARY KEY)
- `alias` (VARCHAR(255)) - skrót przedmiotu (np. "ALG")
- `name` (VARCHAR(255)) - nazwa przedmiotu
- `ects` (DECIMAL) - liczba punktów ECTS
- `description` (TEXT) - opis przedmiotu
- `syllabus` (TEXT) - program zajęć

**classes**
- `class_id` (SERIAL PRIMARY KEY)
- `subject_id` (INTEGER REFERENCES subjects(subject_id))
- `class_type` (VARCHAR(255)) - typ zajęć: "wykład", "ćwiczenia", "laboratorium"
- `group_nr` (INTEGER) - numer grupy
- `capacity` (INTEGER) - maksymalna liczba studentów
- `semester` (VARCHAR(255)) - semestr: "zimowy" lub "letni"
- `academic_year` (VARCHAR(255)) - rok akademicki (np. "2024/2025")
- `classroom` (INTEGER) - numer sali
- `building_id` (INTEGER REFERENCES buildings(building_id))

**schedules**
- `id` (SERIAL PRIMARY KEY)
- `class_id` (INTEGER REFERENCES classes(class_id) ON DELETE CASCADE)
- `day_of_week` (INTEGER CHECK 1-7) - dzień tygodnia (1=Poniedziałek, 7=Niedziela)
- `start_time` (TIME) - godzina rozpoczęcia
- `end_time` (TIME) - godzina zakończenia
- `room` (VARCHAR(50)) - sala
- `building` (VARCHAR(100)) - budynek
- `frequency` (VARCHAR(20)) - częstotliwość: "weekly", "biweekly_odd", "biweekly_even"
- `valid_from` (DATE) - data rozpoczęcia ważności
- `valid_to` (DATE) - data zakończenia ważności

**student_classes** (zapisy na zajęcia)
- `album_nr` (INTEGER REFERENCES students(album_nr))
- `class_id` (INTEGER REFERENCES classes(class_id))
- PRIMARY KEY (album_nr, class_id)

**course_subjects**
- `course_id` (INTEGER REFERENCES courses(course_id))
- `subject_id` (INTEGER REFERENCES subjects(subject_id))
- PRIMARY KEY (course_id, subject_id)

**module_subjects**
- `module_id` (INTEGER REFERENCES modules(module_id))
- `subject_id` (INTEGER REFERENCES subjects(subject_id))
- PRIMARY KEY (module_id, subject_id)

**course_instructors**
- `course_id` (INTEGER REFERENCES courses(course_id))
- `teaching_staff_id` (INTEGER REFERENCES teaching_staff(teaching_staff_id))
- PRIMARY KEY (course_id, teaching_staff_id)

**grades**
- `grade_id` (SERIAL PRIMARY KEY)
- `album_nr` (INTEGER REFERENCES students(album_nr))
- `class_id` (INTEGER REFERENCES classes(class_id))
- `subject_id` (INTEGER REFERENCES subjects(subject_id))
- `value` (VARCHAR(10)) - wartość oceny (np. "5.0", "4.5", "zal.")
- `weight` (INTEGER) - waga oceny
- `attempt` (INTEGER) - numer próby (1, 2, 3...)
- `added_by_teaching_staff_id` (INTEGER REFERENCES teaching_staff(teaching_staff_id))
- `comment` (TEXT) - komentarz wykładowcy
- `created_at` (TIMESTAMP) - data dodania

**messages**
- `message_id` (SERIAL PRIMARY KEY)
- `sender_id` (INTEGER REFERENCES users(user_id))
- `subject` (VARCHAR(255)) - temat wiadomości
- `content` (TEXT) - treść wiadomości
- `created_at` (TIMESTAMP) - data utworzenia

**message_recipients**
- `message_id` (INTEGER REFERENCES messages(message_id))
- `recipient_id` (INTEGER REFERENCES users(user_id))
- `is_read` (BOOLEAN) - status przeczytania
- `read_at` (TIMESTAMP) - data przeczytania
- PRIMARY KEY (message_id, recipient_id)

**attachments**
- `attachment_id` (SERIAL PRIMARY KEY)
- `message_id` (INTEGER REFERENCES messages(message_id))
- `application_id` (INTEGER REFERENCES applications(application_id))
- `file_name` (VARCHAR(255)) - nazwa pliku
- `file_path` (VARCHAR(255)) - ścieżka do pliku
- `file_size` (INTEGER) - rozmiar pliku w bajtach
- `mime_type` (VARCHAR(100)) - typ MIME

**applications**
- `application_id` (SERIAL PRIMARY KEY)
- `category_id` (INTEGER REFERENCES application_categories(category_id))
- `album_nr` (INTEGER REFERENCES students(album_nr))
- `title` (VARCHAR(255)) - tytuł podania
- `content` (TEXT) - treść podania
- `status` (VARCHAR(32)) - status: "submitted", "pending", "approved", "rejected"
- `created_at` (TIMESTAMP) - data utworzenia
- `updated_at` (TIMESTAMP) - data ostatniej aktualizacji

**application_categories**
- `category_id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR(255)) - nazwa kategorii
- `application_start_date` (TIMESTAMP) - data rozpoczęcia przyjmowania podań
- `application_end_date` (TIMESTAMP) - data zakończenia przyjmowania podań
- `description` (TEXT) - opis kategorii
- `active` (BOOLEAN) - czy kategoria jest aktywna

**academic_calendar**
- `calendar_id` (SERIAL PRIMARY KEY)
- `event_type` (VARCHAR(255)) - typ wydarzenia: "semester_start", "semester_end", "exam_session", "holiday"
- `title` (VARCHAR(255)) - tytuł wydarzenia
- `description` (TEXT) - opis
- `start_date` (DATE) - data rozpoczęcia
- `end_date` (DATE) - data zakończenia
- `academic_year` (VARCHAR(255)) - rok akademicki
- `applies_to` (VARCHAR(255)) - dotyczy: "all", "year_1", "year_2", etc.

**calendar_events**
- `event_id` (SERIAL PRIMARY KEY)
- `title` (VARCHAR(255)) - tytuł wydarzenia
- `description` (TEXT) - opis
- `start_time` (TIMESTAMP) - czas rozpoczęcia
- `end_time` (TIMESTAMP) - czas zakończenia
- `location` (VARCHAR(255)) - lokalizacja
- `event_type` (VARCHAR(255)) - typ: "lecture", "exam", "lab", etc.
- `class_id` (INTEGER REFERENCES classes(class_id))
- `created_by` (INTEGER REFERENCES users(user_id))

**exams**
- `exam_id` (SERIAL PRIMARY KEY)
- `class_id` (INTEGER REFERENCES classes(class_id))
- `exam_date` (TIMESTAMP) - data i godzina egzaminu
- `location` (VARCHAR(255)) - lokalizacja
- `duration_minutes` (INTEGER) - czas trwania w minutach
- `description` (TEXT) - opis
- `exam_type` (VARCHAR(255)) - typ: "final", "retake", "commission", "test", "quiz"
- `max_students` (INTEGER) - maksymalna liczba studentów
- `weight` (INTEGER) - waga w ocenie końcowej

**surveys**
- `survey_id` (SERIAL PRIMARY KEY)
- `title` (VARCHAR(255)) - tytuł ankiety
- `description` (TEXT) - opis
- `created_by` (INTEGER REFERENCES users(user_id))
- `created_at` (TIMESTAMP)

**password_reset_tokens**
- `token_id` (SERIAL PRIMARY KEY)
- `user_id` (INTEGER REFERENCES users(user_id))
- `token` (VARCHAR(255) UNIQUE) - token resetujący
- `expires_at` (TIMESTAMP) - data wygaśnięcia
- `used` (BOOLEAN) - czy token został użyty

**token_blacklist**
- `token_id` (SERIAL PRIMARY KEY)
- `token` (VARCHAR(255) UNIQUE) - zablokowany token JWT
- `expires_at` (TIMESTAMP) - data wygaśnięcia tokena

### Relacje i Klucze Obce

Główne relacje:
- Użytkownicy → Studenci/Wykładowcy/Administratorzy (1:1)
- Kursy → Moduły (1:N)
- Kursy → Przedmioty (N:M przez course_subjects)
- Przedmioty → Zajęcia (1:N)
- Studenci → Zajęcia (N:M przez student_classes)
- Zajęcia → Oceny (1:N)
- Użytkownicy → Wiadomości (1:N jako nadawca, N:M jako odbiorca)
- Studenci → Podania (1:N)
- Zajęcia → Harmonogram (1:N)

### Indeksy

System wykorzystuje następujące indeksy dla optymalizacji wydajności:
- Indeksy na kluczach obcych
- Indeksy na często wyszukiwanych kolumnach (email, album_nr, status)
- Indeksy złożone na tabelach relacyjnych
- Indeksy na datach dla zapytań czasowych

### Funkcje i Procedury

**get_semester_week(check_date DATE, semester_start DATE)**
Funkcja obliczająca numer tygodnia semestru na podstawie daty.

### Migracje

Migracje znajdują się w `src/backend/database/migrations/` i wykorzystują narzędzie `golang-migrate`.

**Tworzenie migracji:**

```bash
make migrate-create <nazwa-migracji>
```

**Uruchomienie migracji:**

```bash
make migrate up
```

**Cofnięcie migracji:**

```bash
make migrate down 1
```

### Seedowanie Bazy Danych

System zawiera skrypty do wypełnienia bazy danych danymi testowymi.

**Pełne seedowanie:**

```bash
make seed-all
```

**Co jest wgrywane:**

1. **Dane podstawowe** (`mock_data.sql`):
   - 4 wydziały
   - 8 budynków
   - 5 kategorii wniosków

2. **Użytkownicy** (`init_users.go`):
   - 9 użytkowników testowych (studenci, wykładowcy, admini)

3. **Relacje** (`init_relations.sql`):
   - Wiadomości
   - Podania
   - Oceny
   - Zapisy na zajęcia

4. **Generator danych** (opcjonalny):
   - 91 dodatkowych użytkowników
   - Setki zajęć i wydarzeń
   - Pełne dane testowe

**Dane logowania testowe:**

- Admin: `admin@system.com` / `SystemAdmin123!`
- Student: `michal.grzonkowski@student.edu.pl` / `Michal123!`
- Student: `jan.kowalski@student.edu.pl` / `Jan123!`

---

## API

### Endpointy HTTP (przez API Gateway)

Wszystkie endpointy są dostępne przez API Gateway na porcie 8083 (lokalnie) lub 30083 (Kubernetes).

#### Uwierzytelnianie i Autoryzacja

**POST /api/auth/login**

Logowanie użytkownika. Zwraca JWT token w cookie HttpOnly.

Request:
```json
{
  "email": "student@example.com",
  "password": "Password123!"
}
```

Response:
```json
{
  "message": "Login successful",
  "expires_in": 3600
}
```

Cookies: `access_token` (HttpOnly), `refresh_token` (HttpOnly)

**POST /api/auth/register**

Rejestracja nowego użytkownika.

Request:
```json
{
  "email": "newuser@example.com",
  "password": "Password123!",
  "name": "Jan",
  "surname": "Kowalski",
  "pesel": "12345678901",
  "phone_nr": "+48123456789",
  "postal_address": "ul. Przykładowa 1, 00-000 Warszawa",
  "registration_address": "ul. Przykładowa 1, 00-000 Warszawa",
  "bank_account_nr": "12345678901234567890123456",
  "role": "student",
  "degree": "1",
  "title": "",
  "faculty_id": 1
}
```

Response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "user_id": 123,
  "user_data": {
    "user_id": 123,
    "name": "Jan",
    "surname": "Kowalski",
    "email": "newuser@example.com",
    "role": "student",
    "active": true
  }
}
```

**POST /api/auth/logout**

Wylogowanie użytkownika. Wymaga refresh_token i access_token.

Request:
```json
{
  "refresh_token": "...",
  "access_token": "..."
}
```

**POST /api/auth/refresh**

Odświeżenie tokena JWT.

Request:
```json
{
  "refresh_token": "..."
}
```

**POST /api/auth/forgot-password**

Wysłanie emaila z linkiem resetującym hasło.

Request:
```json
{
  "email": "user@example.com"
}
```

**POST /api/auth/reset-password**

Reset hasła przy użyciu tokena.

Request:
```json
{
  "token": "reset-token-from-email",
  "new_password": "NewPassword123!"
}
```

**GET /api/auth/username**

Pobranie nazwy użytkownika z aktualnej sesji.

Response:
```json
{
  "username": "Jan Kowalski",
  "message": "Success",
  "success": true,
  "status": 200
}
```

**GET /api/auth/user**

Pobranie pełnych danych użytkownika z sesji.

Response:
```json
{
  "user": {
    "user_id": 123,
    "name": "Jan",
    "surname": "Kowalski",
    "email": "jan@example.com",
    "active": true,
    "role": "student",
    "album_nr": 12345
  },
  "success": true
}
```

**GET /api/auth/users**

Lista wszystkich użytkowników (wymaga uprawnień admin).

Response:
```json
{
  "users": [
    {
      "user_id": 123,
      "name": "Jan",
      "surname": "Kowalski",
      "email": "jan@example.com",
      "role": "student"
    }
  ],
  "success": true
}
```

**GET /api/auth/search**

Wyszukiwanie użytkowników z paginacją.

Query Parameters:
- `name` (optional) - filtrowanie po imieniu
- `surname` (optional) - filtrowanie po nazwisku
- `email` (optional) - filtrowanie po emailu
- `page` (required) - numer strony (domyślnie 1)
- `page_size` (required) - rozmiar strony (domyślnie 10)

Response:
```json
{
  "users": [...],
  "total_count": 50,
  "page": 1,
  "page_size": 10,
  "total_pages": 5
}
```

**PUT /api/auth/edit/{user_id}**

Aktualizacja danych użytkownika.

Request:
```json
{
  "user_id": 123,
  "name": "Jan",
  "surname": "Nowak",
  "email": "jan.nowak@example.com",
  "phone_nr": "+48123456789",
  "active": true
}
```

**POST /api/users/photo**

Upload zdjęcia profilowego.

Request:
```json
{
  "photo_data": "base64-encoded-image",
  "mime_type": "image/jpeg"
}
```

**GET /api/users/{user_id}/photo**

Pobranie zdjęcia profilowego użytkownika.

Response: Binary image data

#### Kursy i Przedmioty

**GET /api/courses**

Lista wszystkich kursów.

Response:
```json
{
  "courses": [
    {
      "course_id": 1,
      "alias": "INF-2024-1",
      "name": "Informatyka",
      "year": 1,
      "semester": 1,
      "course_mode": "stacjonarne",
      "degree_type": "inżynierskie",
      "degree": "1",
      "faculty_name": "Wydział Informatyki",
      "faculty_id": 1,
      "enrolled_students_count": 120
    }
  ],
  "message": "Success"
}
```

**GET /api/courses/{course_id}**

Szczegóły kursu.

Response:
```json
{
  "course": {
    "course_id": 1,
    "alias": "INF-2024-1",
    "name": "Informatyka",
    "year": 1,
    "semester": 1,
    "course_mode": "stacjonarne",
    "degree_type": "inżynierskie",
    "degree": "1",
    "faculty_name": "Wydział Informatyki",
    "faculty_id": 1,
    "module_alias": "MOD-1",
    "module_name": "Moduł podstawowy",
    "supervisor_name": "Jan",
    "supervisor_surname": "Kowalski",
    "supervisor_degree": "dr",
    "supervisor_title": "inż."
  },
  "message": "Success"
}
```

**GET /api/courses/{course_id}/subjects**

Przedmioty przypisane do kursu.

Response:
```json
{
  "subjects": [
    {
      "subject_id": 1,
      "alias": "ALG",
      "name": "Algorytmy i struktury danych",
      "ects": 6.0,
      "description": "Podstawowe algorytmy...",
      "syllabus": "Tematyka zajęć..."
    }
  ],
  "message": "Success"
}
```

**GET /api/courses/search**

Wyszukiwanie kursów z filtrami.

Query Parameters:
- `name` (optional) - nazwa kursu
- `year` (optional) - rok studiów
- `course_mode` (optional) - "stacjonarne" lub "niestacjonarne"
- `degree_type` (optional) - typ stopnia
- `faculty_id` (optional) - ID wydziału

**GET /api/courses/stats**

Statystyki kursów pogrupowane według wydziałów.

Response:
```json
{
  "stats": [
    {
      "faculty_name": "Wydział Informatyki",
      "total_courses": 15,
      "full_time_courses": 10,
      "part_time_courses": 5,
      "engineering_courses": 8,
      "bachelor_courses": 5,
      "master_courses": 2
    }
  ]
}
```

**GET /api/faculties**

Lista wszystkich wydziałów.

Response:
```json
{
  "faculties": [
    {
      "faculty_id": 1,
      "name": "Wydział Informatyki"
    }
  ],
  "message": "Success"
}
```

**GET /api/subjects**

Lista wszystkich przedmiotów.

**GET /api/subjects/{id}**

Szczegóły przedmiotu.

**GET /api/student/course-info/{album_nr}**

Informacje o kursie studenta.

Response:
```json
{
  "course_info": {
    "university_name": "Uniwersytet",
    "college_name": "Kolegium",
    "faculty_name": "Wydział Informatyki",
    "faculty_address": "ul. Przykładowa 1",
    "course_name": "Informatyka",
    "year": 1,
    "semester": 1,
    "semester_name": "Semestr zimowy 2024/2025",
    "study_mode": "stacjonarne",
    "module_name": "Moduł podstawowy",
    "supervisor_name": "Jan Kowalski"
  }
}
```

#### Oceny

**GET /api/grades**

Lista ocen. Dla studentów zwraca tylko własne oceny, dla wykładowców oceny z ich przedmiotów.

Query Parameters:
- `album_nr` (optional) - numer albumu studenta
- `all_students` (optional, boolean) - dla wykładowców: wszystkie oceny

Response:
```json
{
  "grades": [
    {
      "grade_id": 1,
      "album_nr": 12345,
      "class_id": 10,
      "subject_id": 5,
      "value": "5.0",
      "weight": 1,
      "attempt": 1,
      "added_by_teaching_staff_id": 50,
      "comment": "Bardzo dobra praca",
      "created_at": "2024-01-15T10:00:00Z",
      "subject_name": "Algorytmy",
      "added_by_name": "Jan Kowalski",
      "student_name": "Anna Nowak",
      "class_type": "wykład"
    }
  ],
  "message": "Success"
}
```

**POST /api/grades**

Dodanie nowej oceny (wymaga uprawnień wykładowcy).

Request:
```json
{
  "album_nr": 12345,
  "class_id": 10,
  "subject_id": 5,
  "value": "4.5",
  "weight": 1,
  "attempt": 1,
  "comment": "Dobra praca"
}
```

**PUT /api/grades/{grade_id}**

Aktualizacja oceny.

Request:
```json
{
  "value": "5.0",
  "weight": 1,
  "comment": "Poprawiona ocena"
}
```

**DELETE /api/grades/{grade_id}**

Usunięcie oceny.

**GET /api/student/grades/recent**

Ostatnie oceny studenta.

Query Parameters:
- `limit` (optional, default: 10) - liczba ocen

**GET /api/teacher/classes**

Lista zajęć prowadzonych przez wykładowcę.

Response:
```json
{
  "classes": [
    {
      "class_id": 10,
      "subject_id": 5,
      "subject_name": "Algorytmy",
      "subject_alias": "ALG",
      "class_type": "wykład",
      "group_nr": 1,
      "current_capacity": 25,
      "capacity": 30,
      "semester": "zimowy",
      "academic_year": "2024/2025",
      "classroom": 101,
      "building_name": "Budynek A"
    }
  ]
}
```

**GET /api/admin/grade-options**

Opcje dla panelu administracyjnego (studenci, wykładowcy, przedmioty, zajęcia).

#### Kalendarz

**GET /api/calendar/user/{user_id}/events**

Wydarzenia użytkownika w określonym zakresie dat.

Query Parameters:
- `start_date` (required) - format RFC3339, np. "2024-01-01T00:00:00Z"
- `end_date` (required) - format RFC3339

Response:
```json
{
  "success": true,
  "message": "Success",
  "events": [
    {
      "event_id": 1,
      "title": "Egzamin z Algorytmów",
      "description": "Egzamin końcowy",
      "start_time": "2024-01-20T10:00:00Z",
      "end_time": "2024-01-20T12:00:00Z",
      "location": "Sala 101, Budynek A",
      "event_type": "exam",
      "class_id": 10,
      "created_by": 50
    }
  ]
}
```

**POST /api/calendar/events**

Utworzenie nowego wydarzenia.

Request:
```json
{
  "title": "Egzamin",
  "description": "Egzamin końcowy",
  "start_time": "2024-01-20T10:00:00Z",
  "end_time": "2024-01-20T12:00:00Z",
  "location": "Sala 101",
  "event_type": "exam",
  "class_id": 10,
  "created_by": 50
}
```

**GET /api/calendar/academic**

Kalendarz akademicki.

Query Parameters:
- `start_date` (optional)
- `end_date` (optional)
- `academic_year` (optional)
- `event_type` (optional)

Response:
```json
{
  "success": true,
  "events": [
    {
      "event_id": 1,
      "event_type": "semester_start",
      "title": "Rozpoczęcie semestru",
      "start_date": "2024-10-01",
      "end_date": "2024-10-01",
      "academic_year": "2024/2025",
      "applies_to": "all"
    }
  ],
  "current_academic_year": {
    "year": "2024/2025",
    "current_semester": "zimowy",
    "current_week": 5,
    "semester_start": "2024-10-01",
    "semester_end": "2025-02-15",
    "exam_session_start": "2025-02-16",
    "exam_session_end": "2025-02-28",
    "holidays": ["2024-12-25", "2025-01-01"]
  }
}
```

**GET /api/calendar/semester/current**

Informacje o bieżącym semestrze.

**POST /api/calendar/academic**

Utworzenie wydarzenia akademickiego.

**GET /api/calendar/holidays**

Lista świąt i dni wolnych.

Query Parameters:
- `start_date` (optional)
- `end_date` (optional)
- `include_weekends` (boolean, default: false)

**GET /api/calendar/class/{class_id}/schedule**

Harmonogram zajęć dla danej grupy.

**GET /api/student/schedule/week**

Harmonogram tygodniowy studenta.

Query Parameters:
- `date` (optional) - data w formacie YYYY-MM-DD, domyślnie bieżący tydzień

Response:
```json
{
  "success": true,
  "schedule": [
    {
      "schedule_id": 1,
      "class_id": 10,
      "subject_name": "Algorytmy",
      "class_type": "wykład",
      "day_of_week": 1,
      "start_time": "08:00:00",
      "end_time": "09:30:00",
      "room": "101",
      "building": "Budynek A",
      "instructor_name": "Jan Kowalski"
    }
  ],
  "week_start": "2024-01-15",
  "week_end": "2024-01-19"
}
```

**GET /api/registration/periods/active**

Aktywne okresy rejestracji.

**GET /api/student/exams/upcoming**

Nadchodzące egzaminy studenta.

Query Parameters:
- `days_ahead` (optional, default: 30)

**GET /api/exams**

Lista egzaminów z filtrami.

Query Parameters:
- `exam_id` (optional)
- `class_id` (optional)
- `exam_type` (optional) - "final", "retake", "commission", "test", "quiz"
- `date_from` (optional) - format "YYYY-MM-DD"
- `date_to` (optional)

**GET /api/student/exams**

Egzaminy studenta.

**POST /api/exams**

Utworzenie egzaminu.

Request:
```json
{
  "class_id": 10,
  "exam_date": "2024-01-20 10:00:00",
  "location": "Sala 101",
  "duration_minutes": 120,
  "description": "Egzamin końcowy",
  "exam_type": "final",
  "max_students": 30,
  "weight": 50
}
```

**PUT /api/exams/{exam_id}**

Aktualizacja egzaminu.

**DELETE /api/exams/{exam_id}**

Usunięcie egzaminu.

#### Wiadomości

**POST /api/messaging/send-email**

Wysłanie emaila przez SMTP.

Request:
```json
{
  "to": "recipient@example.com",
  "subject": "Temat wiadomości",
  "body": "Treść wiadomości"
}
```

**POST /api/messaging/get_email**

Pobranie pojedynczej wiadomości przez IMAP.

Request:
```json
{
  "email_uid": "12345",
  "folder": "INBOX"
}
```

Response:
```json
{
  "success": true,
  "email_uid": "12345",
  "sender_email": "sender@example.com",
  "sender_name": "Jan Kowalski",
  "title": "Temat",
  "content": "Treść",
  "send_date": "2024-01-15T10:00:00Z",
  "is_read": false
}
```

**POST /api/messaging/get_all_emails**

Lista wiadomości z paginacją.

Request:
```json
{
  "limit": 20,
  "offset": 0,
  "folder": "INBOX"
}
```

Response:
```json
{
  "success": true,
  "emails": [
    {
      "email_uid": "12345",
      "sender_email": "sender@example.com",
      "sender_name": "Jan Kowalski",
      "title": "Temat",
      "send_date": "2024-01-15T10:00:00Z",
      "is_read": false
    }
  ],
  "total_count": 100
}
```

**POST /api/messaging/delete_email**

Usunięcie wiadomości.

**POST /api/messaging/set_email_read**

Oznaczenie wiadomości jako przeczytanej.

**POST /api/messaging/set_email_unread**

Oznaczenie wiadomości jako nieprzeczytanej.

**GET /api/messaging/suggest-email**

Sugestie adresów email podczas wpisywania.

Query Parameters:
- `q` (required, min 2 znaki) - wyszukiwany tekst
- `limit` (optional, default: 10, max: 50)
- `scope` (optional) - "all", "students", "staff"

Response:
```json
{
  "items": [
    {
      "user_id": 123,
      "email": "jan.kowalski@student.edu.pl",
      "display_name": "Jan Kowalski"
    }
  ]
}
```

**GET /api/messaging/list-folders**

Lista folderów emailowych (INBOX, Sent, Drafts, etc.).

#### Podania

**GET /api/applications**

Lista podań z filtrami i paginacją.

Query Parameters:
- `application_id` (optional)
- `album_nr` (optional)
- `category_id` (optional)
- `status` (optional) - "submitted", "approved", "rejected", "pending"
- `page` (optional, default: 1)
- `page_size` (optional, default: 10)

Response:
```json
{
  "items": [
    {
      "application_id": 1,
      "category_id": 2,
      "album_nr": 12345,
      "title": "Podanie o przedłużenie terminu",
      "content": "Treść podania...",
      "status": "pending",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "page_size": 10
}
```

**POST /api/applications**

Utworzenie lub aktualizacja podania.

Request:
```json
{
  "application_id": null,
  "album_nr": 12345,
  "category_id": 2,
  "title": "Podanie o przedłużenie terminu",
  "content": "Treść podania...",
  "status": "submitted"
}
```

#### Zapisy na Zajęcia

**GET /api/enrollments**

Lista zapisów użytkownika.

**POST /api/enrollments**

Zapisanie się na zajęcia.

Request:
```json
{
  "subject_id": 5,
  "class_id": 10
}
```

**DELETE /api/enrollments/{subject_id}**

Wypisanie się z zajęć.

**POST /api/enrollments/check-conflicts**

Sprawdzenie konfliktów czasowych przed zapisem.

Request:
```json
{
  "subject_id": 5,
  "class_id": 10
}
```

#### Wyszukiwanie

**GET /api/search**

Wyszukiwanie globalne w całym systemie.

Query Parameters:
- `query` (required) - tekst wyszukiwania
- `entity_types` (optional) - lista typów: "users", "subjects", "courses", "buildings", "classes"
- `limit_per_type` (optional, default: 5) - limit wyników na typ

Response:
```json
{
  "users": [
    {
      "user_id": 123,
      "name": "Jan",
      "surname": "Kowalski",
      "email": "jan@example.com",
      "role": "student"
    }
  ],
  "subjects": [
    {
      "subject_id": 5,
      "name": "Algorytmy i struktury danych",
      "alias": "ALG",
      "ects": 6.0,
      "description": "..."
    }
  ],
  "courses": [...],
  "buildings": [...],
  "classes": [...],
  "total_results": 15,
  "message": "Success"
}
```

#### Inne Endpointy

**GET /api/hello**

Testowy endpoint sprawdzający działanie API Gateway.

**GET /api/health**

Health check endpoint.

**GET /api/ready**

Readiness check endpoint.

**GET /api/teacher/students**

Lista studentów prowadzonych przez wykładowcę.

**GET /api/info/user/{user_id}**

Podstawowe informacje o użytkowniku.

**GET /api/info/building/{building_id}**

Informacje o budynku.

### gRPC Services

Wszystkie serwisy gRPC są dostępne wewnętrznie w sieci Kubernetes/Docker.

**Common Service (port 3003):**
- `AuthService` - uwierzytelnianie
- `AcademicService` - dane akademickie
- `CourseService` - zarządzanie kursami
- `GradesService` - system oceniania
- `ApplicationsService` - podania
- `SearchService` - wyszukiwanie

**Calendar Service (port 3001):**
- `CalendarService` - zarządzanie kalendarzem

**Messaging Service (port 3002):**
- `MessagingService` - system wiadomości

### Protobuf

Definicje protobuf znajdują się w:
- `src/backend/modules/common/api/*.proto`
- `src/backend/modules/calendar/api/*.proto`
- `src/backend/modules/messaging/api/*.proto`

Generowanie kodu Go:

```bash
cd src/backend/modules/<service>
make gen
```

---

## Bezpieczeństwo

### Uwierzytelnianie

System wykorzystuje JWT (JSON Web Tokens) do uwierzytelniania użytkowników.

**Proces logowania:**
1. Użytkownik wysyła dane logowania do `/api/auth/login`
2. Serwer weryfikuje dane i generuje JWT token
3. Token jest zwracany w cookie (HttpOnly, Secure w produkcji)
4. Token jest używany do autoryzacji kolejnych żądań

**Hasła:**
- Hashowane przy użyciu bcrypt
- Minimalna długość: 8 znaków
- Wymagane: wielka litera, mała litera, cyfra, znak specjalny

### CORS

API Gateway obsługuje CORS z konfigurowalną listą dozwolonych originów.

**Konfiguracja:**
```env
ALLOWED_ORIGINS=https://asos.elmar.pro,http://localhost:3000
```

**Implementacja:**
- Sprawdzanie nagłówka `Origin` w żądaniu
- Zwracanie odpowiedniego `Access-Control-Allow-Origin` w odpowiedzi
- Obsługa preflight requests (OPTIONS)
- Dozwolone metody: GET, POST, PUT, DELETE, OPTIONS
- Dozwolone nagłówki: Content-Type, Authorization, X-Requested-With
- Credentials: cookies są dozwolone dla dozwolonych originów

### HTTPS/SSL

W środowisku produkcyjnym wykorzystywany jest cert-manager z Let's Encrypt do automatycznego generowania i odnawiania certyfikatów SSL.

### Secrets Management

W Kubernetes wrażliwe dane przechowywane są w Secrets:
- Hasła do bazy danych
- Klucze JWT
- Credentials do Docker registry

**Tworzenie Secrets:**

```bash
# PostgreSQL password
kubectl create secret generic postgres-secret \
  --from-literal=POSTGRES_PASSWORD=<password> \
  -n usosweb

# GitHub Container Registry
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<username> \
  --docker-password=<token> \
  -n usosweb
```

**Bezpieczeństwo:**
- Secrets są przechowywane w zaszyfrowanej formie w etcd (Kubernetes)
- Dostęp tylko dla uprawnionych podów w namespace
- Nie są widoczne w ConfigMaps (tylko referencje)
- Rotacja secrets wymaga restartu podów lub użycia Sealed Secrets

### Middleware i Autoryzacja

**API Gateway Middleware:**

1. **Logging Middleware**
   - Loguje wszystkie żądania HTTP
   - Zapisuje: metodę, ścieżkę, IP klienta, czas odpowiedzi, status HTTP
   - Poziom: INFO dla żądań, DEBUG dla szczegółów

2. **CORS Middleware**
   - Sprawdza origin żądania
   - Dodaje odpowiednie nagłówki CORS
   - Obsługuje preflight requests

3. **Cookie Handler**
   - Zarządza cookies dla sesji JWT
   - Ustawia HttpOnly i Secure flagi w produkcji
   - Obsługuje refresh tokens

**Common Service Middleware:**

1. **Auth Middleware (gRPC)**
   - Weryfikuje JWT token z metadanych gRPC
   - Sprawdza uprawnienia użytkownika
   - Dodaje informacje o użytkowniku do kontekstu

**Autoryzacja:**

System wykorzystuje role-based access control (RBAC):
- **student** - dostęp do własnych danych, zapisów, ocen
- **teacher** - dostęp do prowadzonych zajęć, ocenianie studentów
- **admin** - pełny dostęp administracyjny
- **system** - dostęp systemowy (tylko dla specjalnych operacji)

**Weryfikacja uprawnień:**
- Sprawdzanie roli użytkownika z tokena JWT
- Weryfikacja własności zasobów (np. student może widzieć tylko swoje oceny)
- Sprawdzanie relacji (np. wykładowca może oceniać tylko swoich studentów)

---

## Rozwój i Utrzymanie

### Wymagania Rozwojowe

**Backend:**
- Go 1.23.0+
- Docker
- PostgreSQL client tools (opcjonalnie)

**Frontend:**
- Node.js 20+
- npm lub yarn

**Infrastruktura:**
- Docker Desktop lub OrbStack
- kubectl (dla Kubernetes)
- make (opcjonalnie)

### Struktura Rozwoju

**Backend:**
1. Kod źródłowy w `src/backend/modules/<service>/`
2. Definicje protobuf w `api/*.proto`
3. Generowanie kodu: `make gen` w katalogu serwisu
4. Testy: standardowe testy Go

**Frontend:**
1. Kod źródłowy w `src/frontend/app/`
2. Komponenty w `src/frontend/app/components/`
3. Konfiguracja API w `src/frontend/app/config/api.ts`
4. Hot reload w trybie development

### Build i Test

**Backend:**

```bash
# Build pojedynczego serwisu
cd src/backend/modules/<service>
make build

# Build wszystkich serwisów
cd src/backend
make build-all
```

**Frontend:**

```bash
cd src/frontend
npm install
npm run dev      # Development (hot reload na localhost:3000)
npm run build    # Production build
npm start        # Production server
npm run lint     # Linting z ESLint
```

**Struktura Buildów:**

**Backend:**
- Każdy serwis budowany jest jako osobny obraz Docker
- Multi-stage builds dla optymalizacji rozmiaru
- Binaries kompilowane dla linux/amd64
- Obrazy przechowywane w GitHub Container Registry

**Frontend:**
- Next.js build tworzy zoptymalizowane pliki statyczne
- Server-side rendering (SSR) dla lepszego SEO
- Static generation dla stron statycznych
- Code splitting automatycznie przez Next.js

### Testowanie

**Backend:**

```bash
# Uruchomienie testów jednostkowych
cd src/backend/modules/<service>
go test ./...

# Testy z coverage
go test -cover ./...

# Testy z verbose output
go test -v ./...

# Testy konkretnego pakietu
go test ./services/auth
```

**Struktura testów:**
- Testy jednostkowe dla każdego serwisu
- Testy integracyjne dla komunikacji gRPC
- Mockowanie bazy danych i Redis
- Testy middleware i autoryzacji

**Frontend:**

```bash
cd src/frontend

# Testy jednostkowe (jeśli skonfigurowane)
npm test

# Testy E2E (jeśli skonfigurowane)
npm run test:e2e
```

**Testowanie API:**

```bash
# Test health check
curl http://localhost:8083/api/health

# Test logowania
curl -X POST http://localhost:8083/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@system.com","password":"SystemAdmin123!"}'

# Test z autoryzacją (użyj tokena z cookie)
curl http://localhost:8083/api/auth/user \
  --cookie "access_token=<token>"
```

### Logowanie

Wszystkie serwisy wykorzystują wspólny system logowania (`pkg/logger`).

**Poziomy logowania:**
- DEBUG - szczegółowe informacje debugowania
- INFO - informacje ogólne
- WARN - ostrzeżenia
- ERROR - błędy

**Konfiguracja:**
```env
LOG_LEVEL=info
LOG_FILE=/app/logs/<service>.log
```

**Lokalizacja logów:**
- Docker Compose: `./logs/`
- Kubernetes: logi dostępne przez `kubectl logs`

### Cache i Redis

System wykorzystuje Redis do cache'owania danych i zarządzania sesjami.

**Implementacja Cache:**

Cache jest zaimplementowany w pakiecie `pkg/cache` z interfejsem umożliwiającym łatwą wymianę implementacji.

**Operacje Cache:**

```go
// Set - zapisanie wartości z TTL
cache.Set(ctx, "key", value, time.Hour)

// Get - pobranie wartości
var result MyType
err := cache.Get(ctx, "key", &result)

// Delete - usunięcie klucza
cache.Delete(ctx, "key")

// Exists - sprawdzenie istnienia klucza
exists := cache.Exists(ctx, "key")
```

**Konfiguracja:**

```env
REDIS_HOST=redis-service
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
CACHE_ENABLED=true
CACHE_DEFAULT_TTL=1h
```

**Użycie Cache:**

Cache jest wykorzystywany do:
- Cache'owanie wyników zapytań do bazy danych (np. lista kursów)
- Przechowywanie sesji użytkowników
- Cache'owanie wyników wyszukiwania
- Tymczasowe przechowywanie tokenów resetujących hasło

**Strategia Cache:**

- **TTL (Time To Live)**: domyślnie 1 godzina, konfigurowalne per operacja
- **Invalidation**: ręczne usuwanie przy aktualizacji danych
- **Serialization**: JSON dla złożonych typów danych
- **Error Handling**: graceful degradation - przy błędzie cache zwracane są dane z bazy

**Redis Commands:**

```bash
# Połączenie z Redis
docker compose exec redis redis-cli

# Sprawdzenie kluczy
KEYS *

# Sprawdzenie wartości
GET key

# Sprawdzenie TTL
TTL key

# Usunięcie klucza
DEL key

# Wyczyść całą bazę (ostrożnie!)
FLUSHDB
```

### Monitoring

**Metryki:**
- API Gateway eksportuje metryki Prometheus na porcie 9090
- Metryki dostępne pod `/metrics`
- Metryki obejmują: liczbę żądań, czas odpowiedzi, błędy

**Health Checks:**

Wszystkie serwisy mają skonfigurowane:
- `livenessProbe` - restart poda przy awarii
- `readinessProbe` - traffic tylko do gotowych podów

**Szczegóły Health Checks:**

**PostgreSQL:**
```yaml
livenessProbe:
  exec:
    command: ["pg_isready", "-U", "admin", "-d", "usosweb"]
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

**Redis:**
```yaml
livenessProbe:
  exec:
    command: ["redis-cli", "ping"]
  initialDelaySeconds: 10
  periodSeconds: 10
```

**API Gateway, Calendar, Messaging, Common:**
```yaml
livenessProbe:
  tcpSocket:
    port: 8083  # lub odpowiedni port serwisu
  initialDelaySeconds: 60
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  tcpSocket:
    port: 8083
  initialDelaySeconds: 30
  periodSeconds: 5
  timeoutSeconds: 5
  failureThreshold: 3
```

**Frontend:**
```yaml
livenessProbe:
  httpGet:
    path: /
    port: 3000
  initialDelaySeconds: 120  # Next.js potrzebuje czasu na kompilację
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /
    port: 3000
  initialDelaySeconds: 60
  periodSeconds: 5
```

**Logowanie Metryk:**

Wszystkie serwisy logują:
- Czas wykonania operacji
- Liczbę żądań
- Błędy i wyjątki
- Użycie zasobów (CPU, pamięć)

**Sprawdzanie zdrowia:**

```bash
# Kubernetes
kubectl get pods -n usosweb
kubectl describe pod <pod-name> -n usosweb

# Docker Compose
docker compose ps
docker compose logs <service>
```

### Backup i Restore

**Backup bazy danych:**

```bash
# Docker Compose
docker compose exec postgres pg_dump -U postgres mydb > backup.sql

# Kubernetes
kubectl exec -n usosweb postgres-<pod-id> -- pg_dump -U admin usosweb > backup.sql
```

**Restore:**

```bash
# Docker Compose
docker compose exec -T postgres psql -U postgres mydb < backup.sql

# Kubernetes
kubectl exec -i -n usosweb postgres-<pod-id> -- psql -U admin usosweb < backup.sql
```

### Troubleshooting

**Problem: Serwis nie startuje**

1. Sprawdź logi:
   ```bash
   docker compose logs <service>
   # lub
   kubectl logs -n usosweb <pod-name>
   ```

2. Sprawdź konfigurację:
   ```bash
   kubectl describe pod <pod-name> -n usosweb
   ```

3. Sprawdź połączenia z bazą danych:
   ```bash
   docker compose exec postgres psql -U postgres -d mydb -c "SELECT 1;"
   ```

**Problem: Frontend nie łączy się z API**

1. Sprawdź zmienną środowiskową `NEXT_PUBLIC_API_URL`
2. Sprawdź czy API Gateway działa:
   ```bash
   curl http://localhost:8083/api/health
   ```
3. Sprawdź CORS configuration

**Problem: Migracje nie działają**

1. Sprawdź połączenie z bazą danych
2. Sprawdź logi migracji:
   ```bash
   kubectl logs -n usosweb job/migrate
   ```
3. Sprawdź czy migracje są w odpowiednim katalogu

### Aktualizacje

**Aktualizacja serwisu:**

1. Zbuduj nowy obraz Docker:
   ```bash
   docker build -t <image-name>:<tag> .
   ```

2. Wypchnij do registry:
   ```bash
   docker push <image-name>:<tag>
   ```

3. Zaktualizuj deployment:
   ```bash
   kubectl set image deployment/<service> <service>=<image-name>:<tag> -n usosweb
   ```

**Rollback:**

```bash
kubectl rollout undo deployment/<service> -n usosweb
```

---

## Skrypty Automatyzacji

### Unix/Linux/macOS

- `scripts/deploy-all.sh` - pełny deployment Kubernetes
- `scripts/seed-all.sh` - seedowanie bazy danych
- `scripts/setup-database.sh` - konfiguracja bazy danych
- `scripts/scale-services.sh` - skalowanie serwisów

### Windows

- `scripts/deploy-all.bat` - pełny deployment Kubernetes
- `scripts/seed-all.bat` - seedowanie bazy danych
- `scripts/setup-database.bat` - konfiguracja bazy danych
- `scripts/docker-up.bat` - uruchomienie Docker Compose
- `scripts/docker-down.bat` - zatrzymanie Docker Compose

### Makefile

Główne komendy:
- `make up` - uruchomienie Docker Compose
- `make down` - zatrzymanie Docker Compose
- `make seed-all` - seedowanie bazy danych
- `make k8s-deploy` - deployment Kubernetes
- `make k8s-status` - status Kubernetes
- `make k8s-logs SERVICE=<service>` - logi serwisu

---

## Wersjonowanie

System wykorzystuje semantyczne wersjonowanie dla obrazów Docker. Obrazy są przechowywane w GitHub Container Registry (ghcr.io).

**Format tagów:**
- `latest` - najnowsza wersja
- `v1.0.0` - konkretna wersja
- `<branch-name>` - wersja z brancha

---

## Skalowanie i Wydajność

### Skalowanie Poziome

**Kubernetes:**

Wszystkie serwisy mogą być skalowane poziomo przez zwiększenie liczby replik:

```bash
# Skalowanie API Gateway
kubectl scale deployment api-gateway --replicas=3 -n usosweb

# Skalowanie Common Service
kubectl scale deployment common --replicas=2 -n usosweb

# Skalowanie Frontend
kubectl scale deployment frontend --replicas=2 -n usosweb
```

**Automatyczne skalowanie:**

Można skonfigurować Horizontal Pod Autoscaler (HPA):

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: usosweb
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Optymalizacja Wydajności

**Baza Danych:**

- Indeksy na często wyszukiwanych kolumnach
- Connection pooling (domyślnie w Go database/sql)
- Query optimization przez analizę EXPLAIN
- Regularne VACUUM i ANALYZE dla PostgreSQL

**Cache:**

- Agresywne cache'owanie danych rzadko zmieniających się (wydziały, budynki)
- Cache z TTL dla danych często zmieniających się (kursy, przedmioty)
- Invalidation przy aktualizacji danych

**API Gateway:**

- Connection pooling do serwisów gRPC
- Timeouty dla żądań (domyślnie 30s)
- Rate limiting (można dodać przez middleware)

**Frontend:**

- Next.js automatyczny code splitting
- Image optimization przez Next.js Image component
- Static generation dla stron statycznych
- Server-side rendering tylko gdy potrzebne

### Limity Zasobów

**Kubernetes Resource Limits:**

```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

**Rekomendowane limity:**

- **API Gateway**: 128Mi-512Mi RAM, 100m-500m CPU
- **Common Service**: 256Mi-1Gi RAM, 200m-1000m CPU
- **Calendar Service**: 128Mi-512Mi RAM, 100m-500m CPU
- **Messaging Service**: 128Mi-512Mi RAM, 100m-500m CPU
- **Frontend**: 256Mi-1Gi RAM, 200m-1000m CPU
- **PostgreSQL**: 512Mi-2Gi RAM, 500m-2000m CPU
- **Redis**: 128Mi-512Mi RAM, 100m-500m CPU

## Integracja z Zewnętrznymi Systemami

### Email (SMTP/IMAP)

System wykorzystuje SMTP do wysyłania emaili i IMAP do odbierania.

**Konfiguracja SMTP:**

Wymagane zmienne środowiskowe:
- `SMTP_HOST` - serwer SMTP
- `SMTP_PORT` - port SMTP (zwykle 587 dla TLS)
- `SMTP_USER` - użytkownik SMTP
- `SMTP_PASSWORD` - hasło SMTP
- `SMTP_FROM` - adres nadawcy

**Konfiguracja IMAP:**

- `IMAP_HOST` - serwer IMAP
- `IMAP_PORT` - port IMAP (zwykle 993 dla SSL)
- `IMAP_USER` - użytkownik IMAP
- `IMAP_PASSWORD` - hasło IMAP

**Email App Password:**

Użytkownicy mogą mieć indywidualne hasła aplikacji email przechowywane w bazie danych (zaszyfrowane).

### GitHub Container Registry

Obrazy Docker są przechowywane w GitHub Container Registry (ghcr.io).

**Pull Images:**

```bash
docker pull ghcr.io/slomus/usosweb-api-gateway:latest
docker pull ghcr.io/slomus/usosweb-common:latest
docker pull ghcr.io/slomus/usosweb-calendar:latest
docker pull ghcr.io/slomus/usosweb-messaging:latest
docker pull ghcr.io/slomus/usosweb-frontend:latest
```

**Push Images:**

```bash
# Build i tag
docker build -t ghcr.io/slomus/usosweb-api-gateway:latest .

# Login
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Push
docker push ghcr.io/slomus/usosweb-api-gateway:latest
```

## Rozwiązywanie Problemów - Szczegółowe

### Problem: Błędy Połączenia z Bazą Danych

**Objawy:**
- Serwisy nie startują
- Błędy "connection refused" w logach
- Timeout przy połączeniu

**Diagnostyka:**

```bash
# Sprawdź czy PostgreSQL działa
docker compose ps postgres
# lub
kubectl get pods -n usosweb | grep postgres

# Sprawdź logi PostgreSQL
docker compose logs postgres
# lub
kubectl logs -n usosweb <postgres-pod>

# Test połączenia
docker compose exec postgres psql -U postgres -d mydb -c "SELECT 1;"
# lub
kubectl exec -n usosweb <postgres-pod> -- psql -U admin -d usosweb -c "SELECT 1;"

# Sprawdź zmienne środowiskowe
kubectl describe pod <service-pod> -n usosweb | grep -A 10 "Environment"
```

**Rozwiązania:**
1. Upewnij się, że PostgreSQL jest uruchomiony i zdrowy
2. Sprawdź poprawność zmiennych środowiskowych (DB_HOST, DB_PORT, DB_NAME, DB_USER)
3. Sprawdź hasło w Secret: `kubectl get secret postgres-secret -n usosweb -o yaml`
4. Sprawdź sieć Kubernetes/Docker - czy serwisy są w tym samym namespace/network

### Problem: Błędy gRPC

**Objawy:**
- "connection refused" przy wywołaniach gRPC
- Timeout przy komunikacji między serwisami
- Błędy "deadline exceeded"

**Diagnostyka:**

```bash
# Sprawdź czy serwisy gRPC działają
kubectl get pods -n usosweb | grep -E "common|calendar|messaging"

# Sprawdź logi serwisu gRPC
kubectl logs -n usosweb <service-pod>

# Sprawdź konfigurację endpointów w API Gateway
kubectl get configmap api-gateway-config -n usosweb -o yaml

# Test połączenia gRPC (wymaga grpcurl)
grpcurl -plaintext localhost:3003 list
```

**Rozwiązania:**
1. Sprawdź czy serwisy gRPC są uruchomione i gotowe (readiness probe)
2. Sprawdź konfigurację GRPC_*_HOST i GRPC_*_PORT w ConfigMap
3. Sprawdź czy serwisy są w tym samym namespace (Kubernetes)
4. Sprawdź Service DNS names: `common-service:3003`

### Problem: Błędy Cache (Redis)

**Objawy:**
- Błędy "connection refused" do Redis
- Cache nie działa, ale aplikacja działa
- Timeout przy operacjach cache

**Diagnostyka:**

```bash
# Sprawdź Redis
docker compose ps redis
# lub
kubectl get pods -n usosweb | grep redis

# Test połączenia
docker compose exec redis redis-cli ping
# lub
kubectl exec -n usosweb <redis-pod> -- redis-cli ping

# Sprawdź klucze
kubectl exec -n usosweb <redis-pod> -- redis-cli KEYS "*"
```

**Rozwiązania:**
1. Upewnij się, że Redis jest uruchomiony
2. Sprawdź zmienne środowiskowe REDIS_HOST, REDIS_PORT
3. Sprawdź czy CACHE_ENABLED=true (jeśli cache jest wyłączony, aplikacja powinna działać bez cache)
4. Sprawdź limity zasobów Redis (może brakować pamięci)

### Problem: Frontend nie łączy się z API

**Objawy:**
- Błędy CORS w przeglądarce
- "Network Error" w DevTools
- Błędy 404 przy wywołaniach API

**Diagnostyka:**

```bash
# Sprawdź konfigurację API URL w przeglądarce
# Otwórz DevTools → Console i sprawdź:
console.log(process.env.NEXT_PUBLIC_API_URL)

# Sprawdź czy API Gateway działa
curl http://localhost:8083/api/health

# Sprawdź CORS headers
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:8083/api/auth/login -v

# Sprawdź konfigurację ALLOWED_ORIGINS
kubectl get configmap api-gateway-config -n usosweb -o yaml | grep ALLOWED_ORIGINS
```

**Rozwiązania:**
1. Sprawdź zmienną NEXT_PUBLIC_API_URL w frontendzie
2. W produkcji użyj względnych ścieżek (pusty string) - Ingress obsłuży routing
3. Dodaj swój origin do ALLOWED_ORIGINS w ConfigMap
4. Sprawdź czy API Gateway jest dostępny pod wskazanym adresem

### Problem: Migracje nie działają

**Objawy:**
- Błędy przy uruchamianiu migracji
- Tabele nie są tworzone
- Błędy "relation does not exist"

**Diagnostyka:**

```bash
# Sprawdź logi migracji
docker compose logs migrate
# lub
kubectl logs -n usosweb job/migrate

# Sprawdź czy migracje są w odpowiednim katalogu
ls -la src/backend/database/migrations/

# Sprawdź wersję migracji w bazie
docker compose exec postgres psql -U postgres -d mydb -c "SELECT * FROM schema_migrations;"
```

**Rozwiązania:**
1. Sprawdź połączenie z bazą danych
2. Sprawdź czy pliki migracji są w katalogu migrations/
3. Sprawdź czy migracje mają poprawne nazwy (000001_*.up.sql)
4. Sprawdź uprawnienia użytkownika bazy danych
5. W przypadku błędów, sprawdź logi PostgreSQL

### Problem: Wysokie użycie zasobów

**Objawy:**
- Pody są restartowane przez Kubernetes
- Wolne działanie aplikacji
- Błędy "out of memory"

**Diagnostyka:**

```bash
# Sprawdź użycie zasobów
kubectl top pods -n usosweb

# Sprawdź limity
kubectl describe pod <pod-name> -n usosweb | grep -A 5 "Limits"

# Sprawdź metryki (jeśli Prometheus jest skonfigurowany)
curl http://localhost:9090/metrics
```

**Rozwiązania:**
1. Zwiększ limity zasobów w deploymentach
2. Sprawdź leaky connections do bazy danych
3. Sprawdź czy cache działa poprawnie (zmniejsza obciążenie bazy)
4. Zoptymalizuj zapytania do bazy danych
5. Rozważ skalowanie poziome

## Konfiguracja Bezpieczeństwa i Wydajności

### Bezpieczeństwo

**Walidacja Haseł:**

System wymusza następujące zasady dla haseł:
- Minimalna długość: 8 znaków
- Wymagane: wielka litera, mała litera, cyfra, znak specjalny
- Hasła są hashowane przy użyciu bcrypt przed zapisaniem w bazie danych

**Przechowywanie Haseł:**

- Hasła nie są przechowywane w postaci jawnej
- W bazie danych przechowywane są tylko hashe bcrypt
- Wrażliwe dane (hasła, klucze) przechowywane są w Kubernetes Secrets
- Hasła nie są commitujowane do repozytorium

**JWT (JSON Web Tokens):**

- System wykorzystuje JWT do uwierzytelniania użytkowników
- Klucz JWT jest konfigurowany przez zmienną środowiskową `JWT_SECRET_KEY`
- Tokeny mają czas wygaśnięcia konfigurowalny w kodzie
- Refresh tokens są przechowywane w bazie danych i mogą być unieważniane
- Tokeny są przechowywane w cookies HttpOnly dla bezpieczeństwa

**HTTPS/SSL:**

- W środowisku produkcyjnym system wykorzystuje HTTPS
- Certyfikaty SSL są zarządzane przez cert-manager
- Cert-manager automatycznie generuje i odnawia certyfikaty Let's Encrypt
- Ingress jest skonfigurowany do wymuszania HTTPS

**CORS (Cross-Origin Resource Sharing):**

- System implementuje CORS z konfigurowalną listą dozwolonych originów
- Lista originów jest konfigurowana przez zmienną `ALLOWED_ORIGINS`
- System nie używa wildcard "*" w produkcji
- Dozwolone metody: GET, POST, PUT, DELETE, OPTIONS
- Credentials (cookies) są dozwolone dla skonfigurowanych originów

### Wydajność

1. **Cache:**
   - Cache'uj dane rzadko zmieniające się
   - Ustaw odpowiednie TTL
   - Invaliduj cache przy aktualizacji danych

**Baza Danych:**

- System wykorzystuje indeksy na często wyszukiwanych kolumnach (email, album_nr, status, daty)
- Indeksy są tworzone przez migracje bazy danych
- System wykorzystuje connection pooling przez standardowy pakiet `database/sql` w Go
- Zapytania są optymalizowane przez użycie odpowiednich indeksów i JOIN-ów

**Monitoring:**

- System eksportuje metryki Prometheus przez API Gateway (port 9090)
- Metryki obejmują: liczbę żądań, czas odpowiedzi, błędy
- Wszystkie serwisy logują operacje do plików logów
- Poziomy logowania: DEBUG, INFO, WARN, ERROR
- Health checks są skonfigurowane dla wszystkich serwisów (liveness i readiness probes)

### Deployment i Wersjonowanie

**Wersjonowanie:**

- System wykorzystuje semantyczne wersjonowanie dla obrazów Docker
- Obrazy są tagowane w formacie: `v1.0.0`, `latest`, `<branch-name>`
- Obrazy są przechowywane w GitHub Container Registry (ghcr.io)
- W produkcji można używać konkretnych wersji zamiast `latest`

**Rollout:**

- System wykorzystuje rolling updates w Kubernetes
- Rolling updates zapewniają zero-downtime deployment
- Kubernetes automatycznie zarządza replikami podczas aktualizacji
- System wspiera rollback przez `kubectl rollout undo`

**Backup:**

- System wspiera backup bazy danych przez standardowe narzędzia PostgreSQL (`pg_dump`)
- Backupi mogą być wykonywane ręcznie lub przez skrypty automatyzacji
- System nie implementuje automatycznego backupu - wymaga konfiguracji zewnętrznej
- Restore z backupów jest możliwy przez `psql` lub skrypty

## Kontakt i Wsparcie

Dokumentacja techniczna systemu USOSWEB. W przypadku pytań lub problemów, sprawdź logi serwisów i konfigurację deploymentu.

**Przydatne Komendy:**

```bash
# Status wszystkich serwisów
kubectl get all -n usosweb

# Logi wszystkich podów
kubectl logs -f -l app=<service-name> -n usosweb

# Opis poda (szczegóły konfiguracji)
kubectl describe pod <pod-name> -n usosweb

# Port forward do lokalnego dostępu
kubectl port-forward -n usosweb svc/api-gateway-service 8083:8083

# Shell do poda
kubectl exec -it <pod-name> -n usosweb -- /bin/sh
```
