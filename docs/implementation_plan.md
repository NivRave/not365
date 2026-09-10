# not365 — Implementation Plan
**Real-Time Multi-Sport PWA**

A progressive web app delivering live scores, match schedules, personalised alerts, and standings — comparable to 365Scores. Built on Go, React/TypeScript, and a free open-source sports data pipeline.

---

## Decisions Locked In

| # | Topic | Decision |
|---|---|---|
| 1 | Data Provider | `sportsdata-mcp` (open-source, Python, `uvx`) — free, no API key for ESPN/NBA/soccer/MMA groups |
| 2 | Repo Structure | Single monorepo — `backend/` + `frontend/` |
| 3 | Authentication | OAuth 2.0 (Google + Apple) via `golang.org/x/oauth2` + JWT; credentials added when ready |
| 4 | Web Push | Native VAPID — `SherClockHolmes/webpush-go` |
| 5 | Polling Strategy | Adaptive — 10–30s during live matches, 10 min pre-match, 1 hr otherwise |
| 6 | Ingestion Architecture | Adapter Pattern in Go worker — raw provider JSON → typed adapters → unified `MatchEvent` domain struct |

---

## Architecture Overview

```mermaid
flowchart TD
    subgraph MCP["sportsdata-mcp (Python, local)"]
        ESPN[ESPN Groups\nscores · core · site]
        NBA[NBA Groups\ncdn · stats]
        ODB[OpenLigaDB\nBundesliga]
        NC[NCAA College\nPolls · Standings]
    end

    subgraph Worker["Go: Ingestion Worker"]
        Poller[Adaptive Poller\nState Machine]
        Adapter[Adapter Layer\nProvider → Domain]
        Differ[Differ\nHash-based State Diff]
    end

    subgraph Core["Go: Core API"]
        Auth[Auth Handler\nOAuth 2.0 + JWT]
        Sync[Sync Handler\nMissed Events]
        ICS[ICS Generator\nCalendar Export]
        Push[VAPID Push\nwebpush-go]
    end

    subgraph Gateway["Go: SSE Gateway"]
        Hub[Connection Hub\nper-match channels]
        SSE[SSE Handler\nHTTP/2 Streams]
    end

    subgraph Stores["Data Persistence"]
        PG[(PostgreSQL\nUsers · Follows · Auth · Push Subs)]
        Mongo[(MongoDB\nMatch Timelines · Event History)]
        RedisCache[(Redis Cache\nLive Match State)]
        RedisPubSub((Redis Pub/Sub\nChannel: match:id))
    end

    subgraph Client["PWA Client"]
        React[React + Vite + Zustand\nTailwind CSS]
        SW[Service Worker\nvite-plugin-pwa]
    end

    %% Ingestion Pipeline
    MCP == 1. MCP Tool Calls ==> Poller
    Poller --> Adapter
    Adapter --> Differ
    Differ <--> RedisCache
    Differ --> Mongo
    Differ --> RedisPubSub

    %% Real-Time Delivery
    RedisPubSub -- Fan-Out --> Hub
    Hub --> SSE
    SSE == SSE Stream ==> React

    %% Core API
    React -. REST .- Auth
    React -. REST .- Sync
    React -. REST .- ICS
    Auth <--> PG
    Sync --> Mongo
    Push --> PG

    %% PWA
    SW -- Web Push --> React
```

---

## Phase 1: Project Scaffolding & Local Infrastructure

**Goal:** A running monorepo with all services starting via a single `docker compose up`.

---

### Step 1.1 — Install & Configure `sportsdata-mcp`

> [!IMPORTANT]
> This must be done first — the MCP server is our sole data source. All subsequent development depends on being able to inspect live API responses.

**Actions:**
1. Install `uv` (Python package manager) if not present: `pip install uv`
2. Install sportsdata-mcp: `uvx sportsdata-mcp serve` (first run auto-installs)
3. Verify connectivity: `sportsdata-mcp coverage` — confirms which providers answer from your network
4. Create `sportsdata-mcp.yaml` in the repo root with our target groups

