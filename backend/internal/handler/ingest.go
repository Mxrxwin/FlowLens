package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"flowlens/internal/model"
	"flowlens/internal/stream"
)

type IngestHandler struct {
	producer    *stream.Producer
	projectKeys ProjectKeys
}

func NewIngest(producer *stream.Producer, projectKeys ProjectKeys) *IngestHandler {
	return &IngestHandler{producer: producer, projectKeys: projectKeys}
}

type ProjectKeys map[string]struct{}

func NewProjectKeys(raw string) ProjectKeys {
	keys := ProjectKeys{}
	for _, item := range strings.Split(raw, ",") {
		key := strings.TrimSpace(item)
		if key == "" {
			continue
		}
		keys[key] = struct{}{}
	}
	return keys
}

func (keys ProjectKeys) Valid(key string) bool {
	_, ok := keys[strings.TrimSpace(key)]
	return ok
}

func (h *IngestHandler) Handle(c *gin.Context) {
	var event model.Event
	if err := c.ShouldBindJSON(&event); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	projectKey := h.projectKey(c, event.ProjectKey)
	if !h.projectKeys.Valid(projectKey) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid project key"})
		return
	}
	event.ProjectKey = projectKey

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

func (h *IngestHandler) projectKey(c *gin.Context, bodyKey string) string {
	if key := c.GetHeader("X-FlowLens-Project-Key"); key != "" {
		return key
	}
	if key := c.Query("project_key"); key != "" {
		return key
	}
	if key := c.Query("key"); key != "" {
		return key
	}
	return bodyKey
}
