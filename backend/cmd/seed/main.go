package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/NivRave/not365/backend/internal/domain"
	"github.com/NivRave/not365/backend/internal/store"
)

func main() {
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27018/?replicaSet=rs0&directConnection=true"
	}
	mongoDB := os.Getenv("MONGO_DB")
	if mongoDB == "" {
		mongoDB = "not365"
	}
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6380"
	}

	ctx := context.Background()
	mongoStore, err := store.NewMongoStore(ctx, mongoURI, mongoDB)
	if err != nil {
		log.Fatalf("Failed to connect to Mongo: %v", err)
	}
	defer mongoStore.Close(ctx)

	redisStore, err := store.NewRedisStore(ctx, redisAddr)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer redisStore.Close()

	now := time.Now().UTC()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)

	fixtures := []domain.MatchEvent{
		// 1. Football: Premier League - Today Live
		{
			ID:         "football:seed:pl-1",
			Sport:      domain.SportFootball,
			LeagueID:   "eng.1",
			LeagueName: "Premier League",
			HomeTeam: domain.Team{
				ID:        "sim-ars",
				Name:      "Arsenal",
				ShortName: "ARS",
				LogoURL:   "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg",
			},
			AwayTeam: domain.Team{
				ID:        "sim-che",
				Name:      "Chelsea",
				ShortName: "CHE",
				LogoURL:   "https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg",
			},
			Status:    domain.StatusLive,
			StartTime: now.Add(-40 * time.Minute),
			Score: &domain.Score{
				Home: 1,
				Away: 0,
			},
			Clock: &domain.Clock{
				DisplayTime: "38'",
				Period:      1,
				IsRunning:   true,
			},
			Events: []domain.Event{
				{
					ID:         "pl-1-ev-1",
					Type:       "goal",
					Minute:     22,
					Player:     "B. Saka",
					TeamID:     "sim-ars",
					OccurredAt: now.Add(-18 * time.Minute),
				},
			},
			Stats: &domain.MatchStats{
				PossessionHome:    58,
				PossessionAway:    42,
				ShotsHome:         6,
				ShotsAway:         2,
				ShotsOnTargetHome: 3,
				ShotsOnTargetAway: 1,
				CornersHome:       4,
				CornersAway:       1,
				FoulsHome:         3,
				FoulsAway:         5,
				YellowCardsAway:   1,
			},
			Sequence:  2,
			UpdatedAt: now,
		},
		// 2. Football: Premier League - Tomorrow Scheduled
		{
			ID:         "football:seed:pl-2",
			Sport:      domain.SportFootball,
			LeagueID:   "eng.1",
			LeagueName: "Premier League",
			HomeTeam: domain.Team{
				ID:        "mancity",
				Name:      "Manchester City",
				ShortName: "MCI",
				LogoURL:   "https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg",
			},
			AwayTeam: domain.Team{
				ID:        "liverpool",
				Name:      "Liverpool",
				ShortName: "LIV",
				LogoURL:   "https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg",
			},
			Status:    domain.StatusScheduled,
			StartTime: startOfDay.Add(24*time.Hour + 16*time.Hour + 30*time.Minute),
			Score:     &domain.Score{Home: 0, Away: 0},
			Clock: &domain.Clock{
				DisplayTime: "16:30",
				Period:      0,
				IsRunning:   false,
			},
			Sequence:  1,
			UpdatedAt: now,
		},
		// 3. Football: Premier League - Upcoming in 3 days
		{
			ID:         "football:seed:pl-3",
			Sport:      domain.SportFootball,
			LeagueID:   "eng.1",
			LeagueName: "Premier League",
			HomeTeam: domain.Team{
				ID:        "tottenham",
				Name:      "Tottenham Hotspur",
				ShortName: "TOT",
				LogoURL:   "https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg",
			},
			AwayTeam: domain.Team{
				ID:        "newcastle",
				Name:      "Newcastle United",
				ShortName: "NEW",
				LogoURL:   "https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg",
			},
			Status:    domain.StatusScheduled,
			StartTime: startOfDay.Add(3*24*time.Hour + 19*time.Hour),
			Score:     &domain.Score{Home: 0, Away: 0},
			Clock:     &domain.Clock{DisplayTime: "19:00"},
			Sequence:  1,
			UpdatedAt: now,
		},
		// 4. Football: La Liga - Upcoming El Clasico
		{
			ID:         "football:seed:esp-1",
			Sport:      domain.SportFootball,
			LeagueID:   "esp.1",
			LeagueName: "La Liga",
			HomeTeam: domain.Team{
				ID:        "real-madrid",
				Name:      "Real Madrid",
				ShortName: "RMA",
				LogoURL:   "https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg",
			},
			AwayTeam: domain.Team{
				ID:        "barcelona",
				Name:      "FC Barcelona",
				ShortName: "BAR",
				LogoURL:   "https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg",
			},
			Status:    domain.StatusScheduled,
			StartTime: startOfDay.Add(2*24*time.Hour + 20*time.Hour),
			Score:     &domain.Score{Home: 0, Away: 0},
			Clock:     &domain.Clock{DisplayTime: "20:00"},
			Sequence:  1,
			UpdatedAt: now,
		},
		// 5. Football: La Liga - Finished Yesterday
		{
			ID:         "football:seed:esp-2",
			Sport:      domain.SportFootball,
			LeagueID:   "esp.1",
			LeagueName: "La Liga",
			HomeTeam: domain.Team{
				ID:        "atletico",
				Name:      "Atlético Madrid",
				ShortName: "ATM",
				LogoURL:   "https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg",
			},
			AwayTeam: domain.Team{
				ID:        "sevilla",
				Name:      "Sevilla FC",
				ShortName: "SEV",
				LogoURL:   "https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg",
			},
			Status:    domain.StatusFinished,
			StartTime: startOfDay.Add(-24*time.Hour + 18*time.Hour),
			Score:     &domain.Score{Home: 2, Away: 1},
			Clock:     &domain.Clock{DisplayTime: "FT"},
			Events: []domain.Event{
				{
					ID:         "esp-2-ev-1",
					Type:       "goal",
					Minute:     34,
					Player:     "A. Griezmann",
					TeamID:     "atletico",
					OccurredAt: startOfDay.Add(-24*time.Hour + 18*time.Hour + 34*time.Minute),
				},
				{
					ID:         "esp-2-ev-2",
					Type:       "goal",
					Minute:     65,
					Player:     "Y. En-Nesyri",
					TeamID:     "sevilla",
					OccurredAt: startOfDay.Add(-24*time.Hour + 18*time.Hour + 65*time.Minute),
				},
				{
					ID:         "esp-2-ev-3",
					Type:       "goal",
					Minute:     88,
					Player:     "A. Morata",
					TeamID:     "atletico",
					OccurredAt: startOfDay.Add(-24*time.Hour + 18*time.Hour + 88*time.Minute),
				},
			},
			Stats: &domain.MatchStats{
				PossessionHome: 52, PossessionAway: 48,
				ShotsHome: 14, ShotsAway: 9,
				ShotsOnTargetHome: 6, ShotsOnTargetAway: 4,
				CornersHome: 6, CornersAway: 3,
				FoulsHome: 11, FoulsAway: 14,
			},
			Sequence:  4,
			UpdatedAt: now,
		},
		// 6. Basketball: NBA - Live Today Q3
		{
			ID:         "basketball:seed:nba-1",
			Sport:      domain.SportBasketball,
			LeagueID:   "nba",
			LeagueName: "NBA",
			HomeTeam: domain.Team{
				ID:        "lakers",
				Name:      "Los Angeles Lakers",
				ShortName: "LAL",
				LogoURL:   "https://upload.wikimedia.org/wikipedia/commons/3/3c/Los_Angeles_Lakers_logo.svg",
			},
			AwayTeam: domain.Team{
				ID:        "celtics",
				Name:      "Boston Celtics",
				ShortName: "BOS",
				LogoURL:   "https://upload.wikimedia.org/wikipedia/en/8/8f/Boston_Celtics.svg",
			},
			Status:    domain.StatusLive,
			StartTime: now.Add(-75 * time.Minute),
			Score: &domain.Score{
				Home: 88,
				Away: 84,
				Meta: map[string]any{
					"home_quarters": map[string]int{"Q1": 28, "Q2": 31, "Q3": 29, "Q4": 0},
					"away_quarters": map[string]int{"Q1": 27, "Q2": 28, "Q3": 29, "Q4": 0},
				},
			},
			Clock: &domain.Clock{
				DisplayTime: "Q3 2:45",
				Period:      3,
				IsRunning:   true,
			},
			Events: []domain.Event{
				{
					ID:         "nba-1-ev-1",
					Type:       "basket",
					Player:     "L. James 3PT Pullup",
					TeamID:     "lakers",
					OccurredAt: now.Add(-10 * time.Minute),
				},
				{
					ID:         "nba-1-ev-2",
					Type:       "basket",
					Player:     "J. Tatum Dunk",
					TeamID:     "celtics",
					OccurredAt: now.Add(-5 * time.Minute),
				},
			},
			Stats: &domain.MatchStats{
				ShotsHome: 64, ShotsAway: 60,
				ShotsOnTargetHome: 32, ShotsOnTargetAway: 28,
				FoulsHome: 14, FoulsAway: 16,
			},
			Sequence:  8,
			UpdatedAt: now,
		},
		// 7. Basketball: NBA - Tomorrow Scheduled
		{
			ID:         "basketball:seed:nba-2",
			Sport:      domain.SportBasketball,
			LeagueID:   "nba",
			LeagueName: "NBA",
			HomeTeam: domain.Team{
				ID:        "warriors",
				Name:      "Golden State Warriors",
				ShortName: "GSW",
				LogoURL:   "https://upload.wikimedia.org/wikipedia/en/0/01/Golden_State_Warriors_logo.svg",
			},
			AwayTeam: domain.Team{
				ID:        "bucks",
				Name:      "Milwaukee Bucks",
				ShortName: "MIL",
				LogoURL:   "https://upload.wikimedia.org/wikipedia/en/4/4a/Milwaukee_Bucks_logo.svg",
			},
			Status:    domain.StatusScheduled,
			StartTime: startOfDay.Add(24*time.Hour + 20*time.Hour),
			Score:     &domain.Score{Home: 0, Away: 0},
			Clock:     &domain.Clock{DisplayTime: "20:00"},
			Sequence:  1,
			UpdatedAt: now,
		},
		// 8. MMA: UFC - Upcoming Fight Night
		{
			ID:         "mma:seed:ufc-1",
			Sport:      domain.SportMMA,
			LeagueID:   "ufc",
			LeagueName: "UFC",
			HomeTeam: domain.Team{
				ID:        "jon-jones",
				Name:      "Jon Jones",
				ShortName: "JON",
				LogoURL:   "https://a.espncdn.com/combiner/i?img=/i/headshots/mma/players/full/2335639.png&w=350&h=254",
			},
			AwayTeam: domain.Team{
				ID:        "stipe-miocic",
				Name:      "Stipe Miocic",
				ShortName: "STP",
				LogoURL:   "https://a.espncdn.com/combiner/i?img=/i/headshots/mma/players/full/2614933.png&w=350&h=254",
			},
			Status:    domain.StatusScheduled,
			StartTime: startOfDay.Add(4*24*time.Hour + 22*time.Hour),
			Score:     &domain.Score{Home: 0, Away: 0},
			Clock:     &domain.Clock{DisplayTime: "Main Card 22:00"},
			Sequence:  1,
			UpdatedAt: now,
		},
	}

	count := 0
	for _, m := range fixtures {
		if err := mongoStore.UpsertMatchTimeline(ctx, &m); err != nil {
			log.Printf("Failed to seed match %s: %v", m.ID, err)
			continue
		}
		if m.Status == domain.StatusLive {
			_ = redisStore.SetMatchState(ctx, &m)
		}
		count++
	}

	log.Printf("Successfully seeded %d fixtures into MongoDB & Redis across Football, Basketball, and MMA!", count)
}
