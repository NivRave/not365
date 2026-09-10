package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/NivRave/not365/backend/internal/api"
	"github.com/NivRave/not365/backend/internal/auth"
	"github.com/NivRave/not365/backend/internal/ics"
	"github.com/NivRave/not365/backend/internal/push"
	"github.com/NivRave/not365/backend/internal/store"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func main() {
	port := os.Getenv("API_PORT")
	if port == "" {
		port = "8088"
	}
	pgDSN := os.Getenv("POSTGRES_DSN")
	if pgDSN == "" {
		pgDSN = "postgres://not365:not365@localhost:5435/not365?sslmode=disable"
	}
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
	jwtSecret := os.Getenv("JWT_SECRET")
	authMode := os.Getenv("AUTH_MODE")
	vapidPub := os.Getenv("VAPID_PUBLIC_KEY")
	vapidPriv := os.Getenv("VAPID_PRIVATE_KEY")
	vapidEmail := os.Getenv("VAPID_EMAIL")

	ctx := context.Background()

	// Initialize Stores
	pgStore, err := store.NewPostgresStore(ctx, pgDSN)
	if err != nil {
		log.Fatalf("Core API failed to connect to PostgreSQL: %v", err)
	}
	defer pgStore.Close()

	mongoStore, err := store.NewMongoStore(ctx, mongoURI, mongoDB)
	if err != nil {
		log.Fatalf("Core API failed to connect to MongoDB: %v", err)
	}
	defer mongoStore.Close(ctx)

	redisStore, err := store.NewRedisStore(ctx, redisAddr)
	if err != nil {
		log.Fatalf("Core API failed to connect to Redis: %v", err)
	}
	defer redisStore.Close()

	// Start Web Push Worker in background
	pushWorker := push.NewPushWorker(pgStore, redisStore, vapidPub, vapidPriv, vapidEmail)
	go pushWorker.Run(ctx)

	jwtManager := auth.NewJWTManager(jwtSecret)
	authHandler := auth.NewAuthHandler(pgStore, jwtManager, authMode)
	prefHandler := auth.NewPreferencesHandler(pgStore)
	calendarHandler := ics.NewCalendarHandler(pgStore, mongoStore)
	matchHandler := api.NewMatchHandler(mongoStore, redisStore)

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Health
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok","service":"core-api"}`))
	})

	// Auth routes
	r.Route("/auth", func(r chi.Router) {
		r.Post("/dev-login", authHandler.HandleDevLogin)
		r.Post("/oauth/google", authHandler.HandleOAuthGoogle)
		r.Post("/oauth/apple", authHandler.HandleOAuthApple)
		r.Post("/refresh", authHandler.HandleRefresh)
		r.Delete("/session", authHandler.HandleLogout)
	})

	// Public API routes
	r.Route("/v1", func(r chi.Router) {
		r.Get("/sports", matchHandler.ListSports)
		r.Get("/sports/{sport}/leagues", matchHandler.ListLeagues)
		r.Get("/matches", matchHandler.ListMatches)
		r.Get("/matches/{id}", matchHandler.GetMatch)
		r.Get("/matches/{id}/sync", matchHandler.SyncMatch)
		r.Get("/calendar/{token}", calendarHandler.HandleCalendarExport)

		// Protected preferences routes
		r.Group(func(r chi.Router) {
			r.Use(jwtManager.Middleware)
			r.Get("/me", prefHandler.GetProfile)
			r.Get("/me/follows", prefHandler.ListFollows)
			r.Post("/me/follows", prefHandler.AddFollow)
			r.Delete("/me/follows/{id}", prefHandler.DeleteFollow)
			r.Post("/me/push", prefHandler.RegisterPush)
			r.Delete("/me/push", prefHandler.RemovePush)
		})
	})

	addr := fmt.Sprintf(":%s", port)
	log.Printf("not365 Core API server listening on %s (Auth mode: %s)", addr, authMode)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("Core API server error: %v", err)
	}
}
