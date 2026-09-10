package gateway

import (
	"context"
	"encoding/json"
	"log"
	"strings"
	"sync"

	"github.com/NivRave/not365/backend/internal/domain"
	"github.com/NivRave/not365/backend/internal/store"
)

type Hub struct {
	rooms   map[string]map[chan []byte]struct{}
	mu      sync.RWMutex
	redis   *store.RedisStore
	mongo   *store.MongoStore
}

func NewHub(redis *store.RedisStore, mongo *store.MongoStore) *Hub {
	return &Hub{
		rooms: make(map[string]map[chan []byte]struct{}),
		redis: redis,
		mongo: mongo,
	}
}

func (h *Hub) Run(ctx context.Context) {
	pubsub := h.redis.SubscribeAllMatches(ctx)
	defer pubsub.Close()

	ch := pubsub.Channel()
	log.Println("SSE Gateway Hub listening to Redis Pub/Sub channels (pubsub:match:*)...")

	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			// channel is "pubsub:match:{id}"
			parts := strings.Split(msg.Channel, "pubsub:match:")
			if len(parts) < 2 {
				continue
			}
			matchID := parts[1]

			var payload domain.HybridPayload
			if err := json.Unmarshal([]byte(msg.Payload), &payload); err != nil {
				continue
			}

			h.BroadcastToMatch(matchID, []byte(msg.Payload))
		}
	}
}

func (h *Hub) Register(matchID string, ch chan []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, exists := h.rooms[matchID]; !exists {
		h.rooms[matchID] = make(map[chan []byte]struct{})
	}
	h.rooms[matchID][ch] = struct{}{}
}

func (h *Hub) Deregister(matchID string, ch chan []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if clients, exists := h.rooms[matchID]; exists {
		delete(clients, ch)
		if len(clients) == 0 {
			delete(h.rooms, matchID)
		}
	}
}

func (h *Hub) BroadcastToMatch(matchID string, data []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	clients, exists := h.rooms[matchID]
	if !exists {
		return
	}

	for ch := range clients {
		select {
		case ch <- data:
		default:
			// Client buffer full, skip or let client reconnect
		}
	}
}
