package model

const (
	TypeError       = "error"
	TypePerformance = "performance"
	TypeNavigation  = "navigation"
)

type Event struct {
	Type             string            `json:"type"`
	SessionID        string            `json:"session_id"`
	Timestamp        int64             `json:"timestamp"`
	UserAgent        string            `json:"user_agent"`
	Region           string            `json:"region,omitempty"`
	Error            *ErrorBlock       `json:"error,omitempty"`
	Performance      *PerformanceBlock `json:"performance,omitempty"`
	Navigation       *NavigationBlock  `json:"navigation,omitempty"`
	PrecedingActions []PrecedingAction `json:"preceding_actions,omitempty"`
}

type ErrorBlock struct {
	Message  string `json:"message"`
	Stack    string `json:"stack,omitempty"`
	Endpoint string `json:"endpoint,omitempty"`
}

type PerformanceBlock struct {
	Endpoint        string `json:"endpoint"`
	LCP             *int   `json:"lcp,omitempty"`
	FID             *int   `json:"fid,omitempty"`
	TTFB            *int   `json:"ttfb,omitempty"`
	APIResponseTime *int   `json:"api_response_time,omitempty"`
	IsError         bool   `json:"is_error,omitempty"`
}

type NavigationBlock struct {
	From string `json:"from"`
	To   string `json:"to"`
}

type PrecedingAction struct {
	Type   string `json:"type"`
	Target string `json:"target,omitempty"`
	From   string `json:"from,omitempty"`
	To     string `json:"to,omitempty"`
}
