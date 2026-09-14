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
	Stats      *MatchStats `json:"stats,omitempty" bson:"stats,omitempty"`
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

type MatchFilter struct {
	Sport     Sport
	Status    string
	StartDate *time.Time
	EndDate   *time.Time
	LeagueID  string
	TeamID    string
	TeamIDs   []string
	Search    string
	Limit     int
}

type MatchStats struct {
	PossessionHome    int `json:"possession_home" bson:"possession_home"`
	PossessionAway    int `json:"possession_away" bson:"possession_away"`
	ShotsHome         int `json:"shots_home" bson:"shots_home"`
	ShotsAway         int `json:"shots_away" bson:"shots_away"`
	ShotsOnTargetHome int `json:"shots_on_target_home" bson:"shots_on_target_home"`
	ShotsOnTargetAway int `json:"shots_on_target_away" bson:"shots_on_target_away"`
	CornersHome       int `json:"corners_home" bson:"corners_home"`
	CornersAway       int `json:"corners_away" bson:"corners_away"`
	FoulsHome         int `json:"fouls_home" bson:"fouls_home"`
	FoulsAway         int `json:"fouls_away" bson:"fouls_away"`
	YellowCardsHome   int `json:"yellow_cards_home" bson:"yellow_cards_home"`
	YellowCardsAway   int `json:"yellow_cards_away" bson:"yellow_cards_away"`
	RedCardsHome      int `json:"red_cards_home" bson:"red_cards_home"`
	RedCardsAway      int `json:"red_cards_away" bson:"red_cards_away"`
}

type StandingsRow struct {
	Position       int      `json:"position"`
	Team           Team     `json:"team"`
	Played         int      `json:"played"`
	Won            int      `json:"won"`
	Drawn          int      `json:"drawn"`
	Lost           int      `json:"lost"`
	GoalsFor       int      `json:"goals_for"`
	GoalsAgainst   int      `json:"goals_against"`
	GoalDifference int      `json:"goal_difference"`
	Points         int      `json:"points"`
	Form           []string `json:"form"` // "W", "D", "L"
}

type H2HEncounter struct {
	ID         string    `json:"id"`
	Date       time.Time `json:"date"`
	LeagueName string    `json:"league_name"`
	HomeTeam   Team      `json:"home_team"`
	AwayTeam   Team      `json:"away_team"`
	HomeScore  int       `json:"home_score"`
	AwayScore  int       `json:"away_score"`
	Winner     string    `json:"winner"` // "home", "away", "draw"
}

