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

func (h *OverviewHandler) Handle(c *gin.Context) {
	ctx := c.Request.Context()
	since := time.Now().Add(-5 * time.Minute)

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

	c.JSON(http.StatusOK, gin.H{
		"events_5m": eventsCount,
		"errors_5m": errorsCount,
	})
}
