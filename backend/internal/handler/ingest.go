package handler

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"

	"flowlens/internal/model"
	"flowlens/internal/stream"
)

type IngestHandler struct {
	producer *stream.Producer
}

func NewIngest(producer *stream.Producer) *IngestHandler {
	return &IngestHandler{producer: producer}
}

func (h *IngestHandler) Handle(c *gin.Context) {
	var event model.Event
	if err := c.ShouldBindJSON(&event); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := event.Validate(); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if event.Region == "" {
		event.Region = "unknown"
	}

	data, err := json.Marshal(&event)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := h.producer.Publish(c.Request.Context(), data); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
