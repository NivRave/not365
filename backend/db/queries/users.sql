-- name: GetUserByID :one
SELECT * FROM users
WHERE id = $1 LIMIT 1;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = $1 LIMIT 1;

-- name: GetUserByCalendarToken :one
SELECT * FROM users
WHERE calendar_token = $1 LIMIT 1;

-- name: UpsertUser :one
INSERT INTO users (id, email, display_name, avatar_url, calendar_token, updated_at)
VALUES ($1, $2, $3, $4, $5, NOW())
ON CONFLICT (email) DO UPDATE
SET display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW()
RETURNING *;

-- name: UpsertOAuthAccount :one
INSERT INTO oauth_accounts (user_id, provider, provider_user_id, access_token, refresh_token, expires_at)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (provider, provider_user_id) DO UPDATE
SET access_token = EXCLUDED.access_token,
    refresh_token = EXCLUDED.refresh_token,
    expires_at = EXCLUDED.expires_at
RETURNING *;

-- name: CreateSession :one
INSERT INTO sessions (id, user_id, jwt_token_hash, expires_at)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: DeleteSession :exec
DELETE FROM sessions
WHERE id = $1;
