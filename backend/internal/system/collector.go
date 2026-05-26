package system

import (
	"context"
	"math"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
)

const (
	sampleInterval = 5 * time.Second
	maxSamples     = 60 // 5 minutes of history
)

type Sample struct {
	TS         int64   `json:"ts"`
	CPUPct     float64 `json:"cpu_pct"`
	RAMPct     float64 `json:"ram_pct"`
	RAMUsedMB  uint64  `json:"ram_used_mb"`
	RAMTotalMB uint64  `json:"ram_total_mb"`
}

type Collector struct {
	mu      sync.RWMutex
	samples []Sample
}

func NewCollector() *Collector {
	return &Collector{samples: make([]Sample, 0, maxSamples)}
}

func (c *Collector) Run(ctx context.Context) {
	ticker := time.NewTicker(sampleInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			c.collect()
		}
	}
}

func (c *Collector) collect() {
	pcts, err := cpu.Percent(time.Second, false)
	if err != nil || len(pcts) == 0 {
		return
	}
	vm, err := mem.VirtualMemory()
	if err != nil {
		return
	}
	s := Sample{
		TS:         time.Now().Unix(),
		CPUPct:     round1(pcts[0]),
		RAMPct:     round1(vm.UsedPercent),
		RAMUsedMB:  vm.Used / 1024 / 1024,
		RAMTotalMB: vm.Total / 1024 / 1024,
	}
	c.mu.Lock()
	c.samples = append(c.samples, s)
	if len(c.samples) > maxSamples {
		c.samples = c.samples[len(c.samples)-maxSamples:]
	}
	c.mu.Unlock()
}

func (c *Collector) Samples() []Sample {
	c.mu.RLock()
	defer c.mu.RUnlock()
	out := make([]Sample, len(c.samples))
	copy(out, c.samples)
	return out
}

func round1(v float64) float64 {
	return math.Round(v*10) / 10
}
