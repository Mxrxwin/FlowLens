package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"

	"flowlens/internal/consumer"
	"flowlens/internal/correlation"
	"flowlens/internal/handler"
	"flowlens/internal/processor"
	"flowlens/internal/repository"
	"flowlens/internal/stream"
)

const streamKey = "monitoring-events"

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	// Single source of truth — root .env at the repo root.
	// CWD on `go run ./cmd` is backend, so root is one dir up.
	// In Docker we pass env vars directly; missing file is not fatal.
	if err := godotenv.Load("../.env"); err != nil {
		log.Printf(".env not loaded (%v); using process env", err)
	}

	redisAddr := getEnv("REDIS_ADDR", "localhost:6379")
	dbURL := getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/monitoring?sslmode=disable")
	httpAddr := ":" + getEnv("FLOWLENS_BACKEND_PORT", "8081")
	projectKeys := handler.NewProjectKeys(getEnv("FLOWLENS_PROJECT_KEYS", "pk_demo"))

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("pgxpool.New: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("pg ping: %v", err)
	}
	if err := ensureSchema(ctx, pool); err != nil {
		log.Fatalf("ensure schema: %v", err)
	}

	rdb := redis.NewClient(&redis.Options{Addr: redisAddr})
	defer rdb.Close()

	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("redis ping: %v", err)
	}

	eventsRepo := repository.NewEventsRepo(pool)
	errorsRepo := repository.NewErrorsRepo(pool)
	perfRepo := repository.NewPerformanceRepo(pool)
	corrRepo := repository.NewCorrelationsRepo(pool)

	corrEngine := correlation.New(corrRepo)
	proc := processor.New(eventsRepo, errorsRepo, perfRepo, corrEngine)
	cons := consumer.New(rdb, streamKey, proc)
	producer := stream.NewProducer(rdb, streamKey)

	r := gin.Default()

	ingestAPI := r.Group("/")
	ingestAPI.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-FlowLens-Project-Key"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	}))
	ingestAPI.POST("/ingest", handler.NewIngest(producer, projectKeys).Handle)
	ingestAPI.OPTIONS("/ingest", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	errorsAPI := handler.NewErrors(errorsRepo)
	api := r.Group("/api")
	api.GET("/overview", handler.NewOverview(eventsRepo, errorsRepo).Handle)
	api.GET("/errors", errorsAPI.List)
	api.GET("/errors/:id", errorsAPI.Detail)
	api.GET("/performance", handler.NewPerformance(perfRepo).List)
	api.GET("/correlations", handler.NewCorrelations(corrRepo).List)

	srv := &http.Server{Addr: httpAddr, Handler: r}

	go func() {
		log.Printf("flowlens http listening on %s", httpAddr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("http: %v", err)
		}
	}()

	go func() {
		log.Printf("flowlens consumer started, stream=%s", streamKey)
		if err := cons.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
			log.Fatalf("consumer: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("shutdown signal received")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("http shutdown: %v", err)
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func ensureSchema(ctx context.Context, pool *pgxpool.Pool) error {
	statements := []string{
		`ALTER TABLE events ADD COLUMN IF NOT EXISTS project_key TEXT NOT NULL DEFAULT 'default'`,
		`CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_key)`,
	}
	for _, stmt := range statements {
		if _, err := pool.Exec(ctx, stmt); err != nil {
			return err
		}
	}
	return nil
}
