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
	ENV                   string
	DBUser                string
	DBPassword            string
	DBHost                string
	DBPort                string
	DBName                string
	DBSSLMode             string
	JWTSecretKey          string
	JWTAccessTokenExpiry  int
	JWTRefreshTokenExpiry int

	// Service Discovery - gRPC endpoints
	CalendarServiceHost  string
	CalendarServicePort  string
	MessagingServiceHost string
	MessagingServicePort string
	CommonServiceHost    string
	CommonServicePort    string

	// Redis
	RedisHost     string
	RedisPort     string
	RedisPassword string
	RedisDB       int

	// Cache
	CacheEnabled    bool
	CacheDefaultTTL string

	// Secrets
	EmailAppSecretKey string
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
		ENV:                   getEnv("ENV", "development"),
		DBUser:                getEnv("DB_USER", "postgres"),
		DBPassword:            getEnv("DB_PASSWORD", ""),
		DBHost:                getEnv("DB_HOST", "localhost"),
		DBPort:                getEnv("DB_PORT", "5432"),
		DBName:                getEnv("DB_NAME", "ecom"),
		DBSSLMode:             getEnv("DB_SSLMODE", "disable"),
		JWTSecretKey:          getEnv("JWT_SECRET_KEY", "supersecret"),
		JWTAccessTokenExpiry:  getEnvAsInt("JWT_ACCESS_TOKEN_EXPIRY", 15),
		JWTRefreshTokenExpiry: getEnvAsInt("JWT_REFRESH_TOKEN_EXPIRY", 168), // 7 dni

		// Service Discovery - nazwy muszą pasować do docker-compose.yml
		CalendarServiceHost:  getEnv("CALENDAR_SERVICE_HOST", "calendar"),
		CalendarServicePort:  getEnv("CALENDAR_SERVICE_PORT", "3001"),
		MessagingServiceHost: getEnv("MESSAGING_SERVICE_HOST", "messaging"),
		MessagingServicePort: getEnv("MESSAGING_SERVICE_PORT", "3002"),
		CommonServiceHost:    getEnv("COMMON_SERVICE_HOST", "common"),
		CommonServicePort:    getEnv("COMMON_SERVICE_PORT", "3003"),

		RedisHost:     getEnv("REDIS_HOST", "localhost"),
		RedisPort:     getEnv("REDIS_PORT", "6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       getEnvAsInt("REDIS_DB", 0),

		// Cache
		CacheEnabled:    getEnvAsBool("CACHE_ENABLED", true),
		CacheDefaultTTL: getEnv("CACHE_DEFAULT_TTL", "1h"),

		// Secrets
		EmailAppSecretKey: getEnv("EMAIL_APP_SECRET_KEY", ""),
	}
}

// GetServiceEndpoint returns full service endpoint
func (c Config) GetCalendarEndpoint() string {
	return fmt.Sprintf("%s:%s", c.CalendarServiceHost, c.CalendarServicePort)
}

func (c Config) GetMessagingEndpoint() string {
	return fmt.Sprintf("%s:%s", c.MessagingServiceHost, c.MessagingServicePort)
}

func (c Config) GetCommonEndpoint() string {
	return fmt.Sprintf("%s:%s", c.CommonServiceHost, c.CommonServicePort)
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

func getEnvAsBool(key string, fallback bool) bool {
	if value, ok := os.LookupEnv(key); ok {
		boolValue, err := strconv.ParseBool(value)
		if err != nil {
			return fallback
		}
		return boolValue
	}
	return fallback
}

func (c Config) GetRedisEndpoint() string {
	return fmt.Sprintf("%s:%s", c.RedisHost, c.RedisPort)
}
