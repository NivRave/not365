package domain_test

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/NivRave/not365/backend/internal/domain"
)

func TestMatchEvent_Serialization(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)

	match := domain.MatchEvent{
		ID:         "football:espn:123456",
		Sport:      domain.SportFootball,
		LeagueID:   "eng.1",
		LeagueName: "English Premier League",
		HomeTeam: domain.Team{
			ID:        "liv",
			Name:      "Liverpool",
			ShortName: "LIV",
			LogoURL:   "https://example.com/liv.png",
		},
		AwayTeam: domain.Team{
			ID:        "mci",
			Name:      "Manchester City",
			ShortName: "MCI",
			LogoURL:   "https://example.com/mci.png",
		},
		Status:    domain.StatusLive,
		StartTime: now,
		Score: &domain.Score{
			Home: 2,
			Away: 1,
			Meta: map[string]any{"halftime_home": 1, "halftime_away": 1},
		},
		Clock: &domain.Clock{
			DisplayTime: "72'",
			Period:      2,
			IsRunning:   true,
		},
		Events: []domain.Event{
			{
				ID:         "ev-1",
				Type:       "goal",
				Minute:     23,
				Player:     "Salah",
				TeamID:     "liv",
				OccurredAt: now.Add(-49 * time.Minute),
			},
		},
		Sequence:  42,
		UpdatedAt: now,
	}

	data, err := json.Marshal(match)
	if err != nil {
		t.Fatalf("Failed to marshal MatchEvent: %v", err)
	}

	var roundTrip domain.MatchEvent
	if err := json.Unmarshal(data, &roundTrip); err != nil {
		t.Fatalf("Failed to unmarshal MatchEvent: %v", err)
	}

	if roundTrip.ID != match.ID {
		t.Errorf("Expected ID %q, got %q", match.ID, roundTrip.ID)
	}
	if roundTrip.Score.Home != 2 || roundTrip.Score.Away != 1 {
		t.Errorf("Score mismatch: %+v", roundTrip.Score)
	}
	if len(roundTrip.Events) != 1 || roundTrip.Events[0].Player != "Salah" {
		t.Errorf("Events mismatch: %+v", roundTrip.Events)
	}
}
