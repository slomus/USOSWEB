FROM golang:1.23-alpine

WORKDIR /app

RUN go install github.com/air-verse/air@latest

COPY go.* ./
RUN go mod download

EXPOSE 8080

ENTRYPOINT ["air", "-c", ".air.toml"]
