package cache

import "time"
import "fmt"

type CacheConfig struct {
	CoursesTTL time.Duration

	StudentsTTL time.Duration

	MessagesTTL time.Duration

	CalendarTTL time.Duration

	SessionTTL time.Duration

	AuthTokenTTL time.Duration

	UserProfileTTL time.Duration
}

func DefaultCacheConfig() *CacheConfig {
	return &CacheConfig{
		CoursesTTL:     1 * time.Hour,
		StudentsTTL:    30 * time.Minute,
		MessagesTTL:    15 * time.Minute,
		CalendarTTL:    30 * time.Minute,
		SessionTTL:     30 * time.Minute,
		AuthTokenTTL:   15 * time.Minute,
		UserProfileTTL: 45 * time.Minute,
	}
}

// GenerateKey tworzy standardowy klucz cache
func GenerateKey(service, entity string, id interface{}) string {
	return fmt.Sprintf("usosweb:%s:%s:%v", service, entity, id)
}

// Key examples:
// "usosweb:courses:list:all"
// "usosweb:courses:detail:123"
// "usosweb:auth:session:user:456"
// "usosweb:auth:profile:789"
