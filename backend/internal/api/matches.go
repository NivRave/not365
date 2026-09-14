package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/NivRave/not365/backend/internal/domain"
	"github.com/NivRave/not365/backend/internal/store"
	"github.com/go-chi/chi/v5"
)

type MatchHandler struct {
	mongoStore *store.MongoStore
	redisStore *store.RedisStore
}

func NewMatchHandler(mongoStore *store.MongoStore, redisStore *store.RedisStore) *MatchHandler {
	return &MatchHandler{
		mongoStore: mongoStore,
		redisStore: redisStore,
	}
}

func (h *MatchHandler) ListSports(w http.ResponseWriter, r *http.Request) {
	sports := []map[string]any{
		{"id": "football", "name": "Football / Soccer", "icon": "⚽"},
		{"id": "basketball", "name": "Basketball", "icon": "🏀"},
		{"id": "mma", "name": "MMA / UFC", "icon": "🥊"},
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(sports)
}

func (h *MatchHandler) ListLeagues(w http.ResponseWriter, r *http.Request) {
	sport := chi.URLParam(r, "sport")
	var leagues []map[string]string

	switch sport {
	case "football":
		leagues = []map[string]string{
			{"id": "eng.1", "name": "Premier League", "country": "England"},
			{"id": "esp.1", "name": "La Liga", "country": "Spain"},
			{"id": "bl1", "name": "Bundesliga", "country": "Germany"},
			{"id": "ita.1", "name": "Serie A", "country": "Italy"},
			{"id": "uefa.champions", "name": "UEFA Champions League", "country": "Europe"},
		}
	case "basketball":
		leagues = []map[string]string{
			{"id": "nba", "name": "NBA", "country": "USA"},
			{"id": "euroleague", "name": "EuroLeague", "country": "Europe"},
		}
	case "mma":
		leagues = []map[string]string{
			{"id": "ufc", "name": "UFC", "country": "Global"},
		}
	default:
		leagues = []map[string]string{}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(leagues)
}

func (h *MatchHandler) ListMatches(w http.ResponseWriter, r *http.Request) {
	sportQuery := r.URL.Query().Get("sport")
	statusQuery := r.URL.Query().Get("status")
	dateQuery := r.URL.Query().Get("date")
	leagueQuery := r.URL.Query().Get("league_id")
	teamQuery := r.URL.Query().Get("team_id")
	teamIDsQuery := r.URL.Query().Get("team_ids")
	searchQuery := r.URL.Query().Get("search")

	filter := domain.MatchFilter{
		Status:   statusQuery,
		LeagueID: leagueQuery,
		TeamID:   teamQuery,
		Search:   searchQuery,
	}

	if sportQuery == "basketball" {
		filter.Sport = domain.SportBasketball
	} else if sportQuery == "mma" {
		filter.Sport = domain.SportMMA
	} else if sportQuery == "football" {
		filter.Sport = domain.SportFootball
	}

	if teamIDsQuery != "" {
		for _, id := range strings.Split(teamIDsQuery, ",") {
			id = strings.TrimSpace(id)
			if id != "" {
				filter.TeamIDs = append(filter.TeamIDs, id)
			}
		}
	}

	now := time.Now().UTC()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)

	switch dateQuery {
	case "today":
		end := startOfDay.Add(24*time.Hour - time.Nanosecond)
		filter.StartDate = &startOfDay
		filter.EndDate = &end
	case "yesterday":
		start := startOfDay.Add(-24 * time.Hour)
		end := startOfDay.Add(-time.Nanosecond)
		filter.StartDate = &start
		filter.EndDate = &end
	case "tomorrow":
		start := startOfDay.Add(24 * time.Hour)
		end := start.Add(24*time.Hour - time.Nanosecond)
		filter.StartDate = &start
		filter.EndDate = &end
	case "upcoming_7d":
		start := startOfDay
		end := startOfDay.Add(7 * 24 * time.Hour)
		filter.StartDate = &start
		filter.EndDate = &end
	case "all":
		// no date filter
	default:
		if dateQuery != "" {
			if parsed, err := time.Parse("2006-01-02", dateQuery); err == nil {
				start := time.Date(parsed.Year(), parsed.Month(), parsed.Day(), 0, 0, 0, 0, time.UTC)
				end := start.Add(24*time.Hour - time.Nanosecond)
				filter.StartDate = &start
				filter.EndDate = &end
			}
		} else {
			// default: broad coverage from yesterday to next 7 days
			start := startOfDay.Add(-24 * time.Hour)
			end := startOfDay.Add(7 * 24 * time.Hour)
			filter.StartDate = &start
			filter.EndDate = &end
		}
	}

	matches, err := h.mongoStore.ListMatches(r.Context(), filter)
	if err != nil || matches == nil {
		matches = []domain.MatchEvent{}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(matches)
}

func (h *MatchHandler) GetMatch(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "missing match id", http.StatusBadRequest)
		return
	}

	// Try Redis state first for live data
	match, err := h.redisStore.GetMatchState(r.Context(), id)
	if err == nil && match != nil {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(match)
		return
	}

	// Fallback to MongoDB
	match, err = h.mongoStore.GetMatchTimeline(r.Context(), id)
	if err != nil || match == nil {
		http.Error(w, "match not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(match)
}

func (h *MatchHandler) SyncMatch(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	sinceStr := r.URL.Query().Get("since")
	since, _ := strconv.ParseInt(sinceStr, 10, 64)

	events, err := h.mongoStore.GetEventsSince(r.Context(), id, since)
	if err != nil {
		events = []domain.Event{}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"match_id": id,
		"since":    since,
		"events":   events,
	})
}

func (h *MatchHandler) ListTeams(w http.ResponseWriter, r *http.Request) {
	sportQuery := r.URL.Query().Get("sport")
	leagueQuery := r.URL.Query().Get("league_id")

	var sport domain.Sport
	if sportQuery == "basketball" {
		sport = domain.SportBasketball
	} else if sportQuery == "mma" {
		sport = domain.SportMMA
	} else if sportQuery == "football" {
		sport = domain.SportFootball
	}

	teams, err := h.mongoStore.ListTeams(r.Context(), sport, leagueQuery)
	if err != nil || teams == nil {
		teams = []domain.Team{}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(teams)
}

func (h *MatchHandler) GetTeamDetail(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "missing team id", http.StatusBadRequest)
		return
	}

	team, matches, err := h.mongoStore.GetTeamDetail(r.Context(), id)
	if err != nil || team == nil {
		http.Error(w, "team not found", http.StatusNotFound)
		return
	}

	var recent []domain.MatchEvent
	var upcoming []domain.MatchEvent

	now := time.Now().UTC()
	for _, m := range matches {
		if m.Status == domain.StatusFinished || m.StartTime.Before(now) {
			recent = append(recent, m)
		} else {
			upcoming = append(upcoming, m)
		}
	}

	var form []string
	for i := len(recent) - 1; i >= 0 && len(form) < 5; i-- {
		m := recent[i]
		if m.Score != nil {
			isHome := m.HomeTeam.ID == id
			if (isHome && m.Score.Home > m.Score.Away) || (!isHome && m.Score.Away > m.Score.Home) {
				form = append([]string{"W"}, form...)
			} else if m.Score.Home == m.Score.Away {
				form = append([]string{"D"}, form...)
			} else {
				form = append([]string{"L"}, form...)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"team":             team,
		"form":             form,
		"recent_matches":   recent,
		"upcoming_matches": upcoming,
	})
}

func (h *MatchHandler) GetLeagueStandings(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "missing league id", http.StatusBadRequest)
		return
	}

	standings, err := h.mongoStore.GetLeagueStandings(r.Context(), id)
	if err != nil || standings == nil {
		standings = []domain.StandingsRow{}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(standings)
}

