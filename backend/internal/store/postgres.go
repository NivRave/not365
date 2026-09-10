package store

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type User struct {
	ID            uuid.UUID `json:"id"`
	Email         string    `json:"email"`
	DisplayName   string    `json:"display_name"`
	AvatarURL     string    `json:"avatar_url,omitempty"`
	CalendarToken string    `json:"calendar_token"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type OAuthAccount struct {
	ID             uuid.UUID  `json:"id"`
	UserID         uuid.UUID  `json:"user_id"`
	Provider       string     `json:"provider"`
	ProviderUserID string     `json:"provider_user_id"`
	AccessToken    string     `json:"-"`
	RefreshToken   string     `json:"-"`
	ExpiresAt      *time.Time `json:"expires_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

type Follow struct {
	UserID     uuid.UUID `json:"user_id"`
	EntityType string    `json:"entity_type"` // "team" or "league"
	EntityID   string    `json:"entity_id"`
	EntityName string    `json:"entity_name"`
	CreatedAt  time.Time `json:"created_at"`
}

type PushSubscription struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Endpoint  string    `json:"endpoint"`
	P256dhKey string    `json:"p256dh_key"`
	AuthKey   string    `json:"auth_key"`
	CreatedAt time.Time `json:"created_at"`
}

type PostgresStore struct {
	pool *pgxpool.Pool
}

func NewPostgresStore(ctx context.Context, dsn string) (*PostgresStore, error) {
	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to parse postgres DSN: %w", err)
	}

	config.MaxConns = 25
	config.MinConns = 2
	config.MaxConnLifetime = 1 * time.Hour
	config.MaxConnIdleTime = 30 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create postgres pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping postgres: %w", err)
	}

	return &PostgresStore{pool: pool}, nil
}

func (s *PostgresStore) Close() {
	s.pool.Close()
}

