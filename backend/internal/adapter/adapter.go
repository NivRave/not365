package adapter

import (
	"encoding/json"

	"github.com/NivRave/not365/backend/internal/domain"
)

// Adapter is the contract every provider adapter must satisfy.
// It normalizes raw provider JSON responses into unified domain.MatchEvent structs.
type Adapter interface {
	// Sport returns which sport this adapter handles
	Sport() domain.Sport

	// Supports returns true if this adapter can handle the given provider and league
	Supports(providerID, leagueID string) bool

	// ParseScoreboard converts a raw scoreboard JSON payload into MatchEvents
	ParseScoreboard(raw json.RawMessage) ([]domain.MatchEvent, error)

	// ParseMatchDetail converts a raw single-match JSON into a MatchEvent
	ParseMatchDetail(raw json.RawMessage) (*domain.MatchEvent, error)
}
