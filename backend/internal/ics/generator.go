package ics

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/NivRave/not365/backend/internal/domain"
	"github.com/NivRave/not365/backend/internal/store"
	"github.com/go-chi/chi/v5"
)

type CalendarHandler struct {
	pgStore    *store.PostgresStore
	mongoStore *store.MongoStore
}

func NewCalendarHandler(pgStore *store.PostgresStore, mongoStore *store.MongoStore) *CalendarHandler {
	return &CalendarHandler{
		pgStore:    pgStore,
		mongoStore: mongoStore,
	}
}

func (h *CalendarHandler) HandleCalendarExport(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	token = strings.TrimSuffix(token, ".ics")

	if token == "" {
		http.Error(w, "missing calendar token", http.StatusBadRequest)
		return
	}

	user, err := h.pgStore.GetUserByCalendarToken(r.Context(), token)
	if err != nil || user == nil {
		http.Error(w, "calendar not found", http.StatusNotFound)
		return
	}

	follows, err := h.pgStore.ListFollows(r.Context(), user.ID)
	if err != nil {
		http.Error(w, "error loading follows", http.StatusInternalServerError)
		return
	}

	// Fetch matches for the next 14 days
	now := time.Now().UTC()
	start := now.Add(-24 * time.Hour)
	end := now.Add(14 * 24 * time.Hour)

	var matches []domain.MatchEvent
	for _, sport := range []domain.Sport{domain.SportFootball, domain.SportBasketball} {
		mList, err := h.mongoStore.ListMatchesBySportAndDate(r.Context(), sport, start, end)
		if err == nil {
			matches = append(matches, mList...)
		}
	}

	// Filter matches that involve followed entities
	followedSet := make(map[string]bool)
	for _, f := range follows {
		followedSet[f.EntityID] = true
	}

	var userMatches []domain.MatchEvent
	for _, m := range matches {
		if len(follows) == 0 || followedSet[m.HomeTeam.ID] || followedSet[m.AwayTeam.ID] || followedSet[m.LeagueID] {
			userMatches = append(userMatches, m)
		}
	}

	// Build RFC 5545 iCalendar stream
	w.Header().Set("Content-Type", "text/calendar; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename=\"not365-schedule.ics\"")

	var sb strings.Builder
	sb.WriteString("BEGIN:VCALENDAR\r\n")
	sb.WriteString("VERSION:2.0\r\n")
	sb.WriteString("PRODID:-//not365//Sports Calendar 1.0//EN\r\n")
	sb.WriteString("CALSCALE:GREGORIAN\r\n")
	sb.WriteString("METHOD:PUBLISH\r\n")
	sb.WriteString(fmt.Sprintf("X-WR-CALNAME:not365 - %s's Sports\r\n", user.DisplayName))

	for _, m := range userMatches {
		dtStart := m.StartTime.Format("20060102T150405Z")
		dtEnd := m.StartTime.Add(2 * time.Hour).Format("20060102T150405Z")
		summary := fmt.Sprintf("%s vs %s (%s)", m.HomeTeam.Name, m.AwayTeam.Name, m.LeagueName)
		desc := fmt.Sprintf("Live scores & updates on not365. Match Status: %s", m.Status)

		sb.WriteString("BEGIN:VEVENT\r\n")
		sb.WriteString(fmt.Sprintf("UID:%s@not365.app\r\n", m.ID))
		sb.WriteString(fmt.Sprintf("DTSTAMP:%s\r\n", time.Now().UTC().Format("20060102T150405Z")))
		sb.WriteString(fmt.Sprintf("DTSTART:%s\r\n", dtStart))
		sb.WriteString(fmt.Sprintf("DTEND:%s\r\n", dtEnd))
		sb.WriteString(fmt.Sprintf("SUMMARY:%s\r\n", summary))
		sb.WriteString(fmt.Sprintf("DESCRIPTION:%s\r\n", desc))
		sb.WriteString("STATUS:CONFIRMED\r\n")
		sb.WriteString("END:VEVENT\r\n")
	}

	sb.WriteString("END:VCALENDAR\r\n")
	_, _ = w.Write([]byte(sb.String()))
}
