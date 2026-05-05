package geo

import (
	"errors"
	"fmt"
	"log"
	"net"
	"os"
	"strings"
	"sync"

	"github.com/oschwald/maxminddb-golang"
)

// MaxMindDB wraps a GeoLite2-City database and produces a region string in the
// same shape as ResolveFromHeaders ("City, Region, Country"). All operations
// are safe for concurrent use; lookups never reach the network.
type MaxMindDB struct {
	mu     sync.RWMutex
	reader *maxminddb.Reader
	path   string
}

// cityRecord captures only the fields we render. Keeping it tight avoids
// pulling the full MaxMind schema into memory on every lookup.
type cityRecord struct {
	City struct {
		Names map[string]string `maxminddb:"names"`
	} `maxminddb:"city"`
	Subdivisions []struct {
		Names map[string]string `maxminddb:"names"`
	} `maxminddb:"subdivisions"`
	Country struct {
		Names   map[string]string `maxminddb:"names"`
		IsoCode string            `maxminddb:"iso_code"`
	} `maxminddb:"country"`
}

// OpenMaxMindDB opens a GeoLite2-City .mmdb file. It returns (nil, nil) when
// the path is empty so callers can treat GeoIP as optional. A missing or
// corrupt file logs a warning and returns (nil, error) — startup should not
// fail on it; callers fall back to header-based resolution.
func OpenMaxMindDB(path string) (*MaxMindDB, error) {
	if strings.TrimSpace(path) == "" {
		return nil, nil
	}
	if _, err := os.Stat(path); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, fmt.Errorf("geoip db not found at %s", path)
		}
		return nil, fmt.Errorf("stat geoip db: %w", err)
	}
	reader, err := maxminddb.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open geoip db: %w", err)
	}
	log.Printf("geoip: opened MaxMind DB at %s (build epoch=%d)", path, reader.Metadata.BuildEpoch)
	return &MaxMindDB{reader: reader, path: path}, nil
}

// Close releases the underlying mmap. Safe to call on a nil receiver.
func (d *MaxMindDB) Close() error {
	if d == nil {
		return nil
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.reader == nil {
		return nil
	}
	err := d.reader.Close()
	d.reader = nil
	return err
}

// LookupRegion returns "City, Region, Country" for the given IP, or "" if
// the IP is not present in the DB or the DB is unavailable. Errors are
// swallowed (with a warning) because GeoIP is best-effort enrichment.
func (d *MaxMindDB) LookupRegion(ip net.IP) string {
	if d == nil || ip == nil {
		return ""
	}
	d.mu.RLock()
	reader := d.reader
	d.mu.RUnlock()
	if reader == nil {
		return ""
	}

	var rec cityRecord
	if err := reader.Lookup(ip, &rec); err != nil {
		log.Printf("geoip: lookup %s failed: %v", ip, err)
		return ""
	}

	city := pickName(rec.City.Names)
	region := ""
	if len(rec.Subdivisions) > 0 {
		region = pickName(rec.Subdivisions[0].Names)
	}
	country := pickName(rec.Country.Names)
	if country == "" {
		country = rec.Country.IsoCode
	}
	return join(city, region, country)
}

// pickName prefers English (matches existing CDN-header behaviour) then any
// available locale. MaxMind always ships at least one locale per record.
func pickName(names map[string]string) string {
	if len(names) == 0 {
		return ""
	}
	if v, ok := names["en"]; ok {
		return v
	}
	for _, v := range names {
		return v
	}
	return ""
}
