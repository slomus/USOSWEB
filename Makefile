# Detect OS for cross-platform compatibility
ifeq ($(OS),Windows_NT)
    RM = del /Q
    PATH_SEP = \\
    SHELL_EXT = .bat
else
    RM = rm -f
    PATH_SEP = /
    SHELL_EXT = .sh
endif

.PHONY: build up down postgres-up postgres-down gateway-up gateway-down calendar-up calendar-down common-up common-down messaging-up messaging-down frontend-up frontend-down migrate migrate-create db-build db-reset db-seed seed-all k8s-deploy k8s-clean k8s-status k8s-logs help-windows

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


db-seed:
	docker-compose --profile seeder build --no-cache seeder || echo "Seeder używa postgres image - OK"
	docker-compose --profile seeder run --rm seeder


k8s-deploy:
	./scripts/deploy-all.sh

k8s-scale:
	./scripts/scale-services.sh $(SERVICE) $(REPLICAS)

k8s-clean:
	kubectl delete namespace usosweb

k8s-status:
	kubectl get pods -n usosweb
	kubectl get svc -n usosweb

k8s-logs:
	kubectl logs -f deployment/$(SERVICE) -n usosweb

# Windows batch alternatives
ifeq ($(OS),Windows_NT)
help-windows:
	@echo "Windows batch scripts available:"
	@echo "  scripts/db-build.bat         - Build database"
	@echo "  scripts/db-reset.bat         - Reset database"
	@echo "  scripts/docker-up.bat        - Start with Docker Compose"
	@echo "  scripts/docker-down.bat      - Stop Docker Compose"
	@echo "  scripts/deploy-all.bat       - Deploy to Kubernetes"
	@echo "  scripts/k8s-clean.bat        - Clean Kubernetes"
	@echo ""
	@echo "Example usage:"
	@echo "  scripts\\db-build.bat"
	@echo "  scripts\\deploy-all.bat"

windows-db-build:
	scripts$(PATH_SEP)db-build.bat

windows-deploy:
	scripts$(PATH_SEP)deploy-all.bat

windows-docker-up:
	scripts$(PATH_SEP)docker-up.bat

windows-docker-down:
	scripts$(PATH_SEP)docker-down.bat

windows-k8s-clean:
	scripts$(PATH_SEP)k8s-clean.bat

else
help-windows:
	@echo "Windows commands are only available on Windows."
	@echo "Use regular make commands on Unix systems."
endif

# Universal help
help:
ifeq ($(OS),Windows_NT)
	@echo "=== USOSWEB Makefile (Windows) ==="
	@echo ""
	@echo "Recommended: Use .bat scripts for better Windows support"
	@$(MAKE) help-windows
	@echo ""
	@echo "Unix-style commands (may have issues):"
else
	@echo "=== USOSWEB Makefile (Unix/macOS/Linux) ==="
	@echo ""
endif
	@echo "Docker Compose commands:"
	@echo "  make build           - Build all services"
	@echo "  make up              - Start all services"
	@echo "  make down            - Stop all services"
	@echo ""
	@echo "Database commands:"
	@echo "  make seed-all        - 🚀 Pełne seedowanie bazy (JEDNA KOMENDA!)"
	@echo "  make db-build        - Build and seed database"
	@echo "  make db-reset        - Reset database"
	@echo ""
	@echo "Kubernetes commands:"
	@echo "  make k8s-deploy      - Deploy to Kubernetes"
	@echo "  make k8s-status      - Show status"
	@echo "  make k8s-clean       - Clean namespace"
	@echo ""
	@echo "Examples:"
	@echo "  make db-build"
	@echo "  make k8s-deploy"


setup-db:
	@if command -v bash >/dev/null 2>&1; then \
		chmod +x ./scripts/setup-database.sh && ./scripts/setup-database.sh; \
	else \
		echo "Bash niedostępny. Na Windows uruchom scripts/setup-database.bat"; \
	fi

db-reset:
	docker-compose down
	docker volume rm $(docker volume ls -q | grep postgres) 2>/dev/null || true
	$(MAKE) setup-db

db-users:
	docker-compose --profile init run --rm init-users

db-relations:
	docker-compose --profile init run --rm init-relations

db-status:
	@docker-compose exec postgres psql -U postgres -d mydb -c "\dt" 2>/dev/null || echo "Baza niedostępna"
	@docker-compose exec postgres psql -U postgres -d mydb -c "SELECT COUNT(*) as users_count FROM users;" 2>/dev/null || echo "Tabela users niedostępna"

db-backup:
	@mkdir -p backups
	docker-compose exec postgres pg_dump -U postgres mydb > backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Pełne seedowanie bazy - JEDNA KOMENDA!
seed-all:
	@if command -v bash >/dev/null 2>&1; then \
		chmod +x ./scripts/seed-all.sh && ./scripts/seed-all.sh; \
	else \
		echo "Bash niedostępny. Na Windows uruchom scripts/seed-all.bat"; \
	fi
