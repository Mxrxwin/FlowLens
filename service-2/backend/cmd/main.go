package main

import (
	"context"
	"errors"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"service-2/internal/consumer"
	"service-2/internal/correlation"
	"service-2/internal/processor"
	"service-2/internal/repository"
)

const streamKey = "monitoring-events"

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	redisAddr := getEnv("REDIS_ADDR", "localhost:6379")
	dbURL := getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/monitoring?sslmode=disable")

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("pgxpool.New: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("pg ping: %v", err)
	}

	rdb := redis.NewClient(&redis.Options{Addr: redisAddr})
	defer rdb.Close()

	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("redis ping: %v", err)
	}

	corrEngine := correlation.New(repository.NewCorrelationsRepo(pool))

	proc := processor.New(
		repository.NewEventsRepo(pool),
		repository.NewErrorsRepo(pool),
		repository.NewPerformanceRepo(pool),
		corrEngine,
	)
	cons := consumer.New(rdb, streamKey, proc)

	log.Printf("service-2 consumer started, stream=%s", streamKey)
	if err := cons.Run(ctx); err != nil {
		if !errors.Is(err, context.Canceled) {
			log.Fatalf("consumer: %v", err)
		}
	}
	log.Println("service-2 consumer stopped")
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
