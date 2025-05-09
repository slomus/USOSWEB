FROM golang:1.23-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git make protobuf

RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest \
    && go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest \
    && go install github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-grpc-gateway@latest

COPY go.mod go.sum ./
RUN go mod download

COPY . .

WORKDIR /app/modules/api-gateway
RUN make generate-proto

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o app .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/modules/api-gateway/app .
EXPOSE 8083
CMD ["./app"]
