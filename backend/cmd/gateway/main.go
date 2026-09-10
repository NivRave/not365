package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/NivRave/not365/backend/internal/gateway"
	"github.com/NivRave/not365/backend/internal/store"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func main() {
	port := os.Getenv("GATEWAY_PORT")
	if port == "" {
		port = "8089"
	}
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6380"
	}
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017/?replicaSet=rs0&directConnection=true"
	}
	mongoDB := os.Getenv("MONGO_DB")
	if mongoDB == "" {
		mongoDB = "not365"
	}

	ctx := context.Background()

	redisStore, err := store.NewRedisStore(ctx, redisAddr)
	if err != nil {
		log.Fatalf("Gateway failed to connect to Redis: %v", err)
	}
	defer redisStore.Close()

	mongoStore, err := store.NewMongoStore(ctx, mongoURI, mongoDB)
	if err != nil {
		log.Fatalf("Gateway failed to connect to MongoDB: %v", err)
	}
	defer mongoStore.Close(ctx)

	hub := gateway.NewHub(redisStore, mongoStore)
	go hub.Run(ctx)

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Health Check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok","service":"sse-gateway"}`))
	})

	// SSE Streaming Route
	r.Get("/v1/sse/match/{id}", hub.HandleMatchSSE)

	addr := fmt.Sprintf(":%s", port)
	log.Printf("not365 SSE Gateway server listening on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("Gateway server error: %v", err)
	}
}
