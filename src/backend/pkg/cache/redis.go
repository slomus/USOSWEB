package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/redis/go-redis/v9"
	"github.com/slomus/USOSWEB/src/backend/pkg/logger"
	"time"
)

type RedisCache struct {
	client *redis.Client
	logger *logger.Logger
}

func NewRedisCache(addr, password string, db int) *RedisCache {
	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})

	return &RedisCache{
		client: rdb,
		logger: logger.NewLoggerWithFile("redis-cache", "/app/logs/redis.log"),
	}
}

// Sets saves the value in cache (with TTL)
func (r *RedisCache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	json_data, err := json.Marshal(value)
	if err != nil {
		r.logger.LogError("Failed to marshal data for cache", err)
		return err
	}

	err = r.client.Set(ctx, key, json_data, ttl).Err()
	if err != nil {
		r.logger.LogError(fmt.Sprintf("Failed to set cache key: %s", key), err)
		return err
	}

	r.logger.LogInfo(fmt.Sprintf("Cache SET: %s (TTL: %v)", key, ttl))
	return nil
}

// Get gets the data from the cache
func (r *RedisCache) Get(ctx context.Context, key string, dest interface{}) error {
	data, err := r.client.Get(ctx, key).Result()
	if err == redis.Nil {
		r.logger.LogInfo(fmt.Sprintf("Cache MISS: %s", key))
		return ErrCacheMiss
	}
	if err != nil {
		r.logger.LogError(fmt.Sprintf("Failed to get cache key: %s", key), err)
		return err
	}

	err = json.Unmarshal([]byte(data), dest)
	if err != nil {
		r.logger.LogError("Failed to unmarshal cache data", err)
		return err
	}

	r.logger.LogInfo(fmt.Sprintf("Cache HIT: %s", key))
	return nil
}

// Delete deletes the key in the cache
func (r *RedisCache) Delete(ctx context.Context, key string) error {
	err := r.client.Del(ctx, key).Err()
	if err != nil {
		r.logger.LogError(fmt.Sprintf("Failed to delete cache key: %s", key), err)
		return err
	}

	r.logger.LogInfo(fmt.Sprintf("Cache DELETE: %s", key))
	return nil
}

// Exists checks if a key exists
func (r *RedisCache) Exists(ctx context.Context, key string) bool {
	result := r.client.Exists(ctx, key).Val()
	return result > 0
}

// Ping checks the connection
func (r *RedisCache) Ping(ctx context.Context) error {
	return r.client.Ping(ctx).Err()
}

// Close closes the connection
func (r *RedisCache) Close() error {
	return r.client.Close()
}
