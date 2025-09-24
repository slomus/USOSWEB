COMMON_PROTO_DIR=../common/api
COMMON_GEN_DIR=../common/gen
COMMON_PROTO_FILES=$(wildcard $(COMMON_PROTO_DIR)/*.proto)
GOOGLEAPIS_DIR=../../tools/third_party/googleapis

generate-proto:
	mkdir -p $(COMMON_GEN_DIR)

	@for proto in $(COMMON_PROTO_FILES); do \
		filename=$$(basename $$proto .proto); \
		output_dir=$(COMMON_GEN_DIR)/$$filename; \
		mkdir -p $$output_dir; \
		echo "Generating $$filename.proto to $$output_dir"; \
		protoc -I $(COMMON_PROTO_DIR) \
			-I $(GOOGLEAPIS_DIR) \
			--go_out=$$output_dir --go_opt=paths=source_relative \
			--go-grpc_out=$$output_dir --go-grpc_opt=paths=source_relative \
			--grpc-gateway_out=$$output_dir --grpc-gateway_opt=paths=source_relative \
			$$proto; \
	done
