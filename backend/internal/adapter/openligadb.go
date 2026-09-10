package adapter

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/NivRave/not365/backend/internal/domain"
)

type OpenLigaDBAdapter struct{}

func NewOpenLigaDBAdapter() *OpenLigaDBAdapter {
	return &OpenLigaDBAdapter{}
}

func (a *OpenLigaDBAdapter) Sport() domain.Sport {
	return domain.SportFootball
}

func (a *OpenLigaDBAdapter) Supports(providerID, leagueID string) bool {
	return strings.ToLower(providerID) == "openligadb" || strings.ToLower(leagueID) == "bl1"
}

type openLigaMatch struct {
	MatchID          int       `json:"matchID"`
	MatchDateTimeUTC time.Time `json:"matchDateTimeUTC"`
	LeagueName       string    `json:"leagueName"`
	Team1            struct {
		TeamID      int    `json:"teamId"`
		TeamName    string `json:"teamName"`
		ShortName   string `json:"shortName"`
		TeamIconURL string `json:"teamIconUrl"`
	} `json:"team1"`
	Team2 struct {
		TeamID      int    `json:"teamId"`
		TeamName    string `json:"teamName"`
		ShortName   string `json:"shortName"`
		TeamIconURL string `json:"teamIconUrl"`
	} `json:"team2"`
	MatchIsFinished bool `json:"matchIsFinished"`
	MatchResults    []struct {
		ResultName    string `json:"resultName"`
		PointsTeam1   int    `json:"pointsTeam1"`
		PointsTeam2   int    `json:"pointsTeam2"`
		ResultOrderID int    `json:"resultOrderID"`
	} `json:"matchResults"`
	Goals []struct {
		GoalID         int    `json:"goalID"`
		ScoreTeam1     int    `json:"scoreTeam1"`
		ScoreTeam2     int    `json:"scoreTeam2"`
		MatchMinute    int    `json:"matchMinute"`
		GoalGetterName string `json:"goalGetterName"`
	} `json:"goals"`
}

func (a *OpenLigaDBAdapter) ParseScoreboard(raw json.RawMessage) ([]domain.MatchEvent, error) {
	var matches []openLigaMatch
	if err := json.Unmarshal(raw, &matches); err != nil {
		// Try single object fallback
		var single openLigaMatch
		if errSingle := json.Unmarshal(raw, &single); errSingle == nil {
			matches = []openLigaMatch{single}
		} else {
			return nil, fmt.Errorf("failed to parse OpenLigaDB matches: %w", err)
		}
	}

	var result []domain.MatchEvent
	for _, m := range matches {
		result = append(result, *a.convertMatch(&m))
	}
	return result, nil
}

func (a *OpenLigaDBAdapter) ParseMatchDetail(raw json.RawMessage) (*domain.MatchEvent, error) {
	var m openLigaMatch
	if err := json.Unmarshal(raw, &m); err != nil {
		return nil, fmt.Errorf("failed to parse OpenLigaDB match detail: %w", err)
	}
	return a.convertMatch(&m), nil
}

func (a *OpenLigaDBAdapter) convertMatch(m *openLigaMatch) *domain.MatchEvent {
	var status domain.MatchStatus
	now := time.Now().UTC()

	if m.MatchIsFinished {
		status = domain.StatusFinished
	} else if now.After(m.MatchDateTimeUTC) && now.Before(m.MatchDateTimeUTC.Add(2*time.Hour)) {
		status = domain.StatusLive
	} else if now.Before(m.MatchDateTimeUTC) {
		status = domain.StatusScheduled
	} else {
		status = domain.StatusFinished
	}

	// Scores: OrderID 2 is full-time, 1 is halftime
	homeScore := 0
	awayScore := 0
	meta := make(map[string]any)

	for _, r := range m.MatchResults {
		if r.ResultOrderID == 2 || r.ResultName == "Endergebnis" {
			homeScore = r.PointsTeam1
			awayScore = r.PointsTeam2
		} else if r.ResultOrderID == 1 || r.ResultName == "Halbzeitergebnis" {
			meta["halftime_home"] = r.PointsTeam1
			meta["halftime_away"] = r.PointsTeam2
			if homeScore == 0 && awayScore == 0 {
				homeScore = r.PointsTeam1
				awayScore = r.PointsTeam2
			}
		}
	}

	var events []domain.Event
	for _, g := range m.Goals {
		events = append(events, domain.Event{
			ID:         fmt.Sprintf("ol-%d-%d", m.MatchID, g.GoalID),
			Type:       "goal",
			Minute:     g.MatchMinute,
			Player:     g.GoalGetterName,
			OccurredAt: m.MatchDateTimeUTC.Add(time.Duration(g.MatchMinute) * time.Minute),
		})
	}

	leagueName := m.LeagueName
	if leagueName == "" {
		leagueName = "Bundesliga"
	}

	return &domain.MatchEvent{
		ID:         fmt.Sprintf("football:openligadb:%d", m.MatchID),
		Sport:      domain.SportFootball,
		LeagueID:   "bl1",
		LeagueName: leagueName,
		HomeTeam: domain.Team{
			ID:        fmt.Sprintf("%d", m.Team1.TeamID),
			Name:      m.Team1.TeamName,
			ShortName: m.Team1.ShortName,
			LogoURL:   m.Team1.TeamIconURL,
		},
		AwayTeam: domain.Team{
			ID:        fmt.Sprintf("%d", m.Team2.TeamID),
			Name:      m.Team2.TeamName,
			ShortName: m.Team2.ShortName,
			LogoURL:   m.Team2.TeamIconURL,
		},
		Status:    status,
		StartTime: m.MatchDateTimeUTC,
		Score: &domain.Score{
			Home: homeScore,
			Away: awayScore,
			Meta: meta,
		},
		Clock: &domain.Clock{
			DisplayTime: string(status),
			IsRunning:   status == domain.StatusLive,
		},
		Events:    events,
		UpdatedAt: time.Now().UTC(),
	}
}
