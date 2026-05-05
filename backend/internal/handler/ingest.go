package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"flowlens/internal/geo"
	"flowlens/internal/model"
	"flowlens/internal/stream"
)

type IngestHandler struct {
	producer    *stream.Producer
	projectKeys ProjectKeys
	resolver    *geo.Resolver
	storeIP     bool
}

func NewIngest(producer *stream.Producer, projectKeys ProjectKeys, resolver *geo.Resolver, storeIP bool) *IngestHandler {
	return &IngestHandler{
		producer:    producer,
		projectKeys: projectKeys,
		resolver:    resolver,
		storeIP:     storeIP,
	}
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

	clientIP := geo.ClientIP(c.Request.Header, c.Request.RemoteAddr)
	event.Region = h.resolver.Resolve(event.Region, c.Request.Header, clientIP)

	// Never trust an inbound client_ip; either set our own or strip it.
	if h.storeIP && clientIP != nil {
		event.ClientIP = clientIP.String()
	} else {
		event.ClientIP = ""
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