**Target `sportsdata-mcp.yaml`:**
```yaml
enabled_groups:
  # Soccer / Football — ESPN covers all major leagues via sport+league slug params
  - espn.scores      # scoreboard, teams, standings, game summary, news
  - espn.core        # canonical model: events, odds, win-probability, plays
  - espn.site        # rosters, schedules, injuries, depth charts

  # Basketball
  - nba.public.cdn   # today's scoreboard, live box score, play-by-play
  - nba.stats        # full stats.nba.com /stats/ API dispatcher (138 endpoints)

  # Bundesliga (not in ESPN)
  - openligadb.football

  # MMA / UFC — covered by ESPN groups via sport=mma/league=ufc slug

providers:
  espn:
    rate_limit_rps: 5
    cache_ttl_seconds: 10          # 10s cache absorbs duplicate calls during live reasoning
    max_response_bytes: 524288     # 512 KB cap — prevents context flooding

  nba:
    rate_limit_rps: 3
    cache_ttl_seconds: 10
    max_response_bytes: 524288

  openligadb:
    rate_limit_rps: 2
    cache_ttl_seconds: 30
```

---

### Step 1.2 — Monorepo Structure

#### [NEW] Monorepo root layout

```
not365/
├── backend/                  # Go 1.22+ application
│   ├── cmd/
│   │   ├── api/              # Core API entrypoint
│   │   ├── worker/           # Ingestion Worker entrypoint
│   │   └── gateway/          # SSE Gateway entrypoint
│   ├── internal/
│   │   ├── adapter/          # Provider adapters (ESPN, NBA, OpenLigaDB)
│   │   ├── domain/           # Unified domain structs (MatchEvent, Team, etc.)
│   │   ├── ingestion/        # Poller + Differ state machine
│   │   ├── store/            # PostgreSQL + MongoDB + Redis repositories
│   │   ├── auth/             # OAuth 2.0 + JWT handlers
│   │   ├── push/             # VAPID web push
│   │   ├── ics/              # .ics calendar generator
│   │   └── gateway/          # SSE hub + handlers
│   ├── db/
│   │   ├── migrations/       # sqlc-compatible SQL migrations
│   │   └── queries/          # sqlc query files
│   ├── sqlc.yaml
│   ├── go.mod
│   └── go.sum
├── frontend/                 # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── stores/           # Zustand stores
│   │   ├── hooks/            # useSSE, useMatch, etc.
│   │   └── lib/              # API client, types
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
├── docker-compose.yml
├── sportsdata-mcp.yaml
├── .env.example
├── .env                      # git-ignored
├── .gitignore
├── Makefile                  # dev shortcuts
└── docs/
    └── initial_plan.md
```

---

### Step 1.3 — Docker Compose

#### [NEW] `docker-compose.yml`

Services defined:
- **PostgreSQL 16** — port `5432`, persistent volume, healthcheck
- **MongoDB 7** — port `27017`, persistent volume, replica set enabled for transactions
- **Redis 7** — port `6379`, `--appendonly yes` for durability

Includes environment variable injection from `.env`.

---

### Step 1.4 — Go Module Init

```bash
cd backend
go mod init github.com/you/not365
```

**Core dependencies:**
| Package | Purpose |
|---|---|
| `go-chi/chi/v5` | HTTP routing |
| `jackc/pgx/v5` | PostgreSQL driver |
| `sqlc-dev/sqlc` | Type-safe SQL codegen |
| `go.mongodb.org/mongo-driver/v2` | MongoDB driver |
| `redis/go-redis/v9` | Redis client |
| `golang.org/x/oauth2` | OAuth 2.0 |
| `golang-jwt/jwt/v5` | JWT tokens |
| `SherClockHolmes/webpush-go` | VAPID Web Push |
| `google/uuid` | UUID generation |

---

### Step 1.5 — Frontend Scaffold

```bash
cd frontend
pnpm create vite@latest . --template react-ts
pnpm add zustand tailwindcss vite-plugin-pwa @vitejs/plugin-react
pnpm add -D @types/react @types/react-dom
```

Configure:
- `tailwind.config.ts` — mobile-first breakpoints
- `vite.config.ts` — PWA plugin with `registerType: 'autoUpdate'`, VAPID `applicationServerKey`
- `tsconfig.json` — strict mode on

