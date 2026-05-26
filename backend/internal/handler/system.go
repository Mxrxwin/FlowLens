package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"flowlens/internal/system"
)

type SystemHandler struct {
	collector *system.Collector
}

func NewSystem(c *system.Collector) *SystemHandler {
	return &SystemHandler{collector: c}
}

func (h *SystemHandler) Handle(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"series": h.collector.Samples(),
	})
}
