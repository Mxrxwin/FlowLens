package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"flowlens/internal/repository"
)

type OverviewHandler struct {
	events *repository.EventsRepo
	errors *repository.ErrorsRepo
}

func NewOverview(events *repository.EventsRepo, errors *repository.ErrorsRepo) *OverviewHandler {
	return &OverviewHandler{events: events, errors: errors}
}

const overviewWindowSec = 5 * 60

func (h *OverviewHandler) Handle(c *gin.Context) {
	ctx := c.Request.Context()
	since := time.Now().Add(-overviewWindowSec * time.Second)

	eventsCount, err := h.events.CountSince(ctx, since)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	errorsCount, err := h.errors.CountSince(ctx, since)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var errorRate float64
	if eventsCount > 0 {
		errorRate = float64(errorsCount) / float64(eventsCount) * 100
	}
	rps := float64(eventsCount) / overviewWindowSec

	c.JSON(http.StatusOK, gin.H{
		"events_5m":  eventsCount,
		"errors_5m":  errorsCount,
		"error_rate": errorRate,
		"rps":        rps,
	})
}