---

### Step 1.6 — Makefile & `.env.example`

**`Makefile` targets:**
- `make dev` — starts Docker Compose + all Go services + Vite dev server
- `make sqlc` — runs `sqlc generate`
- `make migrate` — runs SQL migrations
- `make mcp` — starts `sportsdata-mcp serve`
- `make test` — runs Go + frontend tests

**`.env.example` variables:**
```
# PostgreSQL
POSTGRES_DSN=postgres://not365:not365@localhost:5432/not365

# MongoDB
MONGO_URI=mongodb://localhost:27017
MONGO_DB=not365

# Redis
REDIS_ADDR=localhost:6379

# Auth (fill when ready)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=
JWT_SECRET=

# VAPID (generate with: go run ./cmd/vapid-keygen)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=mailto:admin@not365.app
```

---

## Phase 2: Database Schemas & Domain Models

**Goal:** All data stores modelled, migrated, and codegen'd. Go domain structs defined.

---

### Step 2.1 — Unified Domain Structs

#### [NEW] `backend/internal/domain/match.go`

Core domain types shared across all layers:

```go
// MatchStatus represents the lifecycle state of a match
type MatchStatus string

const (
    StatusScheduled  MatchStatus = "scheduled"
    StatusLive       MatchStatus = "live"
    StatusHalftime   MatchStatus = "halftime"
    StatusFinished   MatchStatus = "finished"
    StatusPostponed  MatchStatus = "postponed"
    StatusCancelled  MatchStatus = "cancelled"
)

// Sport is the sport type enum
type Sport string

const (
    SportFootball   Sport = "football"
    SportBasketball Sport = "basketball"
    SportMMA        Sport = "mma"
)

// MatchEvent is the canonical, unified representation of a match
// and its live state. This is what every adapter must produce.
type MatchEvent struct {
    ID           string      `json:"id"`            // Canonical: {sport}:{provider}:{provider_id}
    Sport        Sport       `json:"sport"`
    LeagueID     string      `json:"league_id"`
    LeagueName   string      `json:"league_name"`
    HomeTeam     Team        `json:"home_team"`
    AwayTeam     Team        `json:"away_team"`
    Status       MatchStatus `json:"status"`
    StartTime    time.Time   `json:"start_time"`
    Score        *Score      `json:"score,omitempty"`
    Clock        *Clock      `json:"clock,omitempty"`         // Current game time
    Events       []Event     `json:"events,omitempty"`        // Goals, cards, baskets, etc.
    Sequence     int64       `json:"sequence"`                // Monotonic counter for sync
    UpdatedAt    time.Time   `json:"updated_at"`
}

type Team struct {
    ID       string `json:"id"`
    Name     string `json:"name"`
    ShortName string `json:"short_name"`
    LogoURL  string `json:"logo_url,omitempty"`
}

type Score struct {
    Home int `json:"home"`
    Away int `json:"away"`
    // Sport-specific extensions (quarters, periods, sets) stored as metadata
    Meta map[string]any `json:"meta,omitempty"`
}

type Clock struct {
    DisplayTime string `json:"display_time"`  // e.g. "72'", "Q3 4:22"
    Period      int    `json:"period"`
    IsRunning   bool   `json:"is_running"`
}

type Event struct {
    ID        string    `json:"id"`
    Type      string    `json:"type"`    // "goal", "red_card", "basket", "ko", etc.
    Minute    int       `json:"minute,omitempty"`
    Player    string    `json:"player,omitempty"`
    TeamID    string    `json:"team_id"`
    OccurredAt time.Time `json:"occurred_at"`
}
```

---

### Step 2.2 — PostgreSQL Schema (via `sqlc`)

#### [NEW] `backend/db/migrations/001_initial.sql`

