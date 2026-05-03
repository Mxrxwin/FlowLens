package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"service-2/internal/repository"
)

type ErrorsHandler struct {
	repo *repository.ErrorsRepo
}

func NewErrors(repo *repository.ErrorsRepo) *ErrorsHandler {
	return &ErrorsHandler{repo: repo}
}

func (h *ErrorsHandler) List(c *gin.Context) {
	from, to, err := parseTimeRange(c, time.Hour)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	items, err := h.repo.List(c.Request.Context(), repository.ListErrorsParams{
		From:     from,
		To:       to,
		Region:   c.Query("region"),
		Endpoint: c.Query("endpoint"),
		Limit:    100,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *ErrorsHandler) Detail(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	detail, err := h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, detail)
}
