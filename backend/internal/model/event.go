package model

import "fmt"

const (
	TypeError       = "error"
	TypePerformance = "performance"
	TypeNavigation  = "navigation"
)

type Event struct {
	Type       string `json:"type"`
	ProjectKey string `json:"project_key,omitempty"`
	SessionID  string `json:"session_id"`
	Timestamp  int64  `json:"timestamp"`
	UserAgent  string `json:"user_agent"`
	Region     string `json:"region,omitempty"`
	// ClientIP is server-side enrichment. It is intentionally accepted from
	// the client JSON only because the ingest handler overwrites it before
	// publishing, and is omitted entirely when FLOWLENS_STORE_IP is off.
	ClientIP         string            `json:"client_ip,omitempty"`
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

func (e *Event) Validate() error {
	switch e.Type {
	case TypeError, TypePerformance, TypeNavigation:
	default:
		return fmt.Errorf("invalid type: %q", e.Type)
	}
	if e.SessionID == "" {
		return fmt.Errorf("session_id is required")
	}
	if e.Timestamp <= 0 {
		return fmt.Errorf("timestamp is required")
	}
	if e.UserAgent == "" {
		return fmt.Errorf("user_agent is required")
	}

	switch e.Type {
	case TypeError:
		if e.Performance != nil || e.Navigation != nil {
			return fmt.Errorf("only error block allowed for type=error")
		}
		if e.Error == nil {
			return fmt.Errorf("error block is required for type=error")
		}
		if e.Error.Message == "" {
			return fmt.Errorf("error.message is required")
		}
		if len(e.PrecedingActions) > 2 {
			return fmt.Errorf("preceding_actions max length is 2")
		}
		for i, a := range e.PrecedingActions {
			switch a.Type {
			case "click":
				if a.Target == "" {
					return fmt.Errorf("preceding_actions[%d].target is required for click", i)
				}
			case "navigation":
				if a.From == "" || a.To == "" {
					return fmt.Errorf("preceding_actions[%d] requires from and to for navigation", i)
				}
			default:
				return fmt.Errorf("preceding_actions[%d].type invalid: %q", i, a.Type)
			}
		}

	case TypePerformance:
		if e.Error != nil || e.Navigation != nil {
			return fmt.Errorf("only performance block allowed for type=performance")
		}
		if len(e.PrecedingActions) > 0 {
			return fmt.Errorf("preceding_actions only allowed for type=error")
		}
		if e.Performance == nil {
			return fmt.Errorf("performance block is required for type=performance")
		}
		if e.Performance.Endpoint == "" {
			return fmt.Errorf("performance.endpoint is required")
		}
		if e.Performance.LCP == nil &&
			e.Performance.FID == nil &&
			e.Performance.TTFB == nil &&
			e.Performance.APIResponseTime == nil {
			return fmt.Errorf("at least one performance metric is required")
		}

	case TypeNavigation:
		if e.Error != nil || e.Performance != nil {
			return fmt.Errorf("only navigation block allowed for type=navigation")
		}
		if len(e.PrecedingActions) > 0 {
			return fmt.Errorf("preceding_actions only allowed for type=error")
		}
		if e.Navigation == nil {
			return fmt.Errorf("navigation block is required for type=navigation")
		}
		if e.Navigation.From == "" || e.Navigation.To == "" {
			return fmt.Errorf("navigation.from and navigation.to are required")
		}
	}

	return nil
}