Tables:
- **`users`** — `id`, `email`, `display_name`, `avatar_url`, `created_at`
- **`oauth_accounts`** — `user_id`, `provider` (google|apple), `provider_user_id`, `access_token`, `refresh_token`, `expires_at`
- **`sessions`** — `id`, `user_id`, `jwt_token_hash`, `expires_at`
- **`follows`** — `user_id`, `entity_type` (team|league), `entity_id`, `entity_name` — composite PK
- **`push_subscriptions`** — `id`, `user_id`, `endpoint`, `p256dh_key`, `auth_key`, `created_at`
- **`notifications_log`** — `id`, `user_id`, `match_id`, `type`, `sent_at`

#### [NEW] `backend/db/queries/*.sql`

sqlc query files for each table, generating typed Go code.

---

### Step 2.3 — MongoDB Collections

#### [NEW] `backend/internal/store/mongo.go`

Collections:
- **`match_timelines`** — one document per match, containing the full ordered array of `Event` objects. Indexed on `match_id` + `sport`.
- **`match_snapshots`** — periodic full-state snapshots for the Sync endpoint. Indexed on `match_id` + `sequence` for efficient "give me events since sequence N" queries.

Schema design (BSON):
```json
{
  "_id": "football:espn:401547389",
  "sport": "football",
  "league_id": "eng.1",
  "status": "finished",
  "start_time": "ISODate(...)",
  "home_team": { ... },
  "away_team": { ... },
  "final_score": { "home": 2, "away": 1 },
  "events": [
    { "type": "goal", "minute": 23, "player": "Salah", "team_id": "liv" },
    ...
  ],
  "last_sequence": 142,
  "updated_at": "ISODate(...)"
}
```

---

### Step 2.4 — Redis Key Schema

| Key Pattern | Type | TTL | Purpose |
|---|---|---|---|
| `match:state:{id}` | Hash | 4 hours | Live match state (score, status, clock) |
| `match:seq:{id}` | String (int) | 4 hours | Monotonic sequence counter |
| `match:hash:{id}` | String | 4 hours | SHA-256 of last payload for diffing |
| `schedule:{sport}:{date}` | String (JSON) | 10 min | Cached schedule for a sport/date |
| `pubsub:match:{id}` | Pub/Sub channel | — | Live event fan-out |

---

## Phase 3: Ingestion Worker & Adapter Layer

**Goal:** A running Go worker that polls `sportsdata-mcp`, normalises data through typed adapters, diffs state, persists history, and publishes to Redis Pub/Sub.

---

### Step 3.1 — Adapter Interface

#### [NEW] `backend/internal/adapter/adapter.go`

```go
// Adapter is the contract every provider adapter must satisfy.
// It takes raw JSON from sportsdata-mcp tool responses and
// returns our canonical MatchEvent slice.
type Adapter interface {
    // Sport returns which sport this adapter handles
    Sport() domain.Sport
    // Supports returns true if this adapter can handle the given provider+league
    Supports(providerID, leagueID string) bool
    // ParseScoreboard converts a raw scoreboard JSON payload into MatchEvents
    ParseScoreboard(raw json.RawMessage) ([]domain.MatchEvent, error)
    // ParseMatchDetail converts a raw single-match JSON into a MatchEvent
    ParseMatchDetail(raw json.RawMessage) (*domain.MatchEvent, error)
}
```

#### [NEW] `backend/internal/adapter/espn_soccer.go`
Maps ESPN scoreboard JSON → `MatchEvent` for all soccer leagues.

#### [NEW] `backend/internal/adapter/espn_mma.go`
Maps ESPN MMA/UFC JSON → `MatchEvent`.

#### [NEW] `backend/internal/adapter/nba.go`
Maps `cdn.nba.com` scoreboard + box score → `MatchEvent` with basketball-specific `Score.Meta` (quarters).

#### [NEW] `backend/internal/adapter/openligadb.go`
Maps OpenLigaDB Bundesliga JSON (note: scores in `matchResults[]` with HT/FT entries) → `MatchEvent`.

Each adapter includes a test file with pinned real API responses as golden fixtures.

---

### Step 3.2 — Ingestion State Machine

#### [NEW] `backend/internal/ingestion/poller.go`

The adaptive poller is the heart of the ingestion pipeline:

