package handler

import (
	"math/rand"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CheckoutHandler struct{}

func NewCheckoutHandler() *CheckoutHandler { return &CheckoutHandler{} }

// Create implements the chaos-engineering checkout from Architecture.md:
//   30% → 500 Payment service unavailable
//   20% → 3s delay then 200
//   else → 200 with order_id
func (h *CheckoutHandler) Create(c *gin.Context) {
	r := rand.Float32()
	switch {
	case r < 0.30:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Payment service unavailable"})
		return
	case r < 0.50:
		time.Sleep(3 * time.Second)
	}
	c.JSON(http.StatusOK, gin.H{
		"status":   "ok",
		"order_id": uuid.New().String(),
	})
}
