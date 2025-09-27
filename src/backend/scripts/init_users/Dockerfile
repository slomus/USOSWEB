FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY scripts/init_users/init_users.go .
COPY scripts/init_users/go.mod .

RUN go mod tidy && go build -o init_users init_users.go

FROM alpine:latest

RUN apk --no-cache add ca-certificates curl

WORKDIR /app

COPY --from=builder /app/init_users .

CMD ["./init_users"]
