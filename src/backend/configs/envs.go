package configs

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	PublicHost            string
	Port                  string
	DBUser                string
	DBPassword            string
	DBHost                string
	DBPort                string
	DBName                string
	DBSSLMode             string
	JWTSecretKey          string
	JWTAccessTokenExpiry  int
	JWTRefreshTokenExpiry int
}

var Envs = initConfig()

func initConfig() Config {
	err := godotenv.Load()
	if err != nil {
		fmt.Println("Error loading .env file")
	}

	return Config{
		PublicHost:            getEnv("PUBLIC_HOST", "http://localhost"),
		Port:                  getEnv("PORT", "8080"),
		DBUser:                getEnv("DB_USER", "postgres"),
		DBPassword:            getEnv("DB_PASSWORD", ""),
		DBHost:                getEnv("DB_HOST", "localhost"),
		DBPort:                getEnv("DB_PORT", "5432"),
		DBName:                getEnv("DB_NAME", "ecom"),
		DBSSLMode:             getEnv("DB_SSL_MODE", "disable"),
		JWTSecretKey:          getEnv("JWT_SECRET_KEY", "supersecret"),
		JWTAccessTokenExpiry:  getEnvAsInt("JWT_ACCESS_TOKEN_EXPIRY", 15),
		JWTRefreshTokenExpiry: getEnvAsInt("JWT_REFRESH_TOKEN_EXPIRY", 168), // 7 dni
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func getEnvAsInt(key string, fallback int) int {
	if value, ok := os.LookupEnv(key); ok {
		intValue, err := strconv.Atoi(value)
		if err != nil {
			return fallback
		}
		return intValue
	}
	return fallback
}
