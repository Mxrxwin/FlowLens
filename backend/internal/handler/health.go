package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type HealthHandler struct {
	pool *pgxpool.Pool
	rdb  *redis.Client
}

func NewHealth(pool *pgxpool.Pool, rdb *redis.Client) *HealthHandler {
	return &HealthHandler{pool: pool, rdb: rdb}
}

func (h *HealthHandler) Handle(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()

	status := gin.H{}
	code := http.StatusOK

	if err := h.pool.Ping(ctx); err != nil {
		status["postgres"] = "error"
		code = http.StatusServiceUnavailable
	} else {
		status["postgres"] = "ok"
	}

	if err := h.rdb.Ping(ctx).Err(); err != nil {
		status["redis"] = "error"
		code = http.StatusServiceUnavailable
	} else {
		status["redis"] = "ok"
	}

	if code == http.StatusOK {
		status["status"] = "ok"
	} else {
		status["status"] = "degraded"
	}

	c.JSON(code, status)
}
