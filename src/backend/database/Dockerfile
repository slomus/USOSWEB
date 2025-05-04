FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

COPY ../go.mod ../go.sum ./
RUN go mod download

COPY ../ ./

WORKDIR /app/database
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w -extldflags '-static'" -tags netgo -o /migrate main.go

FROM alpine:latest
WORKDIR /app
COPY --from=builder /migrate /app/migrate
COPY ../.env /app/.env
COPY database/migrations ./migrations

RUN chmod +x /app/migrate
ENTRYPOINT ["/app/migrate"]
