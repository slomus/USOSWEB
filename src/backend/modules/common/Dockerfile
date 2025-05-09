FROM golang:1.23-alpine AS builder


WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

WORKDIR /app/modules/common
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o app .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/modules/common/app .
EXPOSE 3003
CMD ["./app"]
