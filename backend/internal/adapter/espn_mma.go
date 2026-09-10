package adapter

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/NivRave/not365/backend/internal/domain"
)

type ESPNMMAAdapter struct{}

func NewESPNMMAAdapter() *ESPNMMAAdapter {
	return &ESPNMMAAdapter{}
}

func (a *ESPNMMAAdapter) Sport() domain.Sport {
	return domain.SportMMA
}

func (a *ESPNMMAAdapter) Supports(providerID, leagueID string) bool {
	return strings.ToLower(providerID) == "espn" && (strings.ToLower(leagueID) == "ufc" || strings.ToLower(leagueID) == "mma")
}

func (a *ESPNMMAAdapter) ParseScoreboard(raw json.RawMessage) ([]domain.MatchEvent, error) {
	var resp espnScoreboardResponse
	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse ESPN MMA scoreboard: %w", err)
	}

	var matches []domain.MatchEvent
	for _, ev := range resp.Events {
		if len(ev.Competitions) == 0 || len(ev.Competitions[0].Competitors) < 2 {
			continue
		}
		comp := ev.Competitions[0]
		fighter1 := comp.Competitors[0]
		fighter2 := comp.Competitors[1]

		var status domain.MatchStatus
		if ev.Status.Type.Completed {
			status = domain.StatusFinished
		} else if ev.Status.Type.State == "in" {
			status = domain.StatusLive
		} else {
			status = domain.StatusScheduled
		}

		m := domain.MatchEvent{
			ID:         fmt.Sprintf("mma:espn:%s", ev.ID),
			Sport:      domain.SportMMA,
			LeagueID:   "ufc",
			LeagueName: "UFC",
			HomeTeam: domain.Team{
				ID:   fighter1.Team.ID,
				Name: fighter1.Team.DisplayName,
				LogoURL: fighter1.Team.Logo,
			},
			AwayTeam: domain.Team{
				ID:   fighter2.Team.ID,
				Name: fighter2.Team.DisplayName,
				LogoURL: fighter2.Team.Logo,
			},
			Status:    status,
			StartTime: ev.Date,
			Clock: &domain.Clock{
				DisplayTime: ev.Status.DisplayClock,
				Period:      ev.Status.Period,
				IsRunning:   status == domain.StatusLive,
			},
			UpdatedAt: time.Now().UTC(),
		}
		matches = append(matches, m)
	}

	return matches, nil
}

func (a *ESPNMMAAdapter) ParseMatchDetail(raw json.RawMessage) (*domain.MatchEvent, error) {
	matches, err := a.ParseScoreboard(raw)
	if err != nil {
		return nil, err
	}
	if len(matches) == 0 {
		return nil, fmt.Errorf("no match found in ESPN MMA detail")
	}
	return &matches[0], nil
}
