package gateway

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/NivRave/not365/backend/internal/domain"
	"github.com/go-chi/chi/v5"
)

func (h *Hub) HandleMatchSSE(w http.ResponseWriter, r *http.Request) {
	matchID := chi.URLParam(r, "id")
	if matchID == "" {
		http.Error(w, "missing match id", http.StatusBadRequest)
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	// Set SSE Headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Check Last-Event-ID for reconnection replay
	lastEventID := r.Header.Get("Last-Event-ID")
	if lastEventID != "" {
		if sinceSeq, err := strconv.ParseInt(lastEventID, 10, 64); err == nil {
			missedEvents, err := h.mongo.GetEventsSince(r.Context(), matchID, sinceSeq)
			if err == nil && len(missedEvents) > 0 {
				missedPayload, _ := json.Marshal(map[string]any{
					"match_id": matchID,
					"replay":   missedEvents,
				})
				fmt.Fprintf(w, "event: replay\ndata: %s\n\n", missedPayload)
				flusher.Flush()
			}
		}
	}

	// Send initial snapshot
	initialState, err := h.redis.GetMatchState(r.Context(), matchID)
	if err == nil && initialState != nil {
		data, _ := json.Marshal(initialState)
		fmt.Fprintf(w, "id: %d\nevent: match_snapshot\ndata: %s\n\n", initialState.Sequence, data)
		flusher.Flush()
	} else {
		// Try MongoDB fallback
		timeline, err := h.mongo.GetMatchTimeline(r.Context(), matchID)
		if err == nil && timeline != nil {
			data, _ := json.Marshal(timeline)
			fmt.Fprintf(w, "id: %d\nevent: match_snapshot\ndata: %s\n\n", timeline.Sequence, data)
			flusher.Flush()
		}
	}

	// Register with Hub
	clientChan := make(chan []byte, 64)
	h.Register(matchID, clientChan)
	defer h.Deregister(matchID, clientChan)

	// Keep-alive ticker
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			fmt.Fprintf(w, ": ping\n\n")
			flusher.Flush()
		case msg := <-clientChan:
			var payload domain.HybridPayload
			if err := json.Unmarshal(msg, &payload); err == nil {
				fmt.Fprintf(w, "id: %d\nevent: match_update\ndata: %s\n\n", payload.Sequence, msg)
			} else {
				fmt.Fprintf(w, "event: match_update\ndata: %s\n\n", msg)
			}
			flusher.Flush()
		}
	}
}
