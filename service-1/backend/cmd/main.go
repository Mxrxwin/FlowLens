package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	"service-1/internal/handler"
	"service-1/internal/stream"
)

const streamKey = "monitoring-events"

func main() {
	redisAddr := getEnv("REDIS_ADDR", "localhost:6379")
	port := getEnv("PORT", "8080")

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
