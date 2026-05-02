package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type EventsRepo struct {
	pool *pgxpool.Pool
}

func NewEventsRepo(pool *pgxpool.Pool) *EventsRepo {
	return &EventsRepo{pool: pool}
}

type InsertEventParams struct {
	Type      string
	SessionID string
	Timestamp time.Time
	Region    string
	UserAgent string
	Payload   []byte
}

func (r *EventsRepo) Insert(ctx context.Context, p InsertEventParams) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.pool.QueryRow(ctx, `
		INSERT INTO events (type, session_id, timestamp, region, user_agent, payload)
		VALUES ($1, $2, $3, NULLIF($4, ''), $5, $6)
		RETURNING id
	`, p.Type, p.SessionID, p.Timestamp, p.Region, p.UserAgent, p.Payload).Scan(&id)
	return id, err
}

func (r *EventsRepo) CountSince(ctx context.Context, since time.Time) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM events WHERE timestamp >= $1
	`, since).Scan(&n)
	return n, err
}
