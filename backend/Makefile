.PHONY: migrate migrate-up migrate-down

migrate:
	@docker-compose run --rm migrate create -ext sql -dir /migrations -seq $(filter-out $@,$(MAKECMDGOALS))

migrate-up:
	@docker-compose exec backend go run app/migrate/main.go up

migrate-down:
	@docker-compose exec backend go run app/migrate/main.go down
