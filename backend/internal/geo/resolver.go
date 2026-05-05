package geo

import (
	"net"
	"net/http"
	"net/url"
	"strings"
)

const FallbackRegion = "Unresolved region"

// Resolver layers SDK hint → CDN/proxy headers → MaxMind DB lookup → fallback.
// db may be nil when GeoIP is disabled or the database failed to open.
type Resolver struct {
	db *MaxMindDB
}

func NewResolver(db *MaxMindDB) *Resolver {
	return &Resolver{db: db}
}

// Resolve returns the best available region label for a request. sdkHint is
// the value the client put into event.region (browser timezone hint, etc.).
func (r *Resolver) Resolve(sdkHint string, headers http.Header, clientIP net.IP) string {
	if v := clean(sdkHint); v != "" {
		return v
	}
	if v := ResolveFromHeaders(headers); v != "" {
		return v
	}
	if r != nil && r.db != nil {
		if v := r.db.LookupRegion(clientIP); v != "" {
			return v
		}
	}
	return FallbackRegion
}

func ResolveFromHeaders(headers http.Header) string {
	if region := first(headers, "X-FlowLens-Region"); region != "" {
		return region
	}

	city := first(headers,
		"CF-IPCity",
		"X-Vercel-IP-City",
		"X-Appengine-City",
		"CloudFront-Viewer-City",
		"X-Geo-City",
	)
	region := first(headers,
		"CF-Region",
		"X-Vercel-IP-Country-Region",
		"X-Appengine-Region",
		"CloudFront-Viewer-Country-Region",
		"X-Geo-Region",
	)
	country := first(headers,
		"CF-IPCountry",
		"X-Vercel-IP-Country",
		"X-Appengine-Country",
		"CloudFront-Viewer-Country",
		"X-Geo-Country",
	)

	return join(city, region, country)
}

func first(headers http.Header, names ...string) string {
	for _, name := range names {
		if value := clean(headers.Get(name)); value != "" {
			return value
		}
	}
	return ""
}

func clean(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if decoded, err := url.QueryUnescape(value); err == nil {
		value = decoded
	}
	if strings.EqualFold(value, "unknown") || value == "-" {
		return ""
	}
	return value
}

func join(parts ...string) string {
	out := make([]string, 0, len(parts))
	seen := map[string]struct{}{}
	for _, part := range parts {
		part = clean(part)
		if part == "" {
			continue
		}
		key := strings.ToLower(part)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, part)
	}
	return strings.Join(out, ", ")
}
