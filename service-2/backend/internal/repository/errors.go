package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ErrorsRepo struct {
	pool *pgxpool.Pool
}

func NewErrorsRepo(pool *pgxpool.Pool) *ErrorsRepo {
	return &ErrorsRepo{pool: pool}
}

type InsertErrorParams struct {
	EventID          uuid.UUID
	Message          string
	StackTrace       string
	Endpoint         string
	PrecedingActions []byte
}

func (r *ErrorsRepo) Insert(ctx context.Context, p InsertErrorParams) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO errors (event_id, message, stack_trace, endpoint, preceding_actions)
		VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), $5)
	`, p.EventID, p.Message, p.StackTrace, p.Endpoint, p.PrecedingActions)
	return err
}

func (r *ErrorsRepo) CountSince(ctx context.Context, since time.Time) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM events WHERE type = 'error' AND timestamp >= $1
	`, since).Scan(&n)
	return n, err
}

type ListErrorsParams struct {
	From     time.Time
	To       time.Time
	Region   string
	Endpoint string
	Limit    int
}

type ErrorRow struct {
	ID        uuid.UUID `json:"id"`
	Message   string    `json:"message"`
	Endpoint  string    `json:"endpoint"`
	Timestamp time.Time `json:"timestamp"`
	Region    string    `json:"region"`
}

func (r *ErrorsRepo) List(ctx context.Context, p ListErrorsParams) ([]ErrorRow, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT er.id,
		       er.message,
		       COALESCE(er.endpoint, ''),
		       ev.timestamp,
		       COALESCE(ev.region, '')
		FROM errors er
		JOIN events ev ON er.event_id = ev.id
		WHERE ev.timestamp >= $1
		  AND ev.timestamp <= $2
		  AND ($3 = '' OR ev.region   = $3)
		  AND ($4 = '' OR er.endpoint = $4)
		ORDER BY ev.timestamp DESC
		LIMIT $5
	`, p.From, p.To, p.Region, p.Endpoint, p.Limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]ErrorRow, 0, p.Limit)
	for rows.Next() {
		var row ErrorRow
		if err := rows.Scan(&row.ID, &row.Message, &row.Endpoint, &row.Timestamp, &row.Region); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

type ErrorDetail struct {
	ID               uuid.UUID       `json:"id"`
	Message          string          `json:"message"`
	StackTrace       string          `json:"stack_trace"`
	Endpoint         string          `json:"endpoint"`
	Timestamp        time.Time       `json:"timestamp"`
	Region           string          `json:"region"`
	PrecedingActions json.RawMessage `json:"preceding_actions"`
}

// GetByID returns a single error joined with its event row, or pgx.ErrNoRows.
func (r *ErrorsRepo) GetByID(ctx context.Context, id uuid.UUID) (ErrorDetail, error) {
	var d ErrorDetail
	var raw []byte
	err := r.pool.QueryRow(ctx, `
		SELECT er.id,
		       er.message,
		       COALESCE(er.stack_trace, ''),
		       COALESCE(er.endpoint, ''),
		       ev.timestamp,
		       COALESCE(ev.region, ''),
		       er.preceding_actions
		FROM errors er
		JOIN events ev ON er.event_id = ev.id
		WHERE er.id = $1
	`, id).Scan(&d.ID, &d.Message, &d.StackTrace, &d.Endpoint, &d.Timestamp, &d.Region, &raw)
	if err != nil {
		return ErrorDetail{}, err
	}
	if len(raw) == 0 || string(raw) == "null" {
		raw = []byte("[]")
	}
	d.PrecedingActions = raw
	return d, nil
}
