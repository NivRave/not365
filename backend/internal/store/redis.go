package store

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/NivRave/not365/backend/internal/domain"
	"github.com/redis/go-redis/v9"
)

const (
	MatchTTL    = 4 * time.Hour
	ScheduleTTL = 10 * time.Minute
)

type RedisStore struct {
	client *redis.Client
}

func NewRedisStore(ctx context.Context, addr string) (*RedisStore, error) {
	client := redis.NewClient(&redis.Options{
		Addr: addr,
	})

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to ping redis at %s: %w", addr, err)
	}

	return &RedisStore{client: client}, nil
}

func (r *RedisStore) Client() *redis.Client {
	return r.client
}

func (r *RedisStore) Close() error {
	return r.client.Close()
}

func (r *RedisStore) GetMatchHash(ctx context.Context, matchID string) (string, error) {
	key := fmt.Sprintf("match:hash:%s", matchID)
	val, err := r.client.Get(ctx, key).Result()
	if err == redis.Nil {
		return "", nil
	}
	return val, err
}

func (r *RedisStore) SetMatchHash(ctx context.Context, matchID, hash string) error {
	key := fmt.Sprintf("match:hash:%s", matchID)
	return r.client.Set(ctx, key, hash, MatchTTL).Err()
}

func (r *RedisStore) IncrMatchSequence(ctx context.Context, matchID string) (int64, error) {
	key := fmt.Sprintf("match:seq:%s", matchID)
	seq, err := r.client.Incr(ctx, key).Result()
	if err != nil {
		return 0, err
	}
	_ = r.client.Expire(ctx, key, MatchTTL).Err()
	return seq, nil
}

func (r *RedisStore) GetMatchSequence(ctx context.Context, matchID string) (int64, error) {
	key := fmt.Sprintf("match:seq:%s", matchID)
	seq, err := r.client.Get(ctx, key).Int64()
	if err == redis.Nil {
		return 0, nil
	}
	return seq, err
}

func (r *RedisStore) SetMatchState(ctx context.Context, match *domain.MatchEvent) error {
	key := fmt.Sprintf("match:state:%s", match.ID)
	data, err := json.Marshal(match)
	if err != nil {
		return fmt.Errorf("failed to marshal match state: %w", err)
	}
	return r.client.Set(ctx, key, data, MatchTTL).Err()
}

func (r *RedisStore) GetMatchState(ctx context.Context, matchID string) (*domain.MatchEvent, error) {
	key := fmt.Sprintf("match:state:%s", matchID)
	val, err := r.client.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var match domain.MatchEvent
	if err := json.Unmarshal(val, &match); err != nil {
		return nil, fmt.Errorf("failed to unmarshal match state: %w", err)
	}
	return &match, nil
}

func (r *RedisStore) PublishMatchUpdate(ctx context.Context, payload *domain.HybridPayload) error {
	channel := fmt.Sprintf("pubsub:match:%s", payload.MatchID)
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal hybrid payload: %w", err)
	}
	return r.client.Publish(ctx, channel, data).Err()
}

func (r *RedisStore) SubscribeMatch(ctx context.Context, matchID string) *redis.PubSub {
	channel := fmt.Sprintf("pubsub:match:%s", matchID)
	return r.client.Subscribe(ctx, channel)
}

func (r *RedisStore) SubscribeAllMatches(ctx context.Context) *redis.PubSub {
	return r.client.PSubscribe(ctx, "pubsub:match:*")
}