```
State Machine per Sport:

  [IDLE] ──(schedule window approaching)──► [PRE_MATCH]
  [PRE_MATCH] ──(match starts)──────────► [LIVE]
  [LIVE] ──(match ends)──────────────────► [POST_MATCH]
  [POST_MATCH] ──(cooldown expires)──────► [IDLE]

Poll intervals:
  IDLE:       60 min  (check schedule only)
  PRE_MATCH:  10 min  (T-3h to kickoff)
  LIVE:       15 sec  (ESPN/NBA), 30 sec (OpenLigaDB)
  POST_MATCH: 5 min   (collect final stats)
```

**Algorithm per poll cycle:**
1. Call MCP tool (e.g. `espn_scores` with `sport=soccer&league=eng.1`)
2. Pass raw response to the appropriate `Adapter.ParseScoreboard()`
3. For each `MatchEvent`:
   a. Compute SHA-256 hash of serialised struct
   b. Compare against `match:hash:{id}` in Redis
   c. **If unchanged** → skip (no-op)
   d. **If changed** → update Redis state, increment sequence, append new events to MongoDB, publish `HybridPayload` to `pubsub:match:{id}`

**HybridPayload** (published to Redis Pub/Sub):
```go
type HybridPayload struct {
    MatchID    string           `json:"match_id"`
    Sequence   int64            `json:"sequence"`
    Snapshot   *domain.MatchEvent `json:"snapshot"`    // full state (for new subscribers)
    Delta      []domain.Event   `json:"delta"`         // only new events since last publish
}
```

---

### Step 3.3 — MCP Client (Go → sportsdata-mcp)

> [!NOTE]
> `sportsdata-mcp` runs as a local stdio MCP server. The Go worker communicates with it over stdin/stdout using JSON-RPC — the standard MCP protocol.

#### [NEW] `backend/internal/ingestion/mcp_client.go`

A lightweight MCP stdio client that:
- Spawns `sportsdata-mcp serve` as a subprocess
- Sends `tools/call` JSON-RPC requests
- Returns `json.RawMessage` responses to the caller (adapters handle parsing)
- Handles subprocess restart on crash

---

## Phase 4: SSE Gateway

**Goal:** A high-concurrency Go HTTP/2 server that fans out Redis Pub/Sub messages to thousands of connected browser clients via Server-Sent Events.

---

### Step 4.1 — Connection Hub

#### [NEW] `backend/internal/gateway/hub.go`

```go
type Hub struct {
    // rooms maps match_id → set of client channels
    rooms map[string]map[chan []byte]struct{}
    mu    sync.RWMutex

    // redis subscriber
    sub *redis.PubSub
}
```

Hub goroutine:
- Subscribes to Redis `pubsub:match:*` (pattern subscribe)
- On each message: acquires read lock, fans out to all registered channels for that match
- Clients register/deregister channels on connect/disconnect

---

### Step 4.2 — SSE Handler

#### [NEW] `backend/internal/gateway/sse.go`

`GET /v1/sse/match/{id}`

1. Validate JWT from `Authorization` header or `token` query param
2. Check user follows this match (optional — can also allow unauthenticated for public matches)
3. Send initial snapshot from Redis (`match:state:{id}`)
4. Register client channel with Hub
5. Stream `HybridPayload` as SSE events: `event: match_update\ndata: {...}\n\n`
6. On client disconnect: deregister from Hub, close channel

**Reconnection:** On SSE reconnect, client sends `Last-Event-ID: {sequence}`. The gateway fetches events since that sequence from MongoDB and replays them before resuming live stream.

---

## Phase 5: Core API

**Goal:** REST endpoints for auth, user preferences, calendar export, and missed-event sync.

---

### Step 5.1 — Auth Endpoints

#### [MODIFY] `backend/cmd/api/main.go`

Routes (via `go-chi/chi`):

```
POST /auth/oauth/google        OAuth2 initiate + callback
POST /auth/oauth/apple         OAuth2 initiate + callback
POST /auth/refresh             Refresh JWT from valid session
DELETE /auth/session           Logout (invalidate session)
```

OAuth flow:
1. Redirect user to Google/Apple consent screen
2. On callback: exchange code → access token → fetch user profile
3. Upsert `users` + `oauth_accounts` in PostgreSQL
4. Issue JWT (15 min expiry) + refresh token (30 days)

