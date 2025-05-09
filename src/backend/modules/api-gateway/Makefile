COMMON_PROTO_DIR=/app/modules/common/api
COMMON_OUT_DIR=/app/modules/common/gen/auth
COMMON_PROTO_FILES=$(wildcard $(COMMON_PROTO_DIR)/*.proto)

generate-proto:
	mkdir -p $(COMMON_OUT_DIR)
	protoc -I $(COMMON_PROTO_DIR) \
		-I $$(go list -f '{{ .Dir }}' -m github.com/grpc-ecosystem/grpc-gateway/v2) \
		--go_out=$(COMMON_OUT_DIR) --go_opt=paths=source_relative \
		--go-grpc_out=$(COMMON_OUT_DIR) --go-grpc_opt=paths=source_relative \
		--grpc-gateway_out=$(COMMON_OUT_DIR) --grpc-gateway_opt=paths=source_relative \
		$(COMMON_PROTO_FILES)
