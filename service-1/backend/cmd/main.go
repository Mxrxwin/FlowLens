package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"

	"service-1/internal/handler"
	"service-1/internal/stream"
)

const streamKey = "monitoring-events"

func main() {
	// Single source of truth — root .env at the monorepo root.
	// CWD on `go run ./cmd` is service-1/backend, so root is two dirs up.
	// In Docker we pass env vars directly; missing file is not fatal.
	if err := godotenv.Load("../../.env"); err != nil {
		log.Printf(".env not loaded (%v); using process env", err)
	}

	redisAddr := getEnv("REDIS_ADDR", "localhost:6379")
	port := getEnv("SERVICE1_PORT", "8080")

	rdb := redis.NewClient(&redis.Options{Addr: redisAddr})

	producer := stream.NewProducer(rdb, streamKey)
	ingest := handler.NewIngestHandler(producer)

	r := gin.Default()
	r.POST("/ingest", ingest.Handle)

	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
