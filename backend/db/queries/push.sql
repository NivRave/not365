-- name: UpsertPushSubscription :one
INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key)
VALUES ($1, $2, $3, $4)
ON CONFLICT (endpoint) DO UPDATE
SET user_id = EXCLUDED.user_id,
    p256dh_key = EXCLUDED.p256dh_key,
    auth_key = EXCLUDED.auth_key
RETURNING *;

-- name: DeletePushSubscriptionByEndpoint :exec
DELETE FROM push_subscriptions
WHERE endpoint = $1;

-- name: ListPushSubscriptionsForUsers :many
SELECT * FROM push_subscriptions
WHERE user_id = ANY($1::uuid[]);

-- name: LogNotification :one
INSERT INTO notifications_log (user_id, match_id, event_type, title, body)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;
