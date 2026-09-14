package ingestion_test

import (
	"context"
	"testing"
	"time"

	"github.com/NivRave/not365/backend/internal/adapter"
	"github.com/NivRave/not365/backend/internal/domain"
	"github.com/NivRave/not365/backend/internal/ingestion"
	"github.com/NivRave/not365/backend/internal/store"
)

func TestLiveIngestionCycle(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	mongoStore, err := store.NewMongoStore(ctx, "mongodb://localhost:27018/?replicaSet=rs0&directConnection=true", "not365_test")
	if err != nil {
		t.Skipf("Mongo not reachable for integration test: %v", err)
	}
	defer mongoStore.Close(ctx)

	redisStore, err := store.NewRedisStore(ctx, "localhost:6380")
	if err != nil {
		t.Skipf("Redis not reachable for integration test: %v", err)
	}
	defer redisStore.Close()

	mcpClient, err := ingestion.NewMCPClient(ctx, "", false)
	if err != nil {
		t.Fatalf("Failed to create MCP client: %v", err)
	}

	poller := ingestion.NewPoller(mcpClient, mongoStore, redisStore)

	// Ingest ESPN Premier League matches
	matches, err := poller.PollOnce(ctx, ingestion.TargetLeague{
		Sport:    domain.SportFootball,
		Provider: "espn",
		LeagueID: "eng.1",
		ToolName: "espn_scores",
		Args:     map[string]any{"sport": "soccer", "league": "eng.1"},
		Adapter:  adapter.NewESPNSoccerAdapter(),
	})

	if err != nil {
		t.Fatalf("Live ingestion failed: %v", err)
	}

	t.Logf("Successfully ingested %d live/upcoming matches from ESPN!", len(matches))
	if len(matches) > 0 {
		first := matches[0]
		t.Logf("Sample match: %s vs %s (Status: %s, Time: %s)",
			first.HomeTeam.Name, first.AwayTeam.Name, first.Status, first.StartTime)

		// Verify stored in Redis
		state, err := redisStore.GetMatchState(ctx, first.ID)
		if err != nil || state == nil {
			t.Errorf("Match was not found in Redis: %v", err)
		} else {
			t.Logf("Verified Redis live state cached for %s", first.ID)
		}

		// Verify stored in MongoDB
		timeline, err := mongoStore.GetMatchTimeline(ctx, first.ID)
		if err != nil || timeline == nil {
			t.Errorf("Match was not found in MongoDB: %v", err)
		} else {
			t.Logf("Verified MongoDB timeline stored for %s", first.ID)
		}
	}
}
