package handler

import (
	"net/http"
	"strconv"

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

	pageSize := clampInt(queryInt(c, "page_size", 10), 1, 50)
	page := max1(queryInt(c, "page", 1))
	offset := (page - 1) * pageSize

	// since: "1h" | "24h" | "7d" | "" (all time)
	sinceMinutes := 0
	switch c.Query("since") {
	case "1h":
		sinceMinutes = 60
	case "24h":
		sinceMinutes = 60 * 24
	case "7d":
		sinceMinutes = 60 * 24 * 7
	}

	result, err := h.repo.List(c.Request.Context(), repository.ListCorrelationsParams{
		Sort:         sort,
		Limit:        pageSize,
		Offset:       offset,
		SinceMinutes: sinceMinutes,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items": result.Items,
		"total": result.Total,
	})
}

func queryInt(c *gin.Context, key string, fallback int) int {
	if v, err := strconv.Atoi(c.Query(key)); err == nil {
		return v
	}
	return fallback
}

func clampInt(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

func max1(v int) int {
	if v < 1 {
		return 1
	}
	return v
}
