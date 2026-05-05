package geo

import (
	"net/http"
	"testing"
)

func TestClientIP(t *testing.T) {
	tests := []struct {
		name       string
		headers    map[string]string
		remoteAddr string
		want       string
	}{
		{
			name:       "fallback to remote addr",
			headers:    nil,
			remoteAddr: "203.0.113.7:51514",
			want:       "203.0.113.7",
		},
		{
			name: "cf-connecting-ip wins over xff",
			headers: map[string]string{
				"CF-Connecting-IP": "198.51.100.1",
				"X-Forwarded-For":  "203.0.113.9, 10.0.0.1",
			},
			remoteAddr: "10.0.0.1:443",
			want:       "198.51.100.1",
		},
		{
			name:       "x-real-ip used when cf header absent",
			headers:    map[string]string{"X-Real-IP": "203.0.113.5"},
			remoteAddr: "10.0.0.1:443",
			want:       "203.0.113.5",
		},
		{
			name:       "xff first public ip",
			headers:    map[string]string{"X-Forwarded-For": "10.0.0.1, 203.0.113.10, 198.51.100.2"},
			remoteAddr: "10.0.0.1:443",
			want:       "203.0.113.10",
		},
		{
			name:       "xff all-private falls through to first parsable",
			headers:    map[string]string{"X-Forwarded-For": "10.0.0.1, 192.168.1.1"},
			remoteAddr: "172.16.0.1:443",
			want:       "10.0.0.1",
		},
		{
			name:       "ipv6 with brackets in remote addr",
			headers:    nil,
			remoteAddr: "[2001:db8::1]:51514",
			want:       "2001:db8::1",
		},
		{
			name:       "no headers no remote addr",
			headers:    nil,
			remoteAddr: "",
			want:       "",
		},
		{
			name:       "garbage in xff",
			headers:    map[string]string{"X-Forwarded-For": "not-an-ip, also-not"},
			remoteAddr: "203.0.113.20:443",
			want:       "203.0.113.20",
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			h := http.Header{}
			for k, v := range tc.headers {
				h.Set(k, v)
			}
			got := ClientIP(h, tc.remoteAddr)
			gotStr := ""
			if got != nil {
				gotStr = got.String()
			}
			if gotStr != tc.want {
				t.Fatalf("got %q want %q", gotStr, tc.want)
			}
		})
	}
}
