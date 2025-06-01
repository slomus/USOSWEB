.PHONY: build up down postgres-up postgres-down calendar-up calendar-down common-up common-down messaging-up messaging-down frontend-up frontend-down migrate migrate-create

build:
	docker-compose build

up:
	docker-compose up

down:
	docker-compose down

postgres-up:
	docker-compose up postgres

postgres-down:
	docker-compose down postgres

gateway-up:
	docker-compose up api-gateway

gateway-down:
	docker-compose down api-gateway

calendar-up:
	docker-compose up calendar

calendar-down:
	docker-compose down calendar

common-up:
	docker-compose up common

common-down:
	docker-compose down common

messaging-up:
	docker-compose up messaging

messaging-down:
	docker-compose down messaging

frontend-up:
	docker-compose up frontend

frontend-down:
	docker-compose down frontend

migrate:
	docker-compose run --rm migrate $(filter-out $@,$(MAKECMDGOALS))

migrate-create:
	@read -p "Migration name: " name; \
	docker run --rm -v "$$(pwd)/src/backend/Database/migrations:/migrations" migrate/migrate create -ext sql -dir /migrations -seq $$name


db-build: 
	docker-compose down -v
	docker-compose rm -f migrate || true
	docker images | grep 'usosweb.*migrate' | awk '{print $$3}' | xargs -r docker rmi -f || true
	docker-compose build --no-cache migrate
	docker-compose up -d postgres 
	@timeout 10 bash -c 'until docker-compose exec postgres pg_isready -h localhost -p 5432 > /dev/null 2>&1; do echo "Czekam na PostgreSQL"; sleep 2; done' || echo "Timeout - PostgreSQL może nie być gotowy"
	docker-compose run --rm migrate up
	docker-compose --profile seeder run --rm seeder


db-reset:
	docker-compose down -v
	docker-compose up -d postgres
	@echo "Czekam na PostgreSQL"
	@sleep 10
	docker-compose run migrate
	docker-compose --profile seeder run seeder


db-seed:
	docker-compose --profile seeder build --no-cache seeder || echo "Seeder używa postgres image - OK"
	docker-compose --profile seeder run --rm seeder
