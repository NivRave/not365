package auth

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"

	"github.com/NivRave/not365/backend/internal/store"
	"github.com/google/uuid"
)

type AuthHandler struct {
	store      *store.PostgresStore
	jwtManager *JWTManager
	authMode   string
}

func NewAuthHandler(store *store.PostgresStore, jwtManager *JWTManager, authMode string) *AuthHandler {
	if authMode == "" {
		authMode = "stub"
	}
	return &AuthHandler{
		store:      store,
		jwtManager: jwtManager,
		authMode:   authMode,
	}
}

type LoginRequest struct {
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
	AvatarURL   string `json:"avatar_url,omitempty"`
}

type AuthResponse struct {
	Token        string      `json:"token"`
	RefreshToken string      `json:"refresh_token"`
	ExpiresIn    int64       `json:"expires_in"`
	User         *store.User `json:"user"`
}

func (h *AuthHandler) HandleDevLogin(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Email == "" {
		req.Email = "dev@not365.app"
	}
	if req.DisplayName == "" {
		req.DisplayName = "Dev User"
	}

	user, err := h.store.UpsertUser(r.Context(), req.Email, req.DisplayName, req.AvatarURL)
	if err != nil {
		http.Error(w, "failed to upsert user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	token, err := h.jwtManager.GenerateToken(user.ID, user.Email)
	if err != nil {
		http.Error(w, "failed to issue token", http.StatusInternalServerError)
		return
	}

	// Create session
	refreshToken := uuid.New().String()
	tokenHash := sha256.Sum256([]byte(token))
	hashStr := hex.EncodeToString(tokenHash[:])
	_ = h.store.UpsertOAuthAccount(r.Context(), user.ID, "dev-stub", user.Email, "", "", nil)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(AuthResponse{
		Token:        token,
		RefreshToken: refreshToken,
		ExpiresIn:    900,
		User:         user,
	})
	_ = hashStr
}

func (h *AuthHandler) HandleOAuthGoogle(w http.ResponseWriter, r *http.Request) {
	if h.authMode == "stub" {
		h.HandleDevLogin(w, r)
		return
	}
	http.Error(w, "OAuth credentials not yet configured in production mode", http.StatusNotImplemented)
}

func (h *AuthHandler) HandleOAuthApple(w http.ResponseWriter, r *http.Request) {
	if h.authMode == "stub" {
		h.HandleDevLogin(w, r)
		return
	}
	http.Error(w, "Apple OAuth not yet configured in production mode", http.StatusNotImplemented)
}

func (h *AuthHandler) HandleRefresh(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
		UserID       string `json:"user_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	uID, err := uuid.Parse(req.UserID)
	if err != nil {
		http.Error(w, "invalid user id", http.StatusBadRequest)
		return
	}

	user, err := h.store.GetUserByID(r.Context(), uID)
	if err != nil {
		http.Error(w, "user not found", http.StatusUnauthorized)
		return
	}

	token, err := h.jwtManager.GenerateToken(user.ID, user.Email)
	if err != nil {
		http.Error(w, "token issue error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"token":      token,
		"expires_in": 900,
	})
}

func (h *AuthHandler) HandleLogout(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"logged_out"}`))
}