func (h *MatchHandler) GetMatchH2H(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "missing match id", http.StatusBadRequest)
		return
	}

	match, err := h.mongoStore.GetMatchTimeline(r.Context(), id)
	if err != nil || match == nil {
		http.Error(w, "match not found", http.StatusNotFound)
		return
	}

	encounters, err := h.mongoStore.GetMatchH2H(r.Context(), match.HomeTeam.ID, match.AwayTeam.ID)
	if err != nil || encounters == nil {
		encounters = []domain.H2HEncounter{}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(encounters)
}

func (h *MatchHandler) SimulateMatch(w http.ResponseWriter, r *http.Request) {
	simID := fmt.Sprintf("football:sim:%d", time.Now().Unix())
	match := &domain.MatchEvent{
		ID:         simID,
		Sport:      domain.SportFootball,
		LeagueID:   "eng.1",
		LeagueName: "Premier League (Live Sim)",
		HomeTeam: domain.Team{
			ID:        "sim-ars",
			Name:      "Arsenal",
			ShortName: "ARS",
			LogoURL:   "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg",
		},
		AwayTeam: domain.Team{
			ID:        "sim-che",
			Name:      "Chelsea",
			ShortName: "CHE",
			LogoURL:   "https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg",
		},
		Status:    domain.StatusLive,
		StartTime: time.Now().UTC(),
		Score: &domain.Score{
			Home: 0,
			Away: 0,
		},
		Clock: &domain.Clock{
			DisplayTime: "1'",
			Period:      1,
			IsRunning:   true,
		},
		Events:    []domain.Event{},
		Sequence:  1,
		UpdatedAt: time.Now().UTC(),
		Stats: &domain.MatchStats{
			PossessionHome:    56,
			PossessionAway:    44,
			ShotsHome:         1,
			ShotsAway:         0,
			ShotsOnTargetHome: 1,
			ShotsOnTargetAway: 0,
			CornersHome:       1,
			CornersAway:       0,
			FoulsHome:         1,
			FoulsAway:         2,
		},
	}

	ctx := context.Background()
	_ = h.redisStore.SetMatchState(ctx, match)
	_ = h.mongoStore.UpsertMatchTimeline(ctx, match)

	_ = h.redisStore.PublishMatchUpdate(ctx, &domain.HybridPayload{
		MatchID:  match.ID,
		Sequence: 1,
		Snapshot: match,
	})

	go h.runMatchSimulation(match)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(match)
}

