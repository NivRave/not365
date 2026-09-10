package auth_test

import (
	"testing"

	"github.com/NivRave/not365/backend/internal/auth"
	"github.com/google/uuid"
)

func TestJWTManager_RoundTrip(t *testing.T) {
	mgr := auth.NewJWTManager("test-secret-key-32-characters-minimum!!")

	userID := uuid.New()
	email := "user@example.com"

	token, err := mgr.GenerateToken(userID, email)
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}

	claims, err := mgr.VerifyToken(token)
	if err != nil {
		t.Fatalf("VerifyToken failed: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("Expected UserID %v, got %v", userID, claims.UserID)
	}
	if claims.Email != email {
		t.Errorf("Expected Email %s, got %s", email, claims.Email)
	}
}
