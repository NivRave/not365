package push

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/NivRave/not365/backend/internal/domain"
	"github.com/NivRave/not365/backend/internal/store"
	"github.com/SherClockHolmes/webpush-go"
)

type PushWorker struct {
	pgStore    *store.PostgresStore
	redisStore *store.RedisStore
	vapidPub   string
	vapidPriv  string
	vapidEmail string
}

func NewPushWorker(pgStore *store.PostgresStore, redisStore *store.RedisStore, vapidPub, vapidPriv, vapidEmail string) *PushWorker {
	return &PushWorker{
		pgStore:    pgStore,
		redisStore: redisStore,
		vapidPub:   vapidPub,
		vapidPriv:  vapidPriv,
		vapidEmail: vapidEmail,
	}
}

type PushNotificationMessage struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	Icon  string `json:"icon"`
	Data  map[string]any `json:"data"`
}

func (w *PushWorker) Run(ctx context.Context) {
	if w.vapidPub == "" || w.vapidPriv == "" {
		log.Println("[PushWorker] VAPID keys not configured; running in dry-run push log mode")
	} else {
		log.Println("[PushWorker] VAPID push worker started and listening to Redis Pub/Sub")
	}

	pubsub := w.redisStore.SubscribeAllMatches(ctx)
	defer pubsub.Close()

	ch := pubsub.Channel()

	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}

			var payload domain.HybridPayload
			if err := json.Unmarshal([]byte(msg.Payload), &payload); err != nil {
				continue
			}

			if payload.Snapshot == nil || len(payload.Delta) == 0 {
				continue
			}

			w.dispatchAlerts(ctx, payload.Snapshot, payload.Delta)
		}
	}
}

func (w *PushWorker) dispatchAlerts(ctx context.Context, match *domain.MatchEvent, delta []domain.Event) {
	userIDs, err := w.pgStore.ListUsersFollowingEntity(ctx, match.HomeTeam.ID, match.AwayTeam.ID, match.LeagueID)
	if err != nil || len(userIDs) == 0 {
		return
	}

	subs, err := w.pgStore.ListPushSubscriptionsForUsers(ctx, userIDs)
	if err != nil || len(subs) == 0 {
		return
	}

	for _, ev := range delta {
		title := fmt.Sprintf("⚽ %s %d–%d %s", match.HomeTeam.ShortName, match.Score.Home, match.Score.Away, match.AwayTeam.ShortName)
		body := fmt.Sprintf("%s (%d') - %s", strings.ToUpper(ev.Type), ev.Minute, ev.Player)

		pushMsg := PushNotificationMessage{
			Title: title,
			Body:  body,
			Icon:  "/pwa-192x192.png",
			Data: map[string]any{
				"match_id": match.ID,
				"url":      fmt.Sprintf("/match/%s", match.ID),
			},
		}

		msgBytes, _ := json.Marshal(pushMsg)

		for _, sub := range subs {
			if w.vapidPub == "" || w.vapidPriv == "" {
				log.Printf("[Dry-run Push] To User %s: %s | %s", sub.UserID, title, body)
				_ = w.pgStore.LogNotification(ctx, sub.UserID, match.ID, ev.Type, title, body)
				continue
			}

			s := &webpush.Subscription{
				Endpoint: sub.Endpoint,
				Keys: webpush.Keys{
					P256dh: sub.P256dhKey,
					Auth:   sub.AuthKey,
				},
			}

			resp, err := webpush.SendNotification(msgBytes, s, &webpush.Options{
				Subscriber:      w.vapidEmail,
				VAPIDPublicKey:  w.vapidPub,
				VAPIDPrivateKey: w.vapidPriv,
				TTL:             60,
			})

			if err != nil {
				log.Printf("[PushWorker] Send error: %v", err)
				continue
			}
			defer resp.Body.Close()

			if resp.StatusCode == http.StatusGone || resp.StatusCode == http.StatusNotFound {
				// Subscription has expired or was revoked
				_ = w.pgStore.DeletePushSubscription(ctx, sub.Endpoint)
			} else if resp.StatusCode == http.StatusCreated {
				_ = w.pgStore.LogNotification(ctx, sub.UserID, match.ID, ev.Type, title, body)
			}
		}
	}
}
