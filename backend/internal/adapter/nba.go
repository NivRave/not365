package adapter

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/NivRave/not365/backend/internal/domain"
)

type NBAAdapter struct{}

func NewNBAAdapter() *NBAAdapter {
	return &NBAAdapter{}
}

func (a *NBAAdapter) Sport() domain.Sport {
	return domain.SportBasketball
}

func (a *NBAAdapter) Supports(providerID, leagueID string) bool {
	return strings.ToLower(providerID) == "nba" || strings.ToLower(leagueID) == "nba"
}

type nbaScoreboardResponse struct {
	Scoreboard struct {
		GameDate string    `json:"gameDate"`
		Games    []nbaGame `json:"games"`
	} `json:"scoreboard"`
}

type nbaPeriodScore struct {
	Period     int    `json:"period"`
	PeriodType string `json:"periodType"`
	Score      int    `json:"score"`
}

type nbaTeam struct {
	TeamID      int              `json:"teamId"`
	TeamName    string           `json:"teamName"`
	TeamCity    string           `json:"teamCity"`
	TeamTricode string           `json:"teamTricode"`
	Score       int              `json:"score"`
	Periods     []nbaPeriodScore `json:"periods"`
}

type nbaGame struct {
	GameID         string    `json:"gameId"`
	GameCode       string    `json:"gameCode"`
	GameStatus     int       `json:"gameStatus"` // 1: scheduled, 2: in-progress, 3: final
	GameStatusText string    `json:"gameStatusText"`
	Period         int       `json:"period"`
	GameClock      string    `json:"gameClock"`
	GameTimeUTC    time.Time `json:"gameTimeUTC"`
	HomeTeam       nbaTeam   `json:"homeTeam"`
	AwayTeam       nbaTeam   `json:"awayTeam"`
}

func (a *NBAAdapter) ParseScoreboard(raw json.RawMessage) ([]domain.MatchEvent, error) {
	var resp nbaScoreboardResponse
	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse NBA scoreboard JSON: %w", err)
	}

	var matches []domain.MatchEvent
	for _, g := range resp.Scoreboard.Games {
		matches = append(matches, *a.convertGame(&g))
	}
	return matches, nil
}

func (a *NBAAdapter) ParseMatchDetail(raw json.RawMessage) (*domain.MatchEvent, error) {
	var g nbaGame
	if err := json.Unmarshal(raw, &g); err != nil {
		return nil, fmt.Errorf("failed to parse NBA game detail JSON: %w", err)
	}
	return a.convertGame(&g), nil
}

func (a *NBAAdapter) convertGame(g *nbaGame) *domain.MatchEvent {
	var status domain.MatchStatus
	switch g.GameStatus {
	case 1:
		status = domain.StatusScheduled
	case 2:
		if strings.Contains(strings.ToLower(g.GameStatusText), "half") {
			status = domain.StatusHalftime
		} else {
			status = domain.StatusLive
		}
	case 3:
		status = domain.StatusFinished
	default:
		status = domain.StatusScheduled
	}

	homePeriods := make(map[string]int)
	for _, p := range g.HomeTeam.Periods {
		homePeriods[fmt.Sprintf("Q%d", p.Period)] = p.Score
	}
	awayPeriods := make(map[string]int)
	for _, p := range g.AwayTeam.Periods {
		awayPeriods[fmt.Sprintf("Q%d", p.Period)] = p.Score
	}

	meta := map[string]any{
		"home_quarters": homePeriods,
		"away_quarters": awayPeriods,
	}

	score := &domain.Score{
		Home: g.HomeTeam.Score,
		Away: g.AwayTeam.Score,
		Meta: meta,
	}

	clock := &domain.Clock{
		DisplayTime: strings.TrimSpace(g.GameStatusText),
		Period:      g.Period,
		IsRunning:   g.GameStatus == 2,
	}

	homeTeam := domain.Team{
		ID:        fmt.Sprintf("%d", g.HomeTeam.TeamID),
		Name:      fmt.Sprintf("%s %s", g.HomeTeam.TeamCity, g.HomeTeam.TeamName),
		ShortName: g.HomeTeam.TeamTricode,
		LogoURL:   fmt.Sprintf("https://cdn.nba.com/logos/nba/%d/global/L/logo.svg", g.HomeTeam.TeamID),
	}

	awayTeam := domain.Team{
		ID:        fmt.Sprintf("%d", g.AwayTeam.TeamID),
		Name:      fmt.Sprintf("%s %s", g.AwayTeam.TeamCity, g.AwayTeam.TeamName),
		ShortName: g.AwayTeam.TeamTricode,
		LogoURL:   fmt.Sprintf("https://cdn.nba.com/logos/nba/%d/global/L/logo.svg", g.AwayTeam.TeamID),
	}

	return &domain.MatchEvent{
		ID:         fmt.Sprintf("basketball:nba:%s", g.GameID),
		Sport:      domain.SportBasketball,
		LeagueID:   "nba",
		LeagueName: "NBA",
		HomeTeam:   homeTeam,
		AwayTeam:   awayTeam,
		Status:     status,
		StartTime:  g.GameTimeUTC,
		Score:      score,
		Clock:      clock,
		UpdatedAt:  time.Now().UTC(),
	}
}
