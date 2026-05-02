package handler

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
)

// parseTimeRange parses ?from=&to= as RFC3339. If only `to` is missing it
// defaults to now; if only `from` is missing it defaults to to-defaultWindow.
func parseTimeRange(c *gin.Context, defaultWindow time.Duration) (from, to time.Time, err error) {
	now := time.Now()

	if s := c.Query("to"); s != "" {
		to, err = time.Parse(time.RFC3339, s)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("invalid 'to': %w", err)
		}
	} else {
		to = now
	}

	if s := c.Query("from"); s != "" {
		from, err = time.Parse(time.RFC3339, s)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("invalid 'from': %w", err)
		}
	} else {
		from = to.Add(-defaultWindow)
	}

	if !from.Before(to) {
		return time.Time{}, time.Time{}, fmt.Errorf("'from' must be before 'to'")
	}
	return from, to, nil
}
