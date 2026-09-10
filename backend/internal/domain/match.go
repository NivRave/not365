package domain

import "time"

// MatchStatus represents the lifecycle state of a match
type MatchStatus string

const (
	StatusScheduled MatchStatus = "scheduled"
	StatusLive      MatchStatus = "live"
	StatusHalftime  MatchStatus = "halftime"
	StatusFinished  MatchStatus = "finished"
	StatusPostponed MatchStatus = "postponed"
	StatusCancelled MatchStatus = "cancelled"
)

// Sport is the sport type enum
type Sport string

const (
	SportFootball   Sport = "football"
	SportBasketball Sport = "basketball"
	SportMMA        Sport = "mma"
)

// MatchEvent is the canonical, unified representation of a match
// and its live state. This is what every adapter produces.
type MatchEvent struct {
	ID         string      `json:"id" bson:"_id"` // Canonical: {sport}:{provider}:{provider_id}
	Sport      Sport       `json:"sport" bson:"sport"`
	LeagueID   string      `json:"league_id" bson:"league_id"`
	LeagueName string      `json:"league_name" bson:"league_name"`
	HomeTeam   Team        `json:"home_team" bson:"home_team"`
	AwayTeam   Team        `json:"away_team" bson:"away_team"`
	Status     MatchStatus `json:"status" bson:"status"`
	StartTime  time.Time   `json:"start_time" bson:"start_time"`
	Score      *Score      `json:"score,omitempty" bson:"score,omitempty"`
	Clock      *Clock      `json:"clock,omitempty" bson:"clock,omitempty"`
	Events     []Event     `json:"events,omitempty" bson:"events,omitempty"`
	Sequence   int64       `json:"sequence" bson:"sequence"`
	UpdatedAt  time.Time   `json:"updated_at" bson:"updated_at"`
}

type Team struct {
	ID        string `json:"id" bson:"id"`
	Name      string `json:"name" bson:"name"`
	ShortName string `json:"short_name" bson:"short_name"`
	LogoURL   string `json:"logo_url,omitempty" bson:"logo_url,omitempty"`
}

type Score struct {
	Home int            `json:"home" bson:"home"`
	Away int            `json:"away" bson:"away"`
	Meta map[string]any `json:"meta,omitempty" bson:"meta,omitempty"`
}

type Clock struct {
	DisplayTime string `json:"display_time" bson:"display_time"` // e.g. "72'", "Q3 4:22"
	Period      int    `json:"period" bson:"period"`
	IsRunning   bool   `json:"is_running" bson:"is_running"`
}

type Event struct {
	ID         string    `json:"id" bson:"id"`
	Type       string    `json:"type" bson:"type"` // "goal", "red_card", "basket", "ko", etc.
	Minute     int       `json:"minute,omitempty" bson:"minute,omitempty"`
	Player     string    `json:"player,omitempty" bson:"player,omitempty"`
	TeamID     string    `json:"team_id" bson:"team_id"`
	OccurredAt time.Time `json:"occurred_at" bson:"occurred_at"`
}

// HybridPayload is the message published to Redis Pub/Sub and pushed to SSE clients
type HybridPayload struct {
	MatchID  string      `json:"match_id"`
	Sequence int64       `json:"sequence"`
	Snapshot *MatchEvent `json:"snapshot,omitempty"`
	Delta    []Event     `json:"delta,omitempty"`
}
