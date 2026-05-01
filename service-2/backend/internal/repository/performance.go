package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PerformanceRepo struct {
	pool *pgxpool.Pool
}

func NewPerformanceRepo(pool *pgxpool.Pool) *PerformanceRepo {
	return &PerformanceRepo{pool: pool}
}

type InsertPerformanceParams struct {
	EventID         uuid.UUID
	Endpoint        string
	LCP             *int
	FID             *int
	TTFB            *int
	APIResponseTime *int
	IsError         bool
}

func (r *PerformanceRepo) Insert(ctx context.Context, p InsertPerformanceParams) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO performance_metrics
			(event_id, endpoint, lcp, fid, ttfb, api_response_time, is_error)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, p.EventID, p.Endpoint, p.LCP, p.FID, p.TTFB, p.APIResponseTime, p.IsError)
	return err
}
