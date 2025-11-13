# 🌱 Seedowanie bazy danych USOSWEB

## 🚀 Dwie komendy - gotowa baza!

### Dla Unix/macOS/Linux:
```bash
# 1. Uruchom serwisy
docker compose up -d --build

# 2. Zaseeduj bazę
make seed-all
```

### Dla Windows:
```cmd
docker compose up -d --build
scripts\seed-all.bat
```

**WAŻNE:** Najpierw musisz uruchomić serwisy (`docker compose up`), ponieważ skrypt seedowania potrzebuje działającego PostgreSQL, API Gateway i Common Service.

---

## 📦 Co jest wgrywane?

### 1. **Dane podstawowe** (`mock_data.sql`)
- 4 wydziały (Informatyka, Matematyka, Fizyka, Mechatronika)
- 8 budynków
- 5 kategorii wniosków

### 2. **Użytkownicy** (`init_users.go`)
9 użytkowników:
- **3 studentów**: Michał Grzonkowski, Jan Kowalski, Anna Nowak
- **3 wykładowców**: Emil Kosicki, Weronika Mazurek, Kacper Pawlak
- **2 adminów**: Agnieszka Kowalik, Karol Kudłacz
- **1 system admin**: admin@system.com

### 3. **Relacje** (`init_relations.sql`)
- 4 wiadomości z odbiorcami
- 3 załączniki
- 2 podania studentów
- 5 ankiet
- 7 przypisań nauczycieli do zajęć
- Zapisy studentów na zajęcia
- 15+ ocen

### 4. **Generator danych** (opcjonalny - `generator/main.go`)
Generuje produktowe dane:
- 60+ przedmiotów (Informatyka, Matematyka, Fizyka, Mechatronika)
- 17 kursów
- 15 modułów
- Setki zajęć (wykłady, ćwiczenia, laboratoria)
- **91 dodatkowych użytkowników**:
  - 61 studentów
  - 20 wykładowców
  - 10 adminów
- Relacje: wiadomości, podania, oceny, ankiety, harmonogramy, egzaminy
- Kalendarz akademicki (sesje, przerwy, święta)

---

## 🔍 Kolejność wykonania

Skrypt automatycznie wykonuje w odpowiedniej kolejności:

```
1. ✓ Uruchomienie PostgreSQL i Redis
2. ✓ Migracje bazy danych
3. ✓ Wgranie danych podstawowych (mock_data.sql)
4. ✓ Uruchomienie API Gateway i Common
5. ✓ Rejestracja 9 użytkowników (przez API)
6. ✓ Wgranie relacji (init_relations.sql)
7. ? Opcjonalnie: Generator (91 użytkowników + duże dane)
```

---

## 🔐 Dane logowania

Po seedowaniu możesz się zalogować jako:

| Email | Hasło | Rola |
|-------|-------|------|
| `admin@system.com` | `SystemAdmin123!` | System Admin |
| `michal.grzonkowski@student.edu.pl` | `Michal123!` | Student |
| `jan.kowalski@student.edu.pl` | `Jan123!` | Student |
| `anna.nowak@student.edu.pl` | `Anna123!` | Student |
| `emil.kosicki@edu.pl` | `Emil123!` | Wykładowca |
| `weronika.mazurek@edu.pl` | `Weronika123!` | Wykładowca |
| `kacper.pawlak@edu.pl` | `Kacper123!` | Wykładowca |
| `agnieszka.kowalik@edu.pl` | `Agnieszka123!` | Admin |
| `karol.kudlacz@student.ukw.edu.pl` | `Karol123!` | Admin |

---

## 🛠 Manualne seedowanie (krok po kroku)

Jeśli chcesz wykonać kroki ręcznie (zamiast `make seed-all`):

```bash
# 0. Najpierw uruchom wszystkie serwisy!
docker compose up -d --build

# Teraz możesz ręcznie wykonać:

# 1. Dane podstawowe
docker compose run --rm seeder

# 2. Użytkownicy
docker compose run --rm init-users

# 3. Relacje
docker compose run --rm init-relations

# 4. (Opcjonalnie) Generator
docker compose run --rm generator
```

**Uwaga:** Skrypt `make seed-all` robi to wszystko automatycznie i w odpowiedniej kolejności!

---

## 📁 Struktura plików

```
seeds/
├── README.md                 ← Ten plik
├── mock_data.sql            ← Podstawowe dane (wydziały, budynki)
├── init_relations.sql       ← Relacje dla 9 użytkowników
└── generator/
    ├── main.go              ← Generator dużych danych
    ├── Dockerfile
    └── go.mod
```

---

## ⚠️ Uwagi

- **mock_data.sql** czyści wszystkie dane (TRUNCATE CASCADE)!
- Generator może działać 2-3 minuty (tworzy 100 użytkowników przez API)
- Wszystkie hasła są w formacie `Imie123!` (dla bezpieczeństwa zmień je w produkcji!)
- Skrypt automatycznie czeka na gotowość serwisów

---

## 🔄 Reset bazy

Jeśli chcesz wyczyścić i zacząć od nowa:

```bash
# Unix/macOS/Linux
make db-reset

# Windows
scripts\db-reset.bat
```

---

## ❓ Problemy?

Jeśli coś nie działa:

1. Sprawdź czy PostgreSQL jest uruchomiony: `docker compose ps`
2. Sprawdź logi: `docker compose logs postgres`
3. Sprawdź czy migracje przeszły: `docker compose logs migrate`
4. Sprawdź czy API działa: `curl http://localhost:8083/health`

