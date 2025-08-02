package cache

import "errors"

var (
	ErrCacheMiss       = errors.New("cache miss")
	ErrCacheConnection = errors.New("cache connection failed")
)
