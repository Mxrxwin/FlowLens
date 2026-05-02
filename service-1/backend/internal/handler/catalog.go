package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Product struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Price int    `json:"price"`
}

var catalogProducts = []Product{
	{ID: 1, Name: "Wireless headphones", Price: 4990},
	{ID: 2, Name: "Mechanical keyboard", Price: 8490},
	{ID: 3, Name: "Office chair", Price: 12990},
	{ID: 4, Name: "Standing desk", Price: 24990},
	{ID: 5, Name: "USB-C hub", Price: 1990},
}

type CatalogHandler struct{}

func NewCatalogHandler() *CatalogHandler { return &CatalogHandler{} }

func (h *CatalogHandler) List(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"items": catalogProducts})
}
