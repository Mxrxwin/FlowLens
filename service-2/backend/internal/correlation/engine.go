package correlation

import (
	"context"
	"fmt"

	"service-2/internal/repository"
)

const (
	WindowMinutes = 5
	Threshold     = 5
)

type Engine struct {
	repo *repository.CorrelationsRepo
}

func New(repo *repository.CorrelationsRepo) *Engine {
	return &Engine{repo: repo}
}

type ErrorContext struct {
	Endpoint   string
	Region     string
	DeviceType string
}

// OnError is called after a successful insert into the `errors` table.
// It checks whether the (endpoint, region, device_type) combination has
// crossed the threshold over the last WindowMinutes; if so, it UPSERTs
// aggregated rows into `correlations`.
func (e *Engine) OnError(ctx context.Context, c ErrorContext) error {
	endpoint := normalize(c.Endpoint)
	region := normalize(c.Region)
	deviceType := normalize(c.DeviceType)

	count, err := e.repo.CountRecentErrors(ctx, endpoint, region, deviceType, WindowMinutes)
	if err != nil {
		return fmt.Errorf("count recent errors: %w", err)
	}
	if count < Threshold {
		return nil
	}

	if err := e.repo.UpsertGroups(ctx, endpoint, region, deviceType, WindowMinutes, Threshold); err != nil {
		return fmt.Errorf("upsert correlations: %w", err)
	}
	return nil
}

func normalize(v string) string {
	if v == "" {
		return "unknown"
	}
	return v
}
