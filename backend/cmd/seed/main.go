// seed inserts synthetic telemetry into a running FlowLens instance.
//
// It does two things:
//  1. Sends background events (performance, navigation, random errors) to
//     /ingest spread over the past 2 months to fill the time-series charts.
//  2. Inserts synthetic historical correlation rows directly into PostgreSQL
//     with timestamps spread over the past 2 months, so the Correlations page
//     shows realistic paged data with diverse dates.
//     The real-time correlation engine is left completely unchanged.
//
// Usage:
//
//	go run ./cmd/seed
//	go run ./cmd/seed -url http://localhost:5173 -db "postgres://user:pass@localhost:5432/monitoring?sslmode=disable"
//	go run ./cmd/seed -events 500 -correlations 40
package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os/exec"
	"strings"
	"time"
)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

var regions = []string{
	"Moscow", "Berlin", "New York", "London", "Paris",
	"Warsaw", "Almaty", "Kyiv", "Amsterdam", "Istanbul",
}
var regionWeight = []int{20, 12, 15, 12, 10, 5, 5, 8, 7, 6}

var userAgents = []struct{ ua, deviceType, browser string }{
	{"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", "mobile", "Mobile Safari"},
	{"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36", "mobile", "Android Chrome"},
	{"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", "desktop", "Chrome"},
	{"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", "desktop", "Chrome"},
	{"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0", "desktop", "Firefox"},
	{"Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15", "desktop", "Safari"},
}
var uaWeight = []int{25, 20, 20, 15, 10, 10}

var endpoints = []string{
	"/api/catalog", "/api/product", "/api/cart",
	"/api/checkout", "/api/payment", "/api/user/profile",
}
var spaRoutes = []string{"/", "/catalog", "/product/42", "/product/17", "/cart", "/checkout", "/profile"}

// correlationDef describes one historical correlation pattern.
type correlationDef struct {
	message    string
	endpoint   string
	region     string
	deviceType string
	browser    string
}

