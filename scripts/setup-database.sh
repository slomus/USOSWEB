#!/bin/bash


set -e


check_docker() {
    if ! command -v docker &> /dev/null; then
        echo " Docker nie jest zainstalowany lub niedostępny"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        echo " Docker daemon nie działa. Uruchom Docker Desktop."
        exit 1
    fi
}

check_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE="docker-compose"
    elif docker compose version &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
    else
        echo " docker-compose lub docker compose nie jest dostępny"
        exit 1
    fi

}

wait_for_postgres() {

    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if $DOCKER_COMPOSE ps postgres | grep -q "Up"; then
            sleep 2  # Dodatkowe 2 sekundy na pewność
            return 0
        fi

        echo "   Próba $attempt/$max_attempts - PostgreSQL jeszcze się uruchamia..."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo "PostgreSQL nie uruchomił się w oczekiwanym czasie"
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

check_docker
check_docker_compose

$DOCKER_COMPOSE up -d postgres
wait_for_postgres

$DOCKER_COMPOSE run --rm migrate

$DOCKER_COMPOSE --profile seeder build --no-cache seeder

$DOCKER_COMPOSE --profile seeder run --rm seeder

verify_seeder

$DOCKER_COMPOSE --profile init run --rm init-users
$DOCKER_COMPOSE --profile generator build --no-cache generator || exit 1
$DOCKER_COMPOSE --profile generator run --rm generator || exit 1

if ! verify_users; then
    exit 1
fi

