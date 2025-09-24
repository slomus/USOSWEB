PROTO_DIR=api
GEN_DIR=gen
GOOGLEAPIS_DIR=../../tools/third_party/googleapis

generate-proto:
	mkdir -p $(GEN_DIR)/calendar
	protoc -I $(PROTO_DIR) \
		-I $(GOOGLEAPIS_DIR) \
		--go_out=$(GEN_DIR)/calendar --go_opt=paths=source_relative \
		--go-grpc_out=$(GEN_DIR)/calendar --go-grpc_opt=paths=source_relative \
		--grpc-gateway_out=$(GEN_DIR)/calendar --grpc-gateway_opt=paths=source_relative \
		$(PROTO_DIR)/calendar.proto
