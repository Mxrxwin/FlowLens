package geo

import (
	"net"
	"net/http"
	"strings"
)

// ClientIP extracts the originating client IP from the request, trusting the
// usual proxy headers first and falling back to the TCP remote address.
// Returns nil when no usable IP can be parsed.
func ClientIP(headers http.Header, remoteAddr string) net.IP {
	if ip := parseIP(headers.Get("CF-Connecting-IP")); ip != nil {
		return ip
	}
	if ip := parseIP(headers.Get("X-Real-IP")); ip != nil {
		return ip
	}
	if xff := headers.Get("X-Forwarded-For"); xff != "" {
		// XFF is a comma-separated chain: client, proxy1, proxy2.
		// The leftmost public IP is the most trustworthy origin.
		var firstParsed net.IP
		for _, part := range strings.Split(xff, ",") {
			ip := parseIP(part)
			if ip == nil {
				continue
			}
			if firstParsed == nil {
				firstParsed = ip
			}
			if isPublic(ip) {
				return ip
			}
		}
		if firstParsed != nil {
			return firstParsed
		}
	}
	if remoteAddr != "" {
		host, _, err := net.SplitHostPort(remoteAddr)
		if err != nil {
			host = remoteAddr
		}
		if ip := parseIP(host); ip != nil {
			return ip
		}
	}
	return nil
}

func parseIP(value string) net.IP {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	// Some proxies wrap IPv6 in brackets.
	value = strings.TrimPrefix(strings.TrimSuffix(value, "]"), "[")
	return net.ParseIP(value)
}

func isPublic(ip net.IP) bool {
	if ip == nil {
		return false
	}
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() ||
		ip.IsLinkLocalMulticast() || ip.IsUnspecified() {
		return false
	}
	return true
}
