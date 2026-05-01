package repository

import (
	"context"

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
