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
