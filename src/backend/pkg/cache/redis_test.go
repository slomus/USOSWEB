package cache

import (
	"context"
	"testing"
	"time"
)

func TestRedisCache_SetGet(t *testing.T) {
	// Redis has to be running on port 6379 in order for the test to work
	cache := NewRedisCache("localhost:6379", "", 1) // use db 1 for tests
	defer cache.Close()

	ctx := context.Background()

	// Test Set/Get
	testData := map[string]interface{}{
		"key1": "value1",
		"key2": 12345,
		"key3": []string{"a", "b", "c"},
	}

	for key, value := range testData {
		err := cache.Set(ctx, key, value, 1*time.Minute)
		if err != nil {
			t.Fatalf("Failed to set %s: %v", key, err)
		}

		var result interface{}
		err = cache.Get(ctx, key, &result)
		if err != nil {
			t.Fatalf("Failed to get %s: %v", key, err)
		}
	}
}
