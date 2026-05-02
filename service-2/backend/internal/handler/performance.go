package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"service-2/internal/repository"
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

	items, err := h.repo.AvgByEndpoint(c.Request.Context(), from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"items": items})
}
