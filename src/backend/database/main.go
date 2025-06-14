package main

import (
	"fmt"
	"github.com/golang-migrate/migrate/v4"
	postgresMigrate "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/lib/pq"
	"github.com/slomus/USOSWEB/src/backend/configs"
	"github.com/slomus/USOSWEB/src/backend/pkg/logger"
	"os"
	"time"
)

var log = logger.NewLogger("migration-service")

func main() {
	start := time.Now()
	log.LogInfo("Starting database migration service")

	if len(os.Args) < 2 {
		log.LogError("Missing migration command (up/down)", nil)
		os.Exit(1)
	}

	cmd := os.Args[len(os.Args)-1]
	log.LogInfo(fmt.Sprintf("Migration command: %s", cmd))

	pgConfig := configs.PostgresConfig{
		Host:     configs.Envs.DBHost,
		Port:     configs.Envs.DBPort,
		User:     configs.Envs.DBUser,
		Password: configs.Envs.DBPassword,
		DBName:   configs.Envs.DBName,
		SSLMode:  configs.Envs.DBSSLMode,
	}

	log.LogInfo(fmt.Sprintf("Connecting to database: %s:%s/%s", pgConfig.Host, pgConfig.Port, pgConfig.DBName))

	dbConn, err := configs.NewPostgresStorage(pgConfig)
	if err != nil {
		log.LogError("Failed to connect to database", err)
		os.Exit(1)
	}
	defer dbConn.Close()

	log.LogInfo("Database connection established")

	driver, err := postgresMigrate.WithInstance(dbConn, &postgresMigrate.Config{})
	if err != nil {
		log.LogError("Failed to create migration driver", err)
		os.Exit(1)
	}

	log.LogDebug("Migration driver created successfully")

	m, err := migrate.NewWithDatabaseInstance(
		"file:///app/migrations",
		"postgres",
		driver,
	)
	if err != nil {
		log.LogError("Failed to create migration instance", err)
		os.Exit(1)
	}

	log.LogDebug("Migration instance created successfully")

	version, dirty, err := m.Version()
	if err != nil && err != migrate.ErrNilVersion {
		log.LogWarn(fmt.Sprintf("Failed to get current version: %v", err))
	} else {
		if err == migrate.ErrNilVersion {
			log.LogInfo("Database has no migrations applied yet")
		} else {
			log.LogInfo(fmt.Sprintf("Current migration version: %d (dirty: %v)", version, dirty))
		}
	}

	switch cmd {
	case "up":
		log.LogInfo("Running UP migrations...")
		if err := m.Up(); err != nil {
			if err == migrate.ErrNoChange {
				log.LogInfo("No new migrations to apply")
			} else {
				log.LogError("Migration UP failed", err)
				os.Exit(1)
			}
		} else {
			log.LogInfo("UP migrations completed successfully")
		}

	case "down":
		log.LogInfo("Running DOWN migrations...")
		if err := m.Down(); err != nil {
			if err == migrate.ErrNoChange {
				log.LogInfo("No migrations to rollback")
			} else {
				log.LogError("Migration DOWN failed", err)
				os.Exit(1)
			}
		} else {
			log.LogInfo("DOWN migrations completed successfully")
		}

	default:
		log.LogError(fmt.Sprintf("Unknown migration command: %s. Use 'up' or 'down'", cmd), nil)
		os.Exit(1)
	}

	finalVersion, finalDirty, err := m.Version()
	if err != nil && err != migrate.ErrNilVersion {
		log.LogWarn(fmt.Sprintf("Failed to get final version: %v", err))
	} else {
		if err == migrate.ErrNilVersion {
			log.LogInfo("Database has no migrations after operation")
		} else {
			log.LogInfo(fmt.Sprintf("Final migration version: %d (dirty: %v)", finalVersion, finalDirty))
		}
	}

	duration := time.Since(start).Milliseconds()
	log.LogInfo(fmt.Sprintf("Migration service completed in %dms", duration))
}