---

### Step 5.2 — User Preferences Endpoints

```
GET  /v1/me                    Current user profile
GET  /v1/me/follows            List followed teams + leagues
POST /v1/me/follows            Follow a team or league
DELETE /v1/me/follows/{id}     Unfollow

POST /v1/me/push               Register VAPID push subscription
DELETE /v1/me/push             Remove push subscription
```

---

### Step 5.3 — Calendar Export

```
GET /v1/calendar/{user_token}.ics    Dynamic ICS feed for followed teams
```

Generates RFC 5545 compliant `.ics` with `VCALENDAR` + `VEVENT` per upcoming match. `user_token` is a separate long-lived opaque token (not JWT) safe for calendar app URLs.

---

### Step 5.4 — Sync Endpoint

```
GET /v1/matches/{id}/sync?since={sequence}
```

Returns all `MatchEvent` events with sequence > `since` from MongoDB. Used by the PWA when it detects it has missed events (SSE reconnect gap).

---

### Step 5.5 — Match Catalogue Endpoints

```
GET /v1/sports                          List available sports
GET /v1/sports/{sport}/leagues          List leagues for a sport
GET /v1/matches?sport=football&date=today   Today's matches (from Redis cache)
GET /v1/matches/{id}                    Full match detail (from MongoDB)
GET /v1/standings?sport=football&league=eng.1   League table
```

---

## Phase 6: Web Push Notifications

**Goal:** Server-side VAPID push for match start alerts and key events (goals, KOs).

---

### Step 6.1 — VAPID Key Generation

#### [NEW] `backend/cmd/vapid-keygen/main.go`

One-shot utility that generates a VAPID key pair and prints to stdout for `.env` configuration.

---

### Step 6.2 — Push Worker

#### [NEW] `backend/internal/push/worker.go`

Background goroutine:
- Subscribes to Redis Pub/Sub for `HybridPayload` events
- For each event with `delta` entries:
  - Fetches all `push_subscriptions` for users following the match's teams/leagues
  - Sends VAPID push notification via `webpush-go`
  - Handles expired subscriptions (HTTP 410 → delete from DB)
  - Handles rate limiting (max 1 push per match per user per 5 min)

Push payload:
```json
{
  "title": "⚽ Manchester City 1–0 Arsenal",
  "body": "GOAL — Haaland (23')",
  "icon": "/icons/football.png",
  "data": { "match_id": "football:espn:401547389", "url": "/match/..." }
}
```

---

## Phase 7: Frontend PWA

**Goal:** Mobile-first React PWA with live score streams, personalisation, and offline support.

---

### Step 7.1 — Zustand Stores

#### [NEW] `frontend/src/stores/matchStore.ts`
Live match state per match ID, updated by SSE stream.

#### [NEW] `frontend/src/stores/authStore.ts`
JWT, user profile, follow list.

#### [NEW] `frontend/src/stores/settingsStore.ts`
Preferred sport, notification preferences, persisted to `localStorage`.

---

### Step 7.2 — SSE Hook

#### [NEW] `frontend/src/hooks/useMatchSSE.ts`

```typescript
// Connects to /v1/sse/match/{id}, updates matchStore on each event.
// Handles reconnection with exponential backoff + Last-Event-ID header.
function useMatchSSE(matchId: string): void
```

---

### Step 7.3 — Pages & Components

| Page | Route | Description |
|---|---|---|
| Home | `/` | Today's matches grouped by sport, filterable by followed teams |
| Match Detail | `/match/:id` | Live score ticker, event timeline, stats |
| League Table | `/league/:sport/:id` | Standings with form guide |
| Profile | `/profile` | Follow management, notification settings |
| Settings | `/settings` | Sport preferences, push toggle |

**Key components:**
- `<LiveScoreTicker>` — real-time animated score with SSE-driven updates
- `<MatchCard>` — compact match summary for home page grid
- `<EventTimeline>` — scrollable match event log (goals, cards, quarters)
- `<FollowButton>` — team/league follow toggle with optimistic UI update

