package ua

import "strings"

const Unknown = "unknown"

type Result struct {
	DeviceType string // mobile | desktop
	Browser    string // Chrome | Firefox | Safari | Edge | unknown
	OS         string // Windows | macOS | Linux | Android | iOS | unknown
}

func Parse(s string) Result {
	return Result{
		DeviceType: detectDevice(s),
		Browser:    detectBrowser(s),
		OS:         detectOS(s),
	}
}

func detectDevice(s string) string {
	if strings.Contains(s, "Mobile") || strings.Contains(s, "Android") {
		return "mobile"
	}
	return "desktop"
}

func detectBrowser(s string) string {
	switch {
	// Edge first — its UA also contains "Chrome" and "Safari".
	case strings.Contains(s, "Edg/") || strings.Contains(s, "Edge/"):
		return "Edge"
	case strings.Contains(s, "Firefox/"):
		return "Firefox"
	case strings.Contains(s, "Chrome/"):
		return "Chrome"
	case strings.Contains(s, "Safari/"):
		return "Safari"
	}
	return Unknown
}

func detectOS(s string) string {
	switch {
	case strings.Contains(s, "Windows"):
		return "Windows"
	// iOS before macOS — iOS UAs contain "like Mac OS X".
	case strings.Contains(s, "iPhone") || strings.Contains(s, "iPad") || strings.Contains(s, "iOS"):
		return "iOS"
	// Android before Linux — Android UAs contain "Linux".
	case strings.Contains(s, "Android"):
		return "Android"
	case strings.Contains(s, "Mac OS X") || strings.Contains(s, "Macintosh"):
		return "macOS"
	case strings.Contains(s, "Linux"):
		return "Linux"
	}
	return Unknown
}
