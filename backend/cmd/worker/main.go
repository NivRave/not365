package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/NivRave/not365/backend/internal/ingestion"
	"github.com/NivRave/not365/backend/internal/store"
)

func main() {
	log.Println("Starting not365 Ingestion Worker...")

	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017/?replicaSet=rs0&directConnection=true"
	}
	mongoDB := os.Getenv("MONGO_DB")
	if mongoDB == "" {
		mongoDB = "not365"
	}
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6380"
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Connect to MongoDB
	mongoStore, err := store.NewMongoStore(ctx, mongoURI, mongoDB)
	if err != nil {
		log.Fatalf("Worker failed to connect to MongoDB: %v", err)
	}
	defer mongoStore.Close(context.Background())
	log.Println("Connected to MongoDB successfully")

	// Connect to Redis
	redisStore, err := store.NewRedisStore(ctx, redisAddr)
	if err != nil {
		log.Fatalf("Worker failed to connect to Redis: %v", err)
	}
	defer redisStore.Close()
	log.Println("Connected to Redis successfully")

	// Initialize MCP Client (checks for sportsdata-mcp.yaml in current or parent dir)
	configPath := "sportsdata-mcp.yaml"
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		configPath = "../sportsdata-mcp.yaml"
	}
	mcpClient, err := ingestion.NewMCPClient(ctx, configPath, true)
	if err != nil {
		log.Printf("MCP Client initialized with HTTP fallback: %v", err)
	}

	// Create and run poller
	poller := ingestion.NewPoller(mcpClient, mongoStore, redisStore)
	go poller.Run(ctx)

	log.Println("Ingestion Worker is active and polling.")

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	sig := <-sigChan
	log.Printf("Shutting down Ingestion Worker (signal: %v)...", sig)
	cancel()
	time.Sleep(1 * time.Second)
	log.Println("Ingestion Worker stopped.")
}
