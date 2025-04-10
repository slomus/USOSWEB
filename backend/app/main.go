package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"

	"github.com/slomus/USOSWEB/backend/configs"
	"github.com/slomus/USOSWEB/backend/db"
)

func helloHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Hello, World!")
}

func main() {
	pgConfig := db.PostgresConfig{
		Host:     configs.Envs.DBHost,
		Port:     configs.Envs.DBPort,
		User:     configs.Envs.DBUser,
		Password: configs.Envs.DBPassword,
		DBName:   configs.Envs.DBName,
		SSLMode:  configs.Envs.DBSSLMode,
	}

	dbConn, err := db.NewPostgresStorage(pgConfig)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	defer dbConn.Close()

	initStorage(dbConn)

	fmt.Println("Database connection established")

	http.HandleFunc("/", helloHandler)

	fmt.Println("Starting server on :8080...")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		fmt.Printf("Error starting server: %s\n", err)
	}
}

func initStorage(db *sql.DB) {
	err := db.Ping()
	if err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	log.Println("Connected to database successfully")
}