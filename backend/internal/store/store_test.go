package store_test

import (
	"context"
	"testing"
	"time"

	"github.com/NivRave/not365/backend/internal/domain"
	"github.com/NivRave/not365/backend/internal/store"
)

func TestDomainStructIntegrity(t *testing.T) {
	ev := domain.MatchEvent{
		ID:         "football:espn:123",
		Sport:      domain.SportFootball,
		LeagueID:   "eng.1",
		LeagueName: "Premier League",
		HomeTeam: domain.Team{
			ID:   "liv",
			Name: "Liverpool",
		},
		AwayTeam: domain.Team{
			ID:   "che",
			Name: "Chelsea",
		},
		Status:    domain.StatusLive,
		StartTime: time.Now(),
		Score: &domain.Score{
			Home: 1,
			Away: 0,
		},
	}

	if ev.ID != "football:espn:123" {
		t.Fatalf("Unexpected ID")
	}

	// Verify User struct
	u := store.User{
		Email:       "test@example.com",
		DisplayName: "Test User",
	}
	if u.Email != "test@example.com" {
		t.Fatalf("Unexpected User Email")
	}

	_ = context.Background()
}
