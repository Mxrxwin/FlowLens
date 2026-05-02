package repository

import (
	"context"
	"time"

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

type EndpointAvg struct {
	Endpoint          string  `json:"endpoint"`
	AvgResponseTimeMs float64 `json:"avg_response_time_ms"`
	Samples           int     `json:"samples"`
}

func (r *PerformanceRepo) AvgByEndpoint(ctx context.Context, from, to time.Time) ([]EndpointAvg, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT COALESCE(pm.endpoint, ''),
		       AVG(pm.api_response_time)::float8,
		       COUNT(*)
		FROM performance_metrics pm
		JOIN events ev ON pm.event_id = ev.id
		WHERE ev.timestamp >= $1
		  AND ev.timestamp <= $2
		  AND pm.api_response_time IS NOT NULL
		GROUP BY pm.endpoint
		ORDER BY 2 DESC
	`, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]EndpointAvg, 0)
	for rows.Next() {
		var row EndpointAvg
		if err := rows.Scan(&row.Endpoint, &row.AvgResponseTimeMs, &row.Samples); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

type RegionVitals struct {
	Region  string  `json:"region"`
	AvgLCP  float64 `json:"avg_lcp"`
	AvgFID  float64 `json:"avg_fid"`
	AvgTTFB float64 `json:"avg_ttfb"`
	Samples int     `json:"samples"`
}

func (r *PerformanceRepo) AvgVitalsByRegion(ctx context.Context, from, to time.Time) ([]RegionVitals, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT COALESCE(NULLIF(ev.region, ''), 'unknown') AS region,
		       COALESCE(AVG(pm.lcp),  0)::float8,
		       COALESCE(AVG(pm.fid),  0)::float8,
		       COALESCE(AVG(pm.ttfb), 0)::float8,
		       COUNT(*)
		FROM performance_metrics pm
		JOIN events ev ON pm.event_id = ev.id
		WHERE ev.timestamp >= $1
		  AND ev.timestamp <= $2
		  AND (pm.lcp IS NOT NULL OR pm.fid IS NOT NULL OR pm.ttfb IS NOT NULL)
		GROUP BY COALESCE(NULLIF(ev.region, ''), 'unknown')
		ORDER BY region
	`, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]RegionVitals, 0)
	for rows.Next() {
		var row RegionVitals
		if err := rows.Scan(&row.Region, &row.AvgLCP, &row.AvgFID, &row.AvgTTFB, &row.Samples); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}
