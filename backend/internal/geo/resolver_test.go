package geo

import (
	"net"
	"net/http"
	"testing"
)

func TestResolverPrefersSDKHint(t *testing.T) {
	r := NewResolver(nil)
	h := http.Header{}
	h.Set("CF-IPCity", "Berlin")
	got := r.Resolve("Москва", h, net.ParseIP("203.0.113.10"))
	if got != "Москва" {
		t.Fatalf("expected SDK hint to win, got %q", got)
	}
}

func TestResolverFallsBackToHeaders(t *testing.T) {
	r := NewResolver(nil)
	h := http.Header{}
	h.Set("CF-IPCity", "Berlin")
	h.Set("CF-IPCountry", "DE")
	got := r.Resolve("", h, nil)
	if got != "Berlin, DE" {
		t.Fatalf("expected header-based join, got %q", got)
	}
}

func TestResolverFallsBackToConstantWhenNothingResolves(t *testing.T) {
	r := NewResolver(nil)
	got := r.Resolve("", http.Header{}, nil)
	if got != FallbackRegion {
		t.Fatalf("expected %q, got %q", FallbackRegion, got)
	}
}

func TestResolverIgnoresUnknownTokens(t *testing.T) {
	r := NewResolver(nil)
	h := http.Header{}
	h.Set("CF-IPCity", "unknown")
	h.Set("CF-IPCountry", "-")
	got := r.Resolve("", h, nil)
	if got != FallbackRegion {
		t.Fatalf("expected fallback when headers are unknown placeholders, got %q", got)
	}
}

func TestMaxMindDBHandlesMissingFile(t *testing.T) {
	db, err := OpenMaxMindDB("/nonexistent/path/GeoLite2-City.mmdb")
	if err == nil {
		t.Fatal("expected error for missing file")
	}
	if db != nil {
		t.Fatal("expected nil DB on error")
	}
}

func TestMaxMindDBEmptyPath(t *testing.T) {
	db, err := OpenMaxMindDB("")
	if err != nil {
		t.Fatalf("expected no error for empty path, got %v", err)
	}
	if db != nil {
		t.Fatal("expected nil DB for empty path (GeoIP optional)")
	}
}

func TestMaxMindDBNilLookupSafe(t *testing.T) {
	var db *MaxMindDB
	if got := db.LookupRegion(net.ParseIP("8.8.8.8")); got != "" {
		t.Fatalf("expected empty result on nil DB, got %q", got)
	}
	if err := db.Close(); err != nil {
		t.Fatalf("Close on nil DB: %v", err)
	}
}
