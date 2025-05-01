FROM golang:1.22-alpine AS builder

WORKDIR /app

# Kopiujemy pliki go.mod i go.sum z katalogu backend
COPY ../../go.mod ../../go.sum ./
RUN go mod download

# Kopiujemy cały kod źródłowy backendu
COPY ../../ ./

# Budujemy binarkę migracji
WORKDIR /app/database
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /app/migrate main.go

# Finalny obraz
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/migrate .
COPY migrations ./migrations
ENTRYPOINT ["/app/migrate"]
