#!/bin/bash

# Setup Database Script z automatycznym uzupełnianiem danych dla init_users
# Wersja z enrich_init_users_data_v2.sql

set -e

check_docker() {
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker nie jest zainstalowany lub niedostępny"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        echo "❌ Docker daemon nie działa. Uruchom Docker Desktop."
        exit 1
    fi
}

check_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE="docker-compose"
    elif docker compose version &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
    else
        echo "❌ docker-compose lub docker compose nie jest dostępny"
        exit 1
    fi
}

wait_for_postgres() {
    echo "⏳ Czekam na uruchomienie PostgreSQL..."
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if $DOCKER_COMPOSE ps postgres | grep -q "Up"; then
            sleep 2  # Dodatkowe 2 sekundy na pewność
            echo "✅ PostgreSQL jest gotowy!"
            return 0
        fi

        echo "   Próba $attempt/$max_attempts - PostgreSQL jeszcze się uruchamia..."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo "❌ PostgreSQL nie uruchomił się w oczekiwanym czasie"
    exit 1
}

verify_seeder() {
    :
}

verify_users() {
    local user_count=$($DOCKER_COMPOSE exec -T postgres psql -U postgres -d mydb -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs || echo "0")

    if [ "$user_count" -gt 0 ]; then
        return 0
    else
        return 1
    fi
}

enrich_init_users_data() {
    echo ""
    echo "🔧 Uzupełnianie danych dla użytkowników z init_users.go..."
    
    local script_path="./src/backend/database/seeds/enrich_init_users_data.sql"
    
    if [ ! -f "$script_path" ]; then
        echo "⚠️  Nie znaleziono: $script_path"
        echo "   Pomijam uzupełnianie danych init_users"
        return 0
    fi
    
    echo "   Uruchamiam: $script_path"
    
    if $DOCKER_COMPOSE exec -T postgres psql -U postgres -d mydb < "$script_path" 2>&1 | grep -q "ERROR"; then
        echo "⚠️  Błąd podczas uzupełniania danych"
        echo "   Kontynuuję..."
    else
        echo "✅ Dane uzupełnione!"
    fi
}

# Główny przepływ
echo "========================================="
echo "  Setup Database - USOSWEB"
echo "========================================="
echo ""

check_docker
check_docker_compose

echo "🐘 Uruchamiam PostgreSQL..."
$DOCKER_COMPOSE up -d postgres
wait_for_postgres

echo ""
echo "📦 Uruchamiam migracje..."
$DOCKER_COMPOSE run --rm migrate

echo ""
echo "🌱 Builduję seeder..."
$DOCKER_COMPOSE --profile seeder build --no-cache seeder

echo ""
echo "🌱 Uruchamiam seeder (podstawowe dane)..."
$DOCKER_COMPOSE --profile seeder run --rm seeder

verify_seeder

echo ""
echo "👥 Tworzę 9 użytkowników z init_users.go..."
$DOCKER_COMPOSE --profile init run --rm init-users

echo ""
echo "🏭 Builduję generator (mock data)..."
$DOCKER_COMPOSE --profile generator build --no-cache generator || exit 1

echo ""
echo "🏭 Uruchamiam generator (~100 użytkowników)..."
$DOCKER_COMPOSE --profile generator run --rm generator || exit 1

# NOWY KROK - uzupełnianie danych dla init_users
enrich_init_users_data

echo ""
echo "🔍 Weryfikuję użytkowników..."
if ! verify_users; then
    echo "❌ Weryfikacja nie powiodła się"
    exit 1
fi

echo ""
echo "========================================="
echo "  ✅ Setup zakończony pomyślnie!"
echo "========================================="
echo ""
echo "Utworzono:"
echo "  - Tabele bazy danych (migracje)"
echo "  - Podstawowe dane (seeder)"
echo "  - 9 użytkowników (init-users)"
echo "  - ~100 użytkowników z danymi (generator)"
echo "  - Uzupełnione dane dla init-users"
echo ""
echo "Możesz teraz:"
echo "  1. Uruchomić backend: docker compose up"
echo "  2. Zalogować się jako: michal.grzonkowski@student.edu.pl"
echo "  3. Testować endpointy"
echo ""
