package repository

import (
	"context"

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