func (h *MatchHandler) runMatchSimulation(m *domain.MatchEvent) {
	type simStep struct {
		delaySec    int
		minute      int
		displayTime string
		homeScore   int
		awayScore   int
		status      domain.MatchStatus
		event       *domain.Event
		stats       *domain.MatchStats
	}

	steps := []simStep{
		{
			delaySec:    3,
			minute:      14,
			displayTime: "14'",
			homeScore:   0,
			awayScore:   0,
			status:      domain.StatusLive,
			event: &domain.Event{
				ID:         fmt.Sprintf("%s-ev-1", m.ID),
				Type:       "yellow_card",
				Minute:     14,
				Player:     "Enzo Fernández",
				TeamID:     m.AwayTeam.ID,
				OccurredAt: time.Now().UTC(),
			},
			stats: &domain.MatchStats{
				PossessionHome: 58, PossessionAway: 42,
				ShotsHome: 2, ShotsAway: 1,
				ShotsOnTargetHome: 1, ShotsOnTargetAway: 0,
				CornersHome: 2, CornersAway: 0,
				FoulsHome: 2, FoulsAway: 4,
				YellowCardsAway: 1,
			},
		},
		{
			delaySec:    6,
			minute:      24,
			displayTime: "24'",
			homeScore:   1,
			awayScore:   0,
			status:      domain.StatusLive,
			event: &domain.Event{
				ID:         fmt.Sprintf("%s-ev-2", m.ID),
				Type:       "goal",
				Minute:     24,
				Player:     "Bukayo Saka",
				TeamID:     m.HomeTeam.ID,
				OccurredAt: time.Now().UTC(),
			},
			stats: &domain.MatchStats{
				PossessionHome: 61, PossessionAway: 39,
				ShotsHome: 5, ShotsAway: 1,
				ShotsOnTargetHome: 3, ShotsOnTargetAway: 0,
				CornersHome: 3, CornersAway: 0,
				FoulsHome: 3, FoulsAway: 5,
				YellowCardsAway: 1,
			},
		},
		{
			delaySec:    6,
			minute:      45,
			displayTime: "HT",
			homeScore:   1,
			awayScore:   0,
			status:      domain.StatusHalftime,
			stats: &domain.MatchStats{
				PossessionHome: 60, PossessionAway: 40,
				ShotsHome: 7, ShotsAway: 2,
				ShotsOnTargetHome: 4, ShotsOnTargetAway: 1,
				CornersHome: 4, CornersAway: 1,
				FoulsHome: 4, FoulsAway: 6,
				YellowCardsAway: 1,
			},
		},
		{
			delaySec:    6,
			minute:      58,
			displayTime: "58'",
			homeScore:   1,
			awayScore:   1,
			status:      domain.StatusLive,
			event: &domain.Event{
				ID:         fmt.Sprintf("%s-ev-3", m.ID),
				Type:       "goal",
				Minute:     58,
				Player:     "Cole Palmer",
				TeamID:     m.AwayTeam.ID,
				OccurredAt: time.Now().UTC(),
			},
			stats: &domain.MatchStats{
				PossessionHome: 54, PossessionAway: 46,
				ShotsHome: 8, ShotsAway: 5,
				ShotsOnTargetHome: 4, ShotsOnTargetAway: 3,
				CornersHome: 5, CornersAway: 3,
				FoulsHome: 5, FoulsAway: 7,
				YellowCardsAway: 1,
			},
		},
		{
			delaySec:    6,
			minute:      83,
			displayTime: "83'",
			homeScore:   2,
			awayScore:   1,
			status:      domain.StatusLive,
			event: &domain.Event{
				ID:         fmt.Sprintf("%s-ev-4", m.ID),
				Type:       "goal",
				Minute:     83,
				Player:     "Kai Havertz",
				TeamID:     m.HomeTeam.ID,
				OccurredAt: time.Now().UTC(),
			},
			stats: &domain.MatchStats{
				PossessionHome: 55, PossessionAway: 45,
				ShotsHome: 12, ShotsAway: 7,
				ShotsOnTargetHome: 6, ShotsOnTargetAway: 4,
				CornersHome: 7, CornersAway: 4,
				FoulsHome: 7, FoulsAway: 9,
				YellowCardsHome: 1, YellowCardsAway: 1,
			},
		},
		{
			delaySec:    5,
			minute:      90,
			displayTime: "FT",
			homeScore:   2,
			awayScore:   1,
			status:      domain.StatusFinished,
			stats: &domain.MatchStats{
				PossessionHome: 55, PossessionAway: 45,
				ShotsHome: 13, ShotsAway: 8,
				ShotsOnTargetHome: 6, ShotsOnTargetAway: 4,
				CornersHome: 7, CornersAway: 4,
				FoulsHome: 8, FoulsAway: 10,
				YellowCardsHome: 1, YellowCardsAway: 1,
			},
		},
	}

	ctx := context.Background()

	for _, step := range steps {
		time.Sleep(time.Duration(step.delaySec) * time.Second)

		m.Clock.DisplayTime = step.displayTime
		m.Clock.Period = 1
		if step.minute > 45 {
			m.Clock.Period = 2
		}
		m.Clock.IsRunning = step.status == domain.StatusLive
		m.Status = step.status
		m.Score.Home = step.homeScore
		m.Score.Away = step.awayScore
		if step.stats != nil {
			m.Stats = step.stats
		}

		if step.event != nil {
			m.Events = append(m.Events, *step.event)
		}

		seq, err := h.redisStore.IncrMatchSequence(ctx, m.ID)
		if err != nil {
			seq = m.Sequence + 1
		}
		m.Sequence = seq
		m.UpdatedAt = time.Now().UTC()

		_ = h.redisStore.SetMatchState(ctx, m)
		_ = h.mongoStore.UpsertMatchTimeline(ctx, m)

		delta := []domain.Event{}
		if step.event != nil {
			delta = []domain.Event{*step.event}
		}

		_ = h.redisStore.PublishMatchUpdate(ctx, &domain.HybridPayload{
			MatchID:  m.ID,
			Sequence: seq,
			Snapshot: m,
			Delta:    delta,
		})
	}
}

