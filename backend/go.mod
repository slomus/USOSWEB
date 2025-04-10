module github.com/slomus/USOSWEB/backend

go 1.22.0

toolchain go1.23.8

replace github.com/slomus/USOSWEB/backend => ./

replace github.com/slomus/USOSWEB/backend/configs => ./configs

replace github.com/slomus/USOSWEB/backend/db => ./db

require (
	github.com/DATA-DOG/go-sqlmock v1.5.2 // indirect
	github.com/golang-migrate/migrate/v4 v4.18.2 // indirect
	github.com/hashicorp/errwrap v1.1.0 // indirect
	github.com/hashicorp/go-multierror v1.1.1 // indirect
	github.com/joho/godotenv v1.5.1 // indirect
	github.com/lib/pq v1.10.9 // indirect
	go.uber.org/atomic v1.7.0 // indirect
)
