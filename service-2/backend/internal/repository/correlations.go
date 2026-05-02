package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// CorrelationsRepo writes into the `correlations` table.
//
// Requires a unique constraint matching the ON CONFLICT target:
//   UNIQUE (error_message, endpoint, region, device_type, browser)
type CorrelationsRepo struct {
	pool *pgxpool.Pool
}

func NewCorrelationsRepo(pool *pgxpool.Pool) *CorrelationsRepo {
	return &CorrelationsRepo{pool: pool}
}

// CountRecentErrors returns the number of errors in the last `windowMinutes`
// for the given (endpoint, region, device_type) combination. Inputs must
// already be normalized — empty values are not handled here.
func (r *CorrelationsRepo) CountRecentErrors(
	ctx context.Context,
	endpoint, region, deviceType string,
	windowMinutes int,
) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM errors er
		JOIN events ev ON er.event_id = ev.id
		WHERE ev.timestamp > now() - make_interval(mins => $4)
		  AND COALESCE(NULLIF(er.endpoint, ''),    'unknown') = $1
		  AND COALESCE(NULLIF(ev.region, ''),      'unknown') = $2
		  AND COALESCE(NULLIF(ev.device_type, ''), 'unknown') = $3
	`, endpoint, region, deviceType, windowMinutes).Scan(&count)
	return count, err
}

// UpsertGroups aggregates errors over the last `windowMinutes` for the given
// (endpoint, region, device_type) combination, grouping additionally by
// message and browser, and UPSERTs each group with COUNT >= threshold into
// `correlations`.
func (r *CorrelationsRepo) UpsertGroups(
	ctx context.Context,
	endpoint, region, deviceType string,
	windowMinutes, threshold int,
) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO correlations
			(error_message, endpoint, region, device_type, browser,
			 count, first_seen_at, last_seen_at, updated_at)
		SELECT
			er.message,
			COALESCE(NULLIF(er.endpoint, ''),    'unknown'),
			COALESCE(NULLIF(ev.region, ''),      'unknown'),
			COALESCE(NULLIF(ev.device_type, ''), 'unknown'),
			COALESCE(NULLIF(ev.browser, ''),     'unknown'),
			COUNT(*),
			MIN(ev.timestamp),
			MAX(ev.timestamp),
			now()
		FROM errors er
		JOIN events ev ON er.event_id = ev.id
		WHERE ev.timestamp > now() - make_interval(mins => $4)
		  AND COALESCE(NULLIF(er.endpoint, ''),    'unknown') = $1
		  AND COALESCE(NULLIF(ev.region, ''),      'unknown') = $2
		  AND COALESCE(NULLIF(ev.device_type, ''), 'unknown') = $3
		GROUP BY
			er.message,
			COALESCE(NULLIF(er.endpoint, ''),    'unknown'),
			COALESCE(NULLIF(ev.region, ''),      'unknown'),
			COALESCE(NULLIF(ev.device_type, ''), 'unknown'),
			COALESCE(NULLIF(ev.browser, ''),     'unknown')
		HAVING COUNT(*) >= $5
		ON CONFLICT (error_message, endpoint, region, device_type, browser)
		DO UPDATE SET
			count         = EXCLUDED.count,
			first_seen_at = LEAST(correlations.first_seen_at,  EXCLUDED.first_seen_at),
			last_seen_at  = GREATEST(correlations.last_seen_at, EXCLUDED.last_seen_at),
			updated_at    = now()
	`, endpoint, region, deviceType, windowMinutes, threshold)
	return err
}

type CorrelationRow struct {
	ErrorMessage string    `json:"error_message"`
	Endpoint     string    `json:"endpoint"`
	Region       string    `json:"region"`
	DeviceType   string    `json:"device_type"`
	Count        int       `json:"count"`
	FirstSeenAt  time.Time `json:"first_seen_at"`
	LastSeenAt   time.Time `json:"last_seen_at"`
}

// List returns up to `limit` correlations sorted either by `count` or by
// `frequency` (count per minute over [first_seen_at, last_seen_at]).
// `sort` must be "count" or "frequency" — caller is responsible for
// validation; the value is interpolated only via a closed allowlist below.
func (r *CorrelationsRepo) List(ctx context.Context, sort string, limit int) ([]CorrelationRow, error) {
	var orderBy string
	switch sort {
	case "frequency":
		orderBy = "count::float8 / GREATEST(EXTRACT(EPOCH FROM (last_seen_at - first_seen_at)) / 60.0, 1.0/60.0) DESC"
	default:
		orderBy = "count DESC"
	}

	q := fmt.Sprintf(`
		SELECT error_message, endpoint, region, device_type,
		       count, first_seen_at, last_seen_at
		FROM correlations
		ORDER BY %s
		LIMIT $1
	`, orderBy)

	rows, err := r.pool.Query(ctx, q, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]CorrelationRow, 0, limit)
	for rows.Next() {
		var row CorrelationRow
		if err := rows.Scan(
			&row.ErrorMessage, &row.Endpoint, &row.Region, &row.DeviceType,
			&row.Count, &row.FirstSeenAt, &row.LastSeenAt,
		); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}