func (s *PostgresStore) UpsertUser(ctx context.Context, email, displayName, avatarURL string) (*User, error) {
	calToken := uuid.New().String()
	id := uuid.New()

	query := `
		INSERT INTO users (id, email, display_name, avatar_url, calendar_token, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		ON CONFLICT (email) DO UPDATE
		SET display_name = EXCLUDED.display_name,
		    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
		    updated_at = NOW()
		RETURNING id, email, display_name, COALESCE(avatar_url, ''), calendar_token, created_at, updated_at;
	`
	var u User
	err := s.pool.QueryRow(ctx, query, id, email, displayName, avatarURL, calToken).Scan(
		&u.ID, &u.Email, &u.DisplayName, &u.AvatarURL, &u.CalendarToken, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *PostgresStore) GetUserByID(ctx context.Context, id uuid.UUID) (*User, error) {
	query := `
		SELECT id, email, display_name, COALESCE(avatar_url, ''), calendar_token, created_at, updated_at
		FROM users
		WHERE id = $1 LIMIT 1;
	`
	var u User
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&u.ID, &u.Email, &u.DisplayName, &u.AvatarURL, &u.CalendarToken, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *PostgresStore) GetUserByCalendarToken(ctx context.Context, token string) (*User, error) {
	query := `
		SELECT id, email, display_name, COALESCE(avatar_url, ''), calendar_token, created_at, updated_at
		FROM users
		WHERE calendar_token = $1 LIMIT 1;
	`
	var u User
	err := s.pool.QueryRow(ctx, query, token).Scan(
		&u.ID, &u.Email, &u.DisplayName, &u.AvatarURL, &u.CalendarToken, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *PostgresStore) UpsertOAuthAccount(ctx context.Context, userID uuid.UUID, provider, providerUserID, accessToken, refreshToken string, expiresAt *time.Time) error {
	query := `
		INSERT INTO oauth_accounts (user_id, provider, provider_user_id, access_token, refresh_token, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (provider, provider_user_id) DO UPDATE
		SET access_token = EXCLUDED.access_token,
		    refresh_token = EXCLUDED.refresh_token,
		    expires_at = EXCLUDED.expires_at;
	`
	_, err := s.pool.Exec(ctx, query, userID, provider, providerUserID, accessToken, refreshToken, expiresAt)
	return err
}

func (s *PostgresStore) ListFollows(ctx context.Context, userID uuid.UUID) ([]Follow, error) {
	query := `
		SELECT user_id, entity_type, entity_id, entity_name, created_at
		FROM follows
		WHERE user_id = $1
		ORDER BY created_at DESC;
	`
	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []Follow
	for rows.Next() {
		var f Follow
		if err := rows.Scan(&f.UserID, &f.EntityType, &f.EntityID, &f.EntityName, &f.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, f)
	}
	return result, nil
}

func (s *PostgresStore) AddFollow(ctx context.Context, userID uuid.UUID, entityType, entityID, entityName string) error {
	query := `
		INSERT INTO follows (user_id, entity_type, entity_id, entity_name)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;
	`
	_, err := s.pool.Exec(ctx, query, userID, entityType, entityID, entityName)
	return err
}

func (s *PostgresStore) DeleteFollow(ctx context.Context, userID uuid.UUID, entityID string) error {
	query := `
		DELETE FROM follows
		WHERE user_id = $1 AND entity_id = $2;
	`
	_, err := s.pool.Exec(ctx, query, userID, entityID)
	return err
}

func (s *PostgresStore) ListUsersFollowingEntity(ctx context.Context, homeTeamID, awayTeamID, leagueID string) ([]uuid.UUID, error) {
	query := `
		SELECT DISTINCT user_id FROM follows
		WHERE (entity_type = 'team' AND entity_id = $1)
		   OR (entity_type = 'team' AND entity_id = $2)
		   OR (entity_type = 'league' AND entity_id = $3);
	`
	rows, err := s.pool.Query(ctx, query, homeTeamID, awayTeamID, leagueID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var userIDs []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		userIDs = append(userIDs, id)
	}
	return userIDs, nil
}

func (s *PostgresStore) UpsertPushSubscription(ctx context.Context, userID uuid.UUID, endpoint, p256dhKey, authKey string) error {
	query := `
		INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (endpoint) DO UPDATE
		SET user_id = EXCLUDED.user_id,
		    p256dh_key = EXCLUDED.p256dh_key,
		    auth_key = EXCLUDED.auth_key;
	`
	_, err := s.pool.Exec(ctx, query, userID, endpoint, p256dhKey, authKey)
	return err
}

func (s *PostgresStore) DeletePushSubscription(ctx context.Context, endpoint string) error {
	query := `
		DELETE FROM push_subscriptions
		WHERE endpoint = $1;
	`
	_, err := s.pool.Exec(ctx, query, endpoint)
	return err
}

func (s *PostgresStore) ListPushSubscriptionsForUsers(ctx context.Context, userIDs []uuid.UUID) ([]PushSubscription, error) {
	if len(userIDs) == 0 {
		return nil, nil
	}

	query := `
		SELECT id, user_id, endpoint, p256dh_key, auth_key, created_at
		FROM push_subscriptions
		WHERE user_id = ANY($1);
	`
	rows, err := s.pool.Query(ctx, query, userIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var subs []PushSubscription
	for rows.Next() {
		var sub PushSubscription
		if err := rows.Scan(&sub.ID, &sub.UserID, &sub.Endpoint, &sub.P256dhKey, &sub.AuthKey, &sub.CreatedAt); err != nil {
			return nil, err
		}
		subs = append(subs, sub)
	}
	return subs, nil
}

func (s *PostgresStore) LogNotification(ctx context.Context, userID uuid.UUID, matchID, eventType, title, body string) error {
	query := `
		INSERT INTO notifications_log (user_id, match_id, event_type, title, body)
		VALUES ($1, $2, $3, $4, $5);
	`
	_, err := s.pool.Exec(ctx, query, userID, matchID, eventType, title, body)
	return err
}
