package cache

import (
	"context"
	"time"
)

type CacheMetrics struct {
	Hits      int64
	Misses    int64
	Sets      int64
	Deletes   int64
	TotalTime time.Duration
}

func (r *RedisCache) GetMetrics(ctx context.Context) (*CacheMetrics, error) {
	info, err := r.client.Info(ctx, "stats").Result()
	print(info)
	if err != nil {
		return nil, err
	}

	metrics := &CacheMetrics{}

	return metrics, nil
}
