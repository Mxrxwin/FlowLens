package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"flowlens/internal/repository"
)

type CorrelationsHandler struct {
	repo *repository.CorrelationsRepo
}

func NewCorrelations(repo *repository.CorrelationsRepo) *CorrelationsHandler {
	return &CorrelationsHandler{repo: repo}
}

func (h *CorrelationsHandler) List(c *gin.Context) {
	sort := c.DefaultQuery("sort", "count")
	if sort != "count" && sort != "frequency" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sort must be 'count' or 'frequency'"})
		return
	}

	items, err := h.repo.List(c.Request.Context(), sort, 100)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"items": items})
}