// historicalCorrelations is the full set of patterns seeded directly into the
// correlations table. 30 rows → pagination visible at page_size=10.
var historicalCorrelations = []correlationDef{
	// TypeError: price
	{"TypeError: Cannot read properties of undefined (reading 'price')", "/api/checkout", "Moscow", "mobile", "Mobile Safari"},
	{"TypeError: Cannot read properties of undefined (reading 'price')", "/api/checkout", "Almaty", "mobile", "Mobile Safari"},
	{"TypeError: Cannot read properties of undefined (reading 'price')", "/api/checkout", "Warsaw", "mobile", "Mobile Safari"},
	{"TypeError: Cannot read properties of undefined (reading 'price')", "/api/checkout", "Kyiv", "mobile", "Android Chrome"},
	// PaymentGateway timeout
	{"PaymentGateway: request timeout after 30000ms", "/api/payment", "Berlin", "desktop", "Chrome"},
	{"PaymentGateway: request timeout after 30000ms", "/api/payment", "London", "desktop", "Chrome"},
	{"PaymentGateway: request timeout after 30000ms", "/api/payment", "Paris", "desktop", "Firefox"},
	{"PaymentGateway: request timeout after 30000ms", "/api/payment", "Amsterdam", "desktop", "Safari"},
	// NetworkError catalog
	{"NetworkError: Failed to fetch /api/catalog", "/api/catalog", "New York", "desktop", "Firefox"},
	{"NetworkError: Failed to fetch /api/catalog", "/api/catalog", "London", "desktop", "Chrome"},
	{"NetworkError: Failed to fetch /api/catalog", "/api/catalog", "Istanbul", "mobile", "Android Chrome"},
	// Session expired
	{"Error: Session expired", "/api/user/profile", "Moscow", "desktop", "Chrome"},
	{"Error: Session expired", "/api/user/profile", "Berlin", "desktop", "Firefox"},
	{"Error: Session expired", "/api/user/profile", "New York", "mobile", "Mobile Safari"},
	// Cart failures
	{"TypeError: Cannot set property 'qty' of null", "/api/cart", "Paris", "mobile", "Mobile Safari"},
	{"TypeError: Cannot set property 'qty' of null", "/api/cart", "Warsaw", "mobile", "Android Chrome"},
	{"TypeError: Cannot set property 'qty' of null", "/api/cart", "Almaty", "desktop", "Chrome"},
	// Product 404
	{"Error: Product not found (id=undefined)", "/api/product", "New York", "desktop", "Chrome"},
	{"Error: Product not found (id=undefined)", "/api/product", "London", "desktop", "Safari"},
	{"Error: Product not found (id=undefined)", "/api/product", "Kyiv", "mobile", "Android Chrome"},
	// Auth errors
	{"Error: Unauthorized — token expired", "/api/checkout", "Istanbul", "desktop", "Firefox"},
	{"Error: Unauthorized — token expired", "/api/user/profile", "Amsterdam", "mobile", "Mobile Safari"},
	// Checkout stock
	{"Error: Item out of stock during checkout", "/api/checkout", "New York", "desktop", "Chrome"},
	{"Error: Item out of stock during checkout", "/api/checkout", "Berlin", "desktop", "Firefox"},
	{"Error: Item out of stock during checkout", "/api/checkout", "Moscow", "mobile", "Mobile Safari"},
	// Slow payment
	{"Error: PaymentGateway: 3DS challenge failed", "/api/payment", "Kyiv", "mobile", "Android Chrome"},
	{"Error: PaymentGateway: 3DS challenge failed", "/api/payment", "Istanbul", "desktop", "Chrome"},
	// Validation
	{"ValidationError: email format invalid", "/api/user/profile", "Warsaw", "desktop", "Chrome"},
	{"ValidationError: email format invalid", "/api/user/profile", "Almaty", "mobile", "Mobile Safari"},
	// Rate limit
	{"Error: Too many requests (429)", "/api/catalog", "New York", "desktop", "Firefox"},
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func pickWeighted(r *rand.Rand, weights []int) int {
	total := 0
	for _, w := range weights {
		total += w
	}
	n := r.Intn(total)
	for i, w := range weights {
		n -= w
		if n < 0 {
			return i
		}
	}
	return len(weights) - 1
}

func pickRegion(r *rand.Rand) string  { return regions[pickWeighted(r, regionWeight)] }
func pickUA(r *rand.Rand) int         { return pickWeighted(r, uaWeight) }
func pickEndpoint(r *rand.Rand) string { return endpoints[r.Intn(len(endpoints))] }
func intPtr(v int) *int               { return &v }

func newID(r *rand.Rand) string {
	b := make([]byte, 16)
	for i := range b {
		b[i] = byte(r.Intn(256))
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// ---------------------------------------------------------------------------
// Event builders
// ---------------------------------------------------------------------------

type event struct {
	Type             string        `json:"type"`
	ProjectKey       string        `json:"project_key"`
	SessionID        string        `json:"session_id"`
	Timestamp        int64         `json:"timestamp"`
	UserAgent        string        `json:"user_agent"`
	Region           string        `json:"region,omitempty"`
	Error            *errBlock     `json:"error,omitempty"`
	Performance      *perfBlock    `json:"performance,omitempty"`
	Navigation       *navBlock     `json:"navigation,omitempty"`
	PrecedingActions []interface{} `json:"preceding_actions,omitempty"`
}

type errBlock  struct{ Message string `json:"message"`; Stack string `json:"stack,omitempty"`; Endpoint string `json:"endpoint,omitempty"` }
type perfBlock struct {
	Endpoint        string `json:"endpoint"`
	LCP             *int   `json:"lcp,omitempty"`
	FID             *int   `json:"fid,omitempty"`
	TTFB            *int   `json:"ttfb,omitempty"`
	APIResponseTime *int   `json:"api_response_time,omitempty"`
	IsError         bool   `json:"is_error,omitempty"`
}
type navBlock struct {
	From string `json:"from"`
	To   string `json:"to"`
}

func buildPerfEvent(r *rand.Rand, key, sid string, ts time.Time) event {
	ev := event{
		Type: "performance", ProjectKey: key, SessionID: sid,
		Timestamp: ts.UnixMilli(), UserAgent: userAgents[pickUA(r)].ua,
		Region: pickRegion(r),
		Performance: &perfBlock{
			Endpoint:        pickEndpoint(r),
			APIResponseTime: intPtr(r.Intn(2800) + 80),
			IsError:         r.Intn(10) == 0,
		},
	}
	if r.Intn(3) == 0 {
		ev.Performance.TTFB = intPtr(r.Intn(600) + 100)
		ev.Performance.LCP = intPtr(r.Intn(3000) + 800)
		ev.Performance.FID = intPtr(r.Intn(200) + 10)
	}
	return ev
}

func buildNavEvent(r *rand.Rand, key, sid string, ts time.Time) event {
	from := spaRoutes[r.Intn(len(spaRoutes))]
	to := spaRoutes[r.Intn(len(spaRoutes))]
	for to == from {
		to = spaRoutes[r.Intn(len(spaRoutes))]
	}
	return event{
		Type: "navigation", ProjectKey: key, SessionID: sid,
		Timestamp: ts.UnixMilli(), UserAgent: userAgents[pickUA(r)].ua,
		Region: pickRegion(r),
		Navigation: &navBlock{From: from, To: to},
	}
}

func buildRandomError(r *rand.Rand, key, sid string, ts time.Time) event {
	msgs := []string{
		"ReferenceError: user is not defined",
		"SyntaxError: Unexpected token in JSON",
		"TypeError: Cannot call method on null",
	}
	return event{
		Type: "error", ProjectKey: key, SessionID: sid,
		Timestamp: ts.UnixMilli(), UserAgent: userAgents[pickUA(r)].ua,
		Region: pickRegion(r),
		Error:  &errBlock{Message: msgs[r.Intn(len(msgs))], Endpoint: pickEndpoint(r)},
		PrecedingActions: []interface{}{},
	}
}

// ---------------------------------------------------------------------------
// HTTP sender
// ---------------------------------------------------------------------------

func send(client *http.Client, url, key string, ev event) error {
	body, _ := json.Marshal(ev)
	req, _ := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-FlowLens-Project-Key", key)
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("ingest %d", resp.StatusCode)
	}
	return nil
}

// ---------------------------------------------------------------------------
// Direct DB insert via docker exec psql (no host port required)
// ---------------------------------------------------------------------------

func seedCorrelations(container, dbUser, dbName string, r *rand.Rand) error {
	twoMonthsAgo := time.Now().AddDate(0, -2, 0)
	window := time.Since(twoMonthsAgo)

	var sql strings.Builder
	sql.WriteString("BEGIN;\n")

	for _, c := range historicalCorrelations {
		firstOffset := time.Duration(r.Int63n(int64(window * 9 / 10)))
		firstSeen := twoMonthsAgo.Add(firstOffset)

		durationDays := time.Duration(r.Intn(10)+1) * 24 * time.Hour
		lastSeen := firstSeen.Add(durationDays)
		if lastSeen.After(time.Now()) {
			lastSeen = time.Now().Add(-time.Duration(r.Intn(3600)) * time.Second)
		}

		count := r.Intn(200) + 5

		// Escape single quotes in message.
		msg := strings.ReplaceAll(c.message, "'", "''")
		ep := strings.ReplaceAll(c.endpoint, "'", "''")
		reg := strings.ReplaceAll(c.region, "'", "''")
		dev := strings.ReplaceAll(c.deviceType, "'", "''")
		br := strings.ReplaceAll(c.browser, "'", "''")

		fmt.Fprintf(&sql,
			`INSERT INTO correlations (error_message,endpoint,region,device_type,browser,count,first_seen_at,last_seen_at,updated_at)`+
				` VALUES ('%s','%s','%s','%s','%s',%d,'%s','%s',now())`+
				` ON CONFLICT (error_message,endpoint,region,device_type,browser)`+
				` DO UPDATE SET count=GREATEST(correlations.count,EXCLUDED.count),`+
				`first_seen_at=LEAST(correlations.first_seen_at,EXCLUDED.first_seen_at),`+
				`last_seen_at=GREATEST(correlations.last_seen_at,EXCLUDED.last_seen_at),`+
				`updated_at=now();`+"\n",
			msg, ep, reg, dev, br, count,
			firstSeen.UTC().Format("2006-01-02 15:04:05"),
			lastSeen.UTC().Format("2006-01-02 15:04:05"),
		)
	}
	sql.WriteString("COMMIT;\n")

	cmd := exec.Command("docker", "exec", "-i", container,
		"psql", "-U", dbUser, "-d", dbName)
	cmd.Stdin = strings.NewReader(sql.String())
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("psql: %w\n%s", err, out)
	}
	return nil
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

func main() {
	backendURL  := flag.String("url",       "http://localhost:8081",    "FlowLens backend base URL")
	projectKey  := flag.String("key",       "pk_demo",                  "FlowLens project key")
	totalEvents := flag.Int("events",       600,                        "Background events (perf + nav + random errors)")
	pgContainer := flag.String("container", "flowlens-postgres-1",      "Docker container name for postgres")
	pgUser      := flag.String("pguser",    "user",                     "PostgreSQL user")
	pgDB        := flag.String("pgdb",      "monitoring",               "PostgreSQL database")
	flag.Parse()

	ingestURL := *backendURL + "/ingest"
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	client := &http.Client{Timeout: 10 * time.Second}

	// ---- 1. Background events spread over 2 months -------------------------
	if *totalEvents > 0 {
		log.Printf("sending %d background events → %s", *totalEvents, ingestURL)
		window := 60 * 24 * time.Hour // 2 months
		start := time.Now().Add(-window)
		sent, errs := 0, 0
		dot := max1(*totalEvents / 40)

		for i := 0; i < *totalEvents; i++ {
			offset := time.Duration(r.Int63n(int64(window)))
			ts := start.Add(offset)
			sid := newID(r)

			roll := r.Intn(100)
			var ev event
			switch {
			case roll < 10:
				ev = buildRandomError(r, *projectKey, sid, ts)
			case roll < 65:
				ev = buildPerfEvent(r, *projectKey, sid, ts)
			default:
				ev = buildNavEvent(r, *projectKey, sid, ts)
			}

			if err := send(client, ingestURL, *projectKey, ev); err != nil {
				errs++
				if errs <= 3 {
					log.Printf("  send error: %v", err)
				}
			} else {
				sent++
			}
			if (i+1)%dot == 0 {
				fmt.Print(".")
			}
		}
		fmt.Println()
		log.Printf("background: sent=%d errors=%d", sent, errs)
	}

	// ---- 2. Historical correlations via docker exec psql -------------------
	log.Printf("seeding %d historical correlation rows via docker exec → %s...",
		len(historicalCorrelations), *pgContainer)
	if err := seedCorrelations(*pgContainer, *pgUser, *pgDB, r); err != nil {
		log.Fatalf("seedCorrelations: %v", err)
	}
	log.Printf("done — %d correlation patterns inserted/updated", len(historicalCorrelations))
}

func max1(v int) int {
	if v < 1 {
		return 1
	}
	return v
}
