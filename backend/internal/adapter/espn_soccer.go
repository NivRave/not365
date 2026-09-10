package adapter

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/NivRave/not365/backend/internal/domain"
)

type ESPNSoccerAdapter struct{}

func NewESPNSoccerAdapter() *ESPNSoccerAdapter {
	return &ESPNSoccerAdapter{}
}

func (a *ESPNSoccerAdapter) Sport() domain.Sport {
	return domain.SportFootball
}

func (a *ESPNSoccerAdapter) Supports(providerID, leagueID string) bool {
	return strings.ToLower(providerID) == "espn"
}

type espnScoreboardResponse struct {
	Leagues []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
		Slug string `json:"slug"`
	} `json:"leagues"`
	Events []espnEvent `json:"events"`
}

type espnEvent struct {
	ID     string    `json:"id"`
	Date   time.Time `json:"date"`
	Name   string    `json:"name"`
	Status struct {
		Clock        float64 `json:"clock"`
		DisplayClock string  `json:"displayClock"`
		Period       int     `json:"period"`
		Type         struct {
			ID          string `json:"id"`
			Name        string `json:"name"`
			State       string `json:"state"` // "pre", "in", "post"
			Completed   bool   `json:"completed"`
			Description string `json:"description"`
		} `json:"type"`
	} `json:"status"`
	Competitions []struct {
		ID          string `json:"id"`
		Competitors []struct {
			ID       string `json:"id"`
			HomeAway string `json:"homeAway"`
			Score    string `json:"score"`
			Team     struct {
				ID               string `json:"id"`
				Name             string `json:"name"`
				DisplayName      string `json:"displayName"`
				ShortDisplayName string `json:"shortDisplayName"`
				Abbreviation     string `json:"abbreviation"`
				Logo             string `json:"logo"`
			} `json:"team"`
		} `json:"competitors"`
		Details []struct {
			Type struct {
				Text string `json:"text"`
			} `json:"type"`
			Clock struct {
				DisplayValue string `json:"displayValue"`
			} `json:"clock"`
			Team struct {
				ID string `json:"id"`
			} `json:"team"`
			AthletesInvolved []struct {
				DisplayName string `json:"displayName"`
			} `json:"athletesInvolved"`
		} `json:"details"`
	} `json:"competitions"`
}

func (a *ESPNSoccerAdapter) ParseScoreboard(raw json.RawMessage) ([]domain.MatchEvent, error) {
	var resp espnScoreboardResponse
	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse ESPN scoreboard JSON: %w", err)
	}

	leagueID := "soccer"
	leagueName := "Soccer"
	if len(resp.Leagues) > 0 {
		leagueID = resp.Leagues[0].ID
		leagueName = resp.Leagues[0].Name
	}

	var matches []domain.MatchEvent
	for _, ev := range resp.Events {
		m, err := a.convertEvent(&ev, leagueID, leagueName)
		if err != nil {
			continue
		}
		matches = append(matches, *m)
	}

	return matches, nil
}

func (a *ESPNSoccerAdapter) ParseMatchDetail(raw json.RawMessage) (*domain.MatchEvent, error) {
	var ev espnEvent
	if err := json.Unmarshal(raw, &ev); err != nil {
		return nil, fmt.Errorf("failed to parse ESPN match detail JSON: %w", err)
	}
	return a.convertEvent(&ev, "soccer", "Soccer")
}

func (a *ESPNSoccerAdapter) convertEvent(ev *espnEvent, defaultLeagueID, defaultLeagueName string) (*domain.MatchEvent, error) {
	if len(ev.Competitions) == 0 || len(ev.Competitions[0].Competitors) < 2 {
		return nil, fmt.Errorf("insufficient competitor data for event %s", ev.ID)
	}

	comp := ev.Competitions[0]
	var homeTeam, awayTeam domain.Team
	var homeScore, awayScore int

	for _, c := range comp.Competitors {
		scoreVal, _ := strconv.Atoi(c.Score)
		t := domain.Team{
			ID:        c.Team.ID,
			Name:      c.Team.DisplayName,
			ShortName: c.Team.Abbreviation,
			LogoURL:   c.Team.Logo,
		}
		if t.Name == "" {
			t.Name = c.Team.Name
		}
		if t.ShortName == "" {
			t.ShortName = c.Team.ShortDisplayName
		}

		if c.HomeAway == "home" {
			homeTeam = t
			homeScore = scoreVal
		} else {
			awayTeam = t
			awayScore = scoreVal
		}
	}

	// Status mapping
	var status domain.MatchStatus
	switch ev.Status.Type.State {
	case "in":
		if strings.Contains(strings.ToLower(ev.Status.Type.Description), "halftime") {
			status = domain.StatusHalftime
		} else {
			status = domain.StatusLive
		}
	case "post":
		status = domain.StatusFinished
	case "pre":
		status = domain.StatusScheduled
	default:
		if ev.Status.Type.Completed {
			status = domain.StatusFinished
		} else {
			status = domain.StatusScheduled
		}
	}

	clock := &domain.Clock{
		DisplayTime: ev.Status.DisplayClock,
		Period:      ev.Status.Period,
		IsRunning:   ev.Status.Type.State == "in",
	}
	if clock.DisplayTime == "" {
		clock.DisplayTime = ev.Status.Type.Description
	}

	score := &domain.Score{
		Home: homeScore,
		Away: awayScore,
	}

	// Extract timeline events (goals, cards, etc.)
	var events []domain.Event
	for i, d := range comp.Details {
		minute := 0
		minStr := strings.TrimSuffix(d.Clock.DisplayValue, "'")
		if m, err := strconv.Atoi(minStr); err == nil {
			minute = m
		}

		player := ""
		if len(d.AthletesInvolved) > 0 {
			player = d.AthletesInvolved[0].DisplayName
		}

		eventType := strings.ToLower(d.Type.Text)
		if eventType == "" {
			eventType = "event"
		}

		events = append(events, domain.Event{
			ID:         fmt.Sprintf("%s-ev-%d", ev.ID, i),
			Type:       eventType,
			Minute:     minute,
			Player:     player,
			TeamID:     d.Team.ID,
			OccurredAt: ev.Date.Add(time.Duration(minute) * time.Minute),
		})
	}

	canonicalID := fmt.Sprintf("football:espn:%s", ev.ID)

	return &domain.MatchEvent{
		ID:         canonicalID,
		Sport:      domain.SportFootball,
		LeagueID:   defaultLeagueID,
		LeagueName: defaultLeagueName,
		HomeTeam:   homeTeam,
		AwayTeam:   awayTeam,
		Status:     status,
		StartTime:  ev.Date,
		Score:      score,
		Clock:      clock,
		Events:     events,
		UpdatedAt:  time.Now().UTC(),
	}, nil
}
