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
	Type       string
	ProjectKey string
	SessionID  string
	Timestamp  time.Time
	Region     string
	DeviceType string
	Browser    string
	OS         string
	UserAgent  string
	ClientIP   string
	Payload    []byte
}

func (r *EventsRepo) Insert(ctx context.Context, p InsertEventParams) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.pool.QueryRow(ctx, `
		INSERT INTO events
			(type, project_key, session_id, timestamp, region, device_type, browser, os, user_agent, client_ip, payload)
		VALUES
			($1, $2, $3, $4, NULLIF($5, ''), NULLIF($6, ''), NULLIF($7, ''), NULLIF($8, ''), $9, NULLIF($10, ''), $11)
		RETURNING id
	`,
		p.Type, p.ProjectKey, p.SessionID, p.Timestamp,
		p.Region, p.DeviceType, p.Browser, p.OS,
		p.UserAgent, p.ClientIP, p.Payload,
	).Scan(&id)
	return id, err
}

func (r *EventsRepo) CountSince(ctx context.Context, since time.Time) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM events WHERE timestamp >= $1
	`, since).Scan(&n)
	return n, err
}
