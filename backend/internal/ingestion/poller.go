package ingestion

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/NivRave/not365/backend/internal/adapter"
	"github.com/NivRave/not365/backend/internal/domain"
	"github.com/NivRave/not365/backend/internal/store"
)

type PollState string

const (
	StateIdle      PollState = "IDLE"
	StatePreMatch  PollState = "PRE_MATCH"
	StateLive      PollState = "LIVE"
	StatePostMatch PollState = "POST_MATCH"
)

type TargetLeague struct {
	Sport    domain.Sport
	Provider string
	LeagueID string
	ToolName string
	Args     map[string]any
	Adapter  adapter.Adapter
}

type Poller struct {
	mcpClient *MCPClient
	mongo     *store.MongoStore
	redis     *store.RedisStore
	targets   []TargetLeague
	mu        sync.RWMutex
	states    map[string]PollState
}

func NewPoller(mcpClient *MCPClient, mongo *store.MongoStore, redis *store.RedisStore) *Poller {
	p := &Poller{
		mcpClient: mcpClient,
		mongo:     mongo,
		redis:     redis,
		states:    make(map[string]PollState),
	}

	// Register default ingestion targets
	espnSoccer := adapter.NewESPNSoccerAdapter()
	nbaAdapter := adapter.NewNBAAdapter()
	openLigaAdapter := adapter.NewOpenLigaDBAdapter()

	p.targets = []TargetLeague{
		{
			Sport:    domain.SportFootball,
			Provider: "espn",
			LeagueID: "eng.1",
			ToolName: "espn_scores",
			Args:     map[string]any{"sport": "soccer", "league": "eng.1"},
			Adapter:  espnSoccer,
		},
		{
			Sport:    domain.SportFootball,
			Provider: "espn",
			LeagueID: "esp.1",
			ToolName: "espn_scores",
			Args:     map[string]any{"sport": "soccer", "league": "esp.1"},
			Adapter:  espnSoccer,
		},
		{
			Sport:    domain.SportBasketball,
			Provider: "nba",
			LeagueID: "nba",
			ToolName: "nba_scoreboard",
			Args:     map[string]any{},
			Adapter:  nbaAdapter,
		},
		{
			Sport:    domain.SportFootball,
			Provider: "openligadb",
			LeagueID: "bl1",
			ToolName: "openligadb_matches",
			Args:     map[string]any{},
			Adapter:  openLigaAdapter,
		},
	}

	return p
}

func (p *Poller) Run(ctx context.Context) {
	log.Printf("Starting adaptive ingestion poller with %d targets", len(p.targets))

	var wg sync.WaitGroup
	for _, target := range p.targets {
		wg.Add(1)
		go func(t TargetLeague) {
			defer wg.Done()
			p.pollTargetLoop(ctx, t)
		}(target)
	}

	wg.Wait()
}

func (p *Poller) pollTargetLoop(ctx context.Context, target TargetLeague) {
	key := target.Provider + ":" + target.LeagueID
	for {
		interval := p.calculateInterval(key)

		select {
		case <-ctx.Done():
			return
		case <-time.After(interval):
			p.pollOnce(ctx, target)
		}
	}
}

func (p *Poller) PollOnce(ctx context.Context, target TargetLeague) ([]domain.MatchEvent, error) {
	return p.pollOnce(ctx, target)
}

func (p *Poller) pollOnce(ctx context.Context, target TargetLeague) ([]domain.MatchEvent, error) {
	raw, err := p.mcpClient.CallTool(ctx, target.ToolName, target.Args)
	if err != nil {
		log.Printf("[Poller] Tool call error for %s (%s): %v", target.Provider, target.LeagueID, err)
		return nil, err
	}

	matches, err := target.Adapter.ParseScoreboard(raw)
	if err != nil {
		log.Printf("[Poller] Adapter parse error for %s: %v", target.Provider, err)
		return nil, err
	}

	key := target.Provider + ":" + target.LeagueID
	hasLive := false
	hasPre := false
	now := time.Now().UTC()

	for _, m := range matches {
		if m.Status == domain.StatusLive || m.Status == domain.StatusHalftime {
			hasLive = true
		} else if m.Status == domain.StatusScheduled && m.StartTime.Sub(now) < 3*time.Hour && m.StartTime.After(now) {
			hasPre = true
		}

		if err := p.processMatch(ctx, &m); err != nil {
			log.Printf("[Poller] Error processing match %s: %v", m.ID, err)
		}
	}

	p.mu.Lock()
	if hasLive {
		p.states[key] = StateLive
	} else if hasPre {
		p.states[key] = StatePreMatch
	} else {
		p.states[key] = StateIdle
	}
	p.mu.Unlock()

	return matches, nil
}

func (p *Poller) processMatch(ctx context.Context, match *domain.MatchEvent) error {
	// Compute SHA-256 of match state
	hashBytes := sha256.Sum256([]byte(p.serializeMatchForHash(match)))
	currentHash := hex.EncodeToString(hashBytes[:])

	lastHash, err := p.redis.GetMatchHash(ctx, match.ID)
	if err != nil {
		return err
	}

	if lastHash == currentHash {
		// Unchanged, skip
		return nil
	}

	// State changed!
	seq, err := p.redis.IncrMatchSequence(ctx, match.ID)
	if err != nil {
		return err
	}
	match.Sequence = seq
	match.UpdatedAt = time.Now().UTC()

	// Update Redis cache
	if err := p.redis.SetMatchState(ctx, match); err != nil {
		log.Printf("Failed to set redis match state: %v", err)
	}
	if err := p.redis.SetMatchHash(ctx, match.ID, currentHash); err != nil {
		log.Printf("Failed to set redis match hash: %v", err)
	}

	// Persist to MongoDB
	if err := p.mongo.UpsertMatchTimeline(ctx, match); err != nil {
		log.Printf("Failed to upsert match timeline to mongo: %v", err)
	}

	// Publish hybrid payload to Redis Pub/Sub
	payload := &domain.HybridPayload{
		MatchID:  match.ID,
		Sequence: seq,
		Snapshot: match,
		Delta:    match.Events,
	}

	if err := p.redis.PublishMatchUpdate(ctx, payload); err != nil {
		log.Printf("Failed to publish match update: %v", err)
	}

	return nil
}

func (p *Poller) serializeMatchForHash(m *domain.MatchEvent) string {
	data, _ := json.Marshal(struct {
		Status domain.MatchStatus `json:"status"`
		Score  *domain.Score      `json:"score"`
		Clock  *domain.Clock      `json:"clock"`
		Events []domain.Event     `json:"events"`
	}{
		Status: m.Status,
		Score:  m.Score,
		Clock:  m.Clock,
		Events: m.Events,
	})
	return string(data)
}

func (p *Poller) calculateInterval(key string) time.Duration {
	p.mu.RLock()
	state, exists := p.states[key]
	p.mu.RUnlock()

	if !exists {
		return 15 * time.Second
	}

	switch state {
	case StateLive:
		return 15 * time.Second
	case StatePreMatch:
		return 5 * time.Minute
	case StatePostMatch:
		return 2 * time.Minute
	case StateIdle:
		return 30 * time.Minute
	default:
		return 15 * time.Second
	}
}
