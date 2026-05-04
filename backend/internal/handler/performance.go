package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"flowlens/internal/repository"
)

type PerformanceHandler struct {
	repo *repository.PerformanceRepo
}

func NewPerformance(repo *repository.PerformanceRepo) *PerformanceHandler {
	return &PerformanceHandler{repo: repo}
}

func (h *PerformanceHandler) List(c *gin.Context) {
	from, to, err := parseTimeRange(c, time.Hour)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()

	endpoints, err := h.repo.AvgByEndpoint(ctx, from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	regions, err := h.repo.AvgVitalsByRegion(ctx, from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"endpoints": endpoints,
		"regions":   regions,
	})
}