---

### Step 7.4 — Service Worker & PWA Config

#### [MODIFY] `frontend/vite.config.ts`

```typescript
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'not365',
    short_name: 'not365',
    theme_color: '#0f172a',
    display: 'standalone',
    orientation: 'portrait',
    icons: [ /* 192, 512 */ ]
  },
  workbox: {
    runtimeCaching: [
      // Cache match schedules for offline browsing
      // Network-first for live match data
    ]
  }
})
```

Push subscription registration in `frontend/src/lib/push.ts`:
- Request notification permission
- Subscribe via `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC })`
- POST subscription to `/v1/me/push`

---

## Verification Plan

### Phase 1
- [ ] `docker compose up` brings Postgres, Mongo, Redis to healthy state
- [ ] `sportsdata-mcp coverage` reports ESPN + NBA + OpenLigaDB as reachable
- [ ] `sportsdata-mcp doctor` with target groups passes all checks
- [ ] `go build ./...` compiles without errors
- [ ] `pnpm build` produces dist without errors

### Phase 2
- [ ] `make migrate` runs all SQL migrations cleanly
- [ ] `make sqlc` generates typed Go code without errors
- [ ] Unit tests for all domain struct serialisation round-trips

### Phase 3
- [ ] Each adapter has a unit test with a real pinned JSON fixture from the MCP
- [ ] `TestESPNSoccerAdapter_ParseScoreboard` — Premier League scoreboard → correct `MatchEvent` array
- [ ] `TestNBAAdapter_ParseScoreboard` — NBA CDN scoreboard → correct scores + periods
- [ ] Poller integration test: run for 60 seconds, assert Redis state is populated, MongoDB has at least one document
- [ ] Diff logic test: same payload twice → no second publish to Redis Pub/Sub

### Phase 4
- [ ] `curl -H "Accept: text/event-stream" http://localhost:8081/v1/sse/match/{id}` receives initial snapshot
- [ ] Simulate publish to Redis → confirm SSE client receives it within 1 second
- [ ] Load test: 500 concurrent SSE connections, assert no goroutine leaks

### Phase 5
- [ ] OAuth round-trip test: Google login → JWT issued → `/v1/me` returns profile
- [ ] Follow test: POST follow → GET follows includes it → SSE receives push for that team's match
- [ ] ICS test: generated file is valid RFC 5545, imports correctly into Google Calendar

### Phase 6
- [ ] VAPID push: subscription registered → trigger match event → push notification delivered in browser
- [ ] Expired subscription: server receives 410 → subscription deleted from DB

### Phase 7
- [ ] Lighthouse PWA audit score ≥ 90
- [ ] Live match: open two browser tabs → same SSE stream, both update within 1 second
- [ ] Offline: service worker serves cached schedule when network is offline
- [ ] Mobile layout: test on 375px viewport, no horizontal scroll

---

## Open Questions (Resolved)

| # | Question | Status |
|---|---|---|
| 1 | MCP Server | ✅ `sportsdata-mcp`, installed via `uvx`, configured with `sportsdata-mcp.yaml` |
| 2 | Repo structure | ✅ Single monorepo |
| 3 | Auth | ✅ OAuth 2.0, credentials added when ready |
| 4 | Web Push | ✅ Native VAPID |
| 5 | Rate limits | ✅ No paid tier limit; configure `rate_limit_rps` in yaml to be polite |

## Remaining Open Questions (All Resolved)

| # | Question | Decision |
|---|---|---|
| 6 | Cloud Deployment | ⏳ Deferred — cloud provider TBD. Terraform scaffold kept as placeholder, no cloud-specific decisions made yet. |
| 7 | OAuth Credentials | ✅ Dev-mode auth stub — issues real JWTs without OAuth flow, toggled via `AUTH_MODE=stub\|oauth` env flag. Real credentials plugged in later. |
| 8 | Domain / HTTPS | ⏳ Deferred — `localhost` for all local dev. HTTPS strategy (Cloudflare Tunnel, Caddy, etc.) decided when staging is needed. VAPID and OAuth stubs work on localhost in the meantime. |
