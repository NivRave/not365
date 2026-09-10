-- name: ListFollowsByUserID :many
SELECT * FROM follows
WHERE user_id = $1
ORDER BY created_at DESC;

-- name: AddFollow :one
INSERT INTO follows (user_id, entity_type, entity_id, entity_name)
VALUES ($1, $2, $3, $4)
ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING
RETURNING *;

-- name: DeleteFollow :exec
DELETE FROM follows
WHERE user_id = $1 AND entity_id = $2;

-- name: ListUsersFollowingEntity :many
SELECT user_id FROM follows
WHERE (entity_type = 'team' AND entity_id = $1)
   OR (entity_type = 'team' AND entity_id = $2)
   OR (entity_type = 'league' AND entity_id = $3);
