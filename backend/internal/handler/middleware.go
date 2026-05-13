package handler

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// MaxBodySize rejects requests whose body exceeds limit bytes.
// Applied only to /ingest to prevent oversized payloads from reaching the
// JSON decoder and the Redis stream.
func MaxBodySize(limit int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, limit)
		c.Next()
		// MaxBytesReader sets a flag; the JSON decoder will surface the error.
	}
}

// IngestRateLimiter allows up to `rps` events per second per project key,
// with a burst of `burst`. Keys not seen for 5 minutes are evicted.
func IngestRateLimiter(rps float64, burst int) gin.HandlerFunc {
	type entry struct {
		limiter  *rate.Limiter
		lastSeen time.Time
	}

	var mu sync.Mutex
	limiters := make(map[string]*entry)

	// Background cleanup: evict idle keys every minute.
	go func() {
		for range time.Tick(time.Minute) {
			mu.Lock()
			for k, e := range limiters {
				if time.Since(e.lastSeen) > 5*time.Minute {
					delete(limiters, k)
				}
			}
			mu.Unlock()
		}
	}()

	getLimiter := func(key string) *rate.Limiter {
		mu.Lock()
		defer mu.Unlock()
		e, ok := limiters[key]
		if !ok {
			e = &entry{limiter: rate.NewLimiter(rate.Limit(rps), burst)}
			limiters[key] = e
		}
		e.lastSeen = time.Now()
		return e.limiter
	}

	return func(c *gin.Context) {
		key := c.GetHeader("X-FlowLens-Project-Key")
		if key == "" {
			key = c.Query("project_key")
		}
		if key == "" {
			key = c.Query("key")
		}
		if key == "" {
			key = "_unknown"
		}

		if !getLimiter(key).Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			c.Abort()
			return
		}
		c.Next()
	}
}
