package api

import (
	"encoding/json"
	"net/http"
	"strconv"
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
	sport := domain.SportFootball
	if sportQuery == "basketball" {
		sport = domain.SportBasketball
	} else if sportQuery == "mma" {
		sport = domain.SportMMA
	}

	now := time.Now().UTC()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC).Add(-24 * time.Hour)
	endOfDay := startOfDay.Add(48 * time.Hour)

	matches, err := h.mongoStore.ListMatchesBySportAndDate(r.Context(), sport, startOfDay, endOfDay)
	if err != nil {
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
