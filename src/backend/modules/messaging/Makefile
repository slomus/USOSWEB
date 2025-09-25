PROTO_DIR := api
GEN_DIR := gen/messaging

.PHONY: generate-proto clean

generate-proto:
	@mkdir -p $(GEN_DIR)
	protoc -I $(PROTO_DIR) \
		-I ../../tools/third_party/googleapis \
		--go_out=$(GEN_DIR) --go_opt=paths=source_relative \
		--go-grpc_out=$(GEN_DIR) --go-grpc_opt=paths=source_relative \
		--grpc-gateway_out=$(GEN_DIR) --grpc-gateway_opt=paths=source_relative \
		$(PROTO_DIR)/messaging.proto

clean:
	rm -rf $(GEN_DIR)

