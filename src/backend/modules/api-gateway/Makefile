COMMON_PROTO_DIR=src/backend/modules/common/api
COMMON_OUT_DIR=src/backend/modules/common/gen

# MSG_PROTO_DIR=src/backend/modules/messaging/api
# MSG_OUT_DIR=src/backend/modules/messaging/gen

COMMON_PROTO_FILES=$(wildcard $(COMMON_PROTO_DIR)/*.proto)
# MSG_PROTO_FILES=$(wildcard $(MSG_PROTO_DIR)/*.proto)
# protoc -I $(MSG_PROTO_DIR) \
# 	-I $(shell go list -f '{{ .Dir }}' -m github.com/grpc-ecosystem/grpc-gateway/v2) \
# 	--go_out $(MSG_OUT_DIR) --go-grpc_out $(MSG_OUT_DIR) \
# 	--grpc-gateway_out $(MSG_OUT_DIR) \
# 	$(MSG_PROTO_FILES)

generate-proto:
	protoc -I $(COMMON_PROTO_DIR) \
		-I $(shell go list -f '{{ .Dir }}' -m github.com/grpc-ecosystem/grpc-gateway/v2) \
		--go_out $(COMMON_OUT_DIR) --go-grpc_out $(COMMON_OUT_DIR) \
		--grpc-gateway_out $(COMMON_OUT_DIR) \
		$(COMMON_PROTO_FILES)