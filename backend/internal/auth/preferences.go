package auth

import (
	"encoding/json"
	"net/http"

	"github.com/NivRave/not365/backend/internal/store"
	"github.com/go-chi/chi/v5"
)

type PreferencesHandler struct {
	store *store.PostgresStore
}

func NewPreferencesHandler(store *store.PostgresStore) *PreferencesHandler {
	return &PreferencesHandler{store: store}
}

func (h *PreferencesHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	user, err := h.store.GetUserByID(r.Context(), userID)
	if err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(user)
}

func (h *PreferencesHandler) ListFollows(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	follows, err := h.store.ListFollows(r.Context(), userID)
	if err != nil {
		http.Error(w, "failed to load follows", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(follows)
}

func (h *PreferencesHandler) AddFollow(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		EntityType string `json:"entity_type"`
		EntityID   string `json:"entity_id"`
		EntityName string `json:"entity_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.store.AddFollow(r.Context(), userID, req.EntityType, req.EntityID, req.EntityName); err != nil {
		http.Error(w, "failed to add follow", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	_, _ = w.Write([]byte(`{"status":"followed"}`))
}

func (h *PreferencesHandler) DeleteFollow(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	entityID := chi.URLParam(r, "id")
	if entityID == "" {
		http.Error(w, "missing entity id", http.StatusBadRequest)
		return
	}

	if err := h.store.DeleteFollow(r.Context(), userID, entityID); err != nil {
		http.Error(w, "failed to delete follow", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"unfollowed"}`))
}

func (h *PreferencesHandler) RegisterPush(w http.ResponseWriter, r *http.Request) {
	userID, ok := GetUserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		Endpoint string `json:"endpoint"`
		Keys     struct {
			P256dh string `json:"p256dh"`
			Auth   string `json:"auth"`
		} `json:"keys"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid push subscription payload", http.StatusBadRequest)
		return
	}

	if err := h.store.UpsertPushSubscription(r.Context(), userID, req.Endpoint, req.Keys.P256dh, req.Keys.Auth); err != nil {
		http.Error(w, "failed to register push subscription", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"subscribed"}`))
}

func (h *PreferencesHandler) RemovePush(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Endpoint string `json:"endpoint"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.store.DeletePushSubscription(r.Context(), req.Endpoint); err != nil {
		http.Error(w, "failed to remove subscription", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"unsubscribed"}`))
}
