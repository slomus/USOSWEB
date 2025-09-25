PROTO_DIR=api
OUT_DIR=gen
GOOGLEAPIS_DIR=../../tools/third_party/googleapis

AUTH_PROTO=$(PROTO_DIR)/auth.proto
COURSE_PROTO=$(PROTO_DIR)/course.proto
APPLICATIONS_PROTO=$(PROTO_DIR)/applications.proto
GRADES_PROTO=$(PROTO_DIR)/grades.proto

.PHONY: help generate-proto generate-auth generate-course generate-grades clean run test build

generate-auth:
	mkdir -p $(OUT_DIR)/auth
	protoc -I $(PROTO_DIR) \
		-I $(GOOGLEAPIS_DIR) \
		--go_out=$(OUT_DIR)/auth --go_opt=paths=source_relative \
		--go-grpc_out=$(OUT_DIR)/auth --go-grpc_opt=paths=source_relative \
		--grpc-gateway_out=$(OUT_DIR)/auth --grpc-gateway_opt=paths=source_relative \
		$(AUTH_PROTO)

generate-course:
	mkdir -p $(OUT_DIR)/course
	protoc -I $(PROTO_DIR) \
		-I $(GOOGLEAPIS_DIR) \
		--go_out=$(OUT_DIR)/course --go_opt=paths=source_relative \
		--go-grpc_out=$(OUT_DIR)/course --go-grpc_opt=paths=source_relative \
		--grpc-gateway_out=$(OUT_DIR)/course --grpc-gateway_opt=paths=source_relative \
		$(COURSE_PROTO)

generate-grades:
	mkdir -p $(OUT_DIR)/grades
	protoc -I $(PROTO_DIR) \
		-I $(GOOGLEAPIS_DIR) \
		--go_out=$(OUT_DIR)/grades --go_opt=paths=source_relative \
		--go-grpc_out=$(OUT_DIR)/grades --go-grpc_opt=paths=source_relative \
		--grpc-gateway_out=$(OUT_DIR)/grades --grpc-gateway_opt=paths=source_relative \
		$(GRADES_PROTO)

generate-applications:
	mkdir -p $(OUT_DIR)/applications
	protoc -I $(PROTO_DIR) \
		-I $(GOOGLEAPIS_DIR) \
		--go_out=$(OUT_DIR)/applications --go_opt=paths=source_relative \
		--go-grpc_out=$(OUT_DIR)/applications --go-grpc_opt=paths=source_relative \
		--grpc-gateway_out=$(OUT_DIR)/applications --grpc-gateway_opt=paths=source_relative \
		$(APPLICATIONS_PROTO)

run: generate-proto
	go run main.go

test:
	go test ./... -v

build: generate-proto
	CGO_ENABLED=0 GOOS=linux go build -o common-service main.go

deps:
	go mod tidy
	go mod download

check-deps:
	@which protoc > /dev/null || (echo "protoc nie jest zainstalowany" && exit 1)
	@which protoc-gen-go > /dev/null || (echo "protoc-gen-go nie jest zainstalowany" && exit 1)
	@which protoc-gen-go-grpc > /dev/null || (echo "protoc-gen-go-grpc nie jest zainstalowany" && exit 1)
	@which protoc-gen-grpc-gateway > /dev/null || (echo "protoc-gen-grpc-gateway nie jest zainstalowany" && exit 1)

fresh-run: clean generate-proto run

show-generated:
	@ls -la $(OUT_DIR)/auth/ 2>/dev/null || echo "  Brak plików auth"
	@ls -la $(OUT_DIR)/course/ 2>/dev/null || echo "  Brak plików course"

restart:
	@echo "Restartowanie Common Service..."
	@pkill -f "go run main.go" || true
	@sleep 2
	@make run
