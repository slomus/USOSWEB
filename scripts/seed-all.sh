#!/bin/bash

set -e

echo "=========================================="
echo "  USOSWEB - Pełne seedowanie bazy danych"
echo "=========================================="
echo ""

# Sprawdź czy Docker Compose działa
if ! docker compose ps >/dev/null 2>&1; then
    echo "❌ BŁĄD: Docker Compose nie działa!"
    echo ""
    echo "Najpierw uruchom serwisy:"
    echo "  docker compose up -d --build"
    echo ""
    exit 1
fi

# Sprawdź czy postgres działa
if ! docker compose ps postgres | grep -q "Up"; then
    echo "❌ BŁĄD: PostgreSQL nie działa!"
    echo ""
    echo "Najpierw uruchom serwisy:"
    echo "  docker compose up -d --build"
    echo ""
    exit 1
fi

echo "✅ Serwisy działają. Rozpoczynam seedowanie..."
echo ""

# Kolory
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}[1/7]${NC} Uruchamianie podstawowych serwisów..."
docker compose up -d postgres redis

echo -e "${BLUE}[2/7]${NC} Czekam na gotowość PostgreSQL..."
sleep 5

echo -e "${BLUE}[3/7]${NC} Uruchamianie migracji..."
docker compose up migrate

echo -e "${BLUE}[4/7]${NC} Wgrywanie danych podstawowych (mock_data.sql)..."
docker compose run --rm seeder

echo -e "${BLUE}[5/7]${NC} Uruchamianie API Gateway i Common..."
docker compose up -d api-gateway common
sleep 3

echo -e "${BLUE}[6/7]${NC} Rejestrowanie użytkowników (9 osób)..."
docker compose run --rm init-users

echo -e "${BLUE}[7/7]${NC} Wgrywanie relacji (wiadomości, oceny, etc.)..."
docker compose run --rm init-relations

echo ""
read -p "Czy chcesz wygenerować dodatkowe dane (91 użytkowników + duzo relacji)? [t/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[TtYy]$ ]]; then
    echo -e "${YELLOW}[BONUS]${NC} Generowanie dodatkowych danych..."
    docker compose run --rm generator
fi

echo ""
echo -e "${GREEN}=========================================="
echo -e "  ✓ Seedowanie zakończone pomyślnie!"
echo -e "==========================================${NC}"
echo ""
echo "Możesz teraz uruchomić wszystkie serwisy:"
echo "  docker compose up -d"
echo ""
echo "Dane logowania:"
echo "  • admin@system.com / SystemAdmin123!"
echo "  • michal.grzonkowski@student.edu.pl / Michal123!"
echo "  • jan.kowalski@student.edu.pl / Jan123!"
echo "  • anna.nowak@student.edu.pl / Anna123!"
echo "  • emil.kosicki@edu.pl / Emil123!"
echo ""

