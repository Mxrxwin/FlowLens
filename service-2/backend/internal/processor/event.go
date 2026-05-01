package processor

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"service-2/internal/correlation"
	"service-2/internal/model"
	"service-2/internal/repository"
)

type Processor struct {
	events       *repository.EventsRepo
	errors       *repository.ErrorsRepo
	performance  *repository.PerformanceRepo
	correlations *correlation.Engine
}

func New(
	events *repository.EventsRepo,
	errors *repository.ErrorsRepo,
	performance *repository.PerformanceRepo,
	correlations *correlation.Engine,
) *Processor {
	return &Processor{
		events:       events,
		errors:       errors,
		performance:  performance,
		correlations: correlations,
	}
}

func (p *Processor) HandleEvent(ctx context.Context, raw []byte) error {
	var ev model.Event
	if err := json.Unmarshal(raw, &ev); err != nil {
		return fmt.Errorf("unmarshal event: %w", err)
	}

	eventID, err := p.events.Insert(ctx, repository.InsertEventParams{
		Type:      ev.Type,
		SessionID: ev.SessionID,
		Timestamp: time.UnixMilli(ev.Timestamp),
		Region:    ev.Region,
		UserAgent: ev.UserAgent,
		Payload:   raw,
	})
	if err != nil {
		return fmt.Errorf("insert event: %w", err)
	}

	switch ev.Type {
	case model.TypeError:
		if ev.Error == nil {
			return nil
		}
		var precedingActions []byte
		if len(ev.PrecedingActions) > 0 {
			precedingActions, err = json.Marshal(ev.PrecedingActions)
			if err != nil {
				return fmt.Errorf("marshal preceding_actions: %w", err)
			}
		}
		if err := p.errors.Insert(ctx, repository.InsertErrorParams{
			EventID:          eventID,
			Message:          ev.Error.Message,
			StackTrace:       ev.Error.Stack,
			Endpoint:         ev.Error.Endpoint,
			PrecedingActions: precedingActions,
		}); err != nil {
			return fmt.Errorf("insert error: %w", err)
		}

		if err := p.correlations.OnError(ctx, correlation.ErrorContext{
			Endpoint:   ev.Error.Endpoint,
			Region:     ev.Region,
			DeviceType: "", // UA parser not implemented yet — engine maps "" to "unknown"
		}); err != nil {
			log.Printf("correlation: %v", err)
		}

	case model.TypePerformance:
		if ev.Performance == nil {
			return nil
		}
		if err := p.performance.Insert(ctx, repository.InsertPerformanceParams{
			EventID:         eventID,
			Endpoint:        ev.Performance.Endpoint,
			LCP:             ev.Performance.LCP,
			FID:             ev.Performance.FID,
			TTFB:            ev.Performance.TTFB,
			APIResponseTime: ev.Performance.APIResponseTime,
			IsError:         ev.Performance.IsError,
		}); err != nil {
			return fmt.Errorf("insert performance: %w", err)
		}
	}

	return nil
}
