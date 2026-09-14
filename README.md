# not365 ⚡

[![CI](https://github.com/NivRave/not365/actions/workflows/ci.yml/badge.svg)](https://github.com/NivRave/not365/actions/workflows/ci.yml)
[![Go Version](https://img.shields.io/badge/Go-1.25+-00ADD8?style=flat&logo=go)](https://go.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A high-performance, real-time multi-sport **Progressive Web App (PWA)** delivering live scores, interactive tactical pitch visualizers, game timelines, head-to-head records, personalized calendar feeds, and push alerts — comparable to 365Scores, FotMob, and Flashscore.

Built with a modern **Go** distributed backend, **React 19** frontend, and a 100% free, open-source sports data pipeline powered by [`sportsdata-mcp`](https://github.com/astral-sh/uv). **Zero expensive external API subscriptions required.**

---

## 📑 Table of Contents

- [Overview & Architecture](#-overview--architecture)
- [Key Features](#-key-features)
  - [1. Real-Time Streaming & Live Simulator](#1-real-time-streaming--live-simulator)
  - [2. Interactive Tactical Pitch & Formations](#2-interactive-tactical-pitch--formations)
  - [3. Multi-Theme Engine & OLED Black Mode](#3-multi-theme-engine--oled-black-mode)
  - [4. Synthesized Web Audio Alerts](#4-synthesized-web-audio-alerts)
  - [5. Standings, Teams & Head-to-Head (H2H)](#5-standings-teams--head-to-head-h2h)
  - [6. Personalized Favorites & iCalendar Sync](#6-personalized-favorites--icalendar-sync)
  - [7. Adaptive Ingestion & Zero-Loss Reconnect](#7-adaptive-ingestion--zero-loss-reconnect)
- [System Architecture Diagram](#-system-architecture-diagram)
- [Technology Stack](#-technology-stack)
- [Project Layout](#-project-layout)
- [Getting Started](#-getting-started)
  - [Quickstart via Docker Compose (Recommended)](#quickstart-via-docker-compose-recommended)
  - [Local Development Workflow](#local-development-workflow)
- [Configuration & Environment Variables](#-configuration--environment-variables)
- [API Reference](#-api-reference)
  - [Core REST API](#core-rest-api-port-8088--8080)
  - [SSE Streaming Gateway](#sse-streaming-gateway-port-8089--8081)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [License](#-license)

---

## 🌐 Overview & Architecture

Commercial live score applications typically rely on costly B2B sports data providers (Sportradar, Opta, API-Football) costing hundreds to thousands of dollars per month. **not365** achieves enterprise parity on top of public and open-source sports feeds (ESPN, NBA CDN, OpenLigaDB) combined with a local Python MCP process and an intelligent ingestion state machine.

### Core Design Principles:
1. **Clean Separation of Concerns**: Monorepo partitioned into decoupled services: an Ingestion Worker, Core REST API, SSE Streaming Gateway, and React PWA.
2. **Polyglot Persistence**:
   - **PostgreSQL 16**: Relational integrity for user accounts, team/league follows, and VAPID push subscriptions.
   - **MongoDB 7 (Replica Set `rs0`)**: High-throughput document storage for match timeline events, play-by-play actions, and multi-document transactions.
   - **Redis 7**: Sub-millisecond live match cache, SHA-256 state hashes, and Pub/Sub message broker for real-time fan-out.
3. **Resilience First**: Network partitions and SSE drops recover instantly without data gaps using `Last-Event-ID` chronological sync.

---

## 🌟 Key Features

### 1. Real-Time Streaming & Live Simulator
- **HTTP/2 Server-Sent Events (SSE)**: Scalable, low-overhead push mechanism over standard HTTP with automatic reconnection.
- **Dynamic Clock & Score Ticking**: Live matches tick game minutes (`1'` through `90'+`) with real-time score updates.
- **Live Match Simulator (`POST /v1/matches/simulate`)**: Built-in interactive simulator that generates an exciting live match (e.g. Arsenal vs Chelsea) complete with kick-off, yellow cards, halftime, goals, and full-time events broadcast across Redis Pub/Sub and SSE in real-time.

### 2. Interactive Tactical Pitch & Formations
- **Visual Pitch Canvas**:
  - **Football Turf**: High-resolution grass striped pitch with regulation touchlines, penalty boxes, 6-yard boxes, penalty spots, and corner arcs.
  - **Basketball Court**: Hardwood floor styling with paint keys and 3-point lines for NBA fixtures.
- **Dual Viewing Modes**:
  - **Full Pitch Clash**: Renders both competing teams (22 players in football, 10 in basketball) facing each other across the pitch.
  - **Single Team Tactical View**: Isolates the home or away team in tactical formation (e.g., 4-3-3, 4-2-3-1, 3-5-2, or Starting Five) attacking upwards.
- **Player Nodes & Badges**:
  - Jersey circle nodes with team color gradients and squad numbers.
  - Gold captain badge `(C)` for team captains.
  - Live match performance ratings (e.g., `8.5`, `7.2`) with color-coded performance tiers.
  - Click-to-inspect modal displaying player details, position, and grid assignment.
- **Managers & Substitutes**:
  - Head coach tactical cards with system formation tags.
  - Full bench lists showing substitute numbers, positions, and ratings.

### 3. Multi-Theme Engine & OLED Black Mode
- **Zero-Power Pure OLED Black (`#000000`)**: Designed specifically for mobile OLED/AMOLED screens to turn off black pixels, saving battery during prolonged match viewing.
- **Slate Dark Mode**: Deep navy stadium theme (`#0f172a` background, `#1e293b` cards).
- **Light Stadium Mode**: Clean, crisp high-contrast daytime theme (`#f8fafc` background, `#ffffff` cards).
- **Instant CSS Variable Switching**: Built with dynamic CSS variables mapped into Tailwind CSS, guaranteeing instantaneous theme switching without triggering React component remounts.
- **Persistence**: User theme choice is stored in `localStorage` and applied before initial paint to prevent theme flash.

### 4. Synthesized Web Audio Alerts
- **Zero-Dependency Web Audio API Engine**: Synthesizes rich polyphonic audio chords in browser memory without downloading external MP3 or audio files.
- **Ascending Goal Chime**: Plays a triumphant 3-tone musical chord (C5 -> E5 -> G5) upon every goal.
- **Referee Whistle**: Distinctive whistle sound on kick-off and full-time events.
- **Audio Controls in Settings**:
  - Master audio switch to toggle alerts.
  - Fine-grained Volume Slider (0% to 100%) with real-time percentage readout.
  - **"Test Chime 🔔"** button to preview audio levels directly in Settings.

### 5. Standings, Teams & Head-to-Head (H2H)
- **Multi-League Standings Table**: Rank (`#`), Club Crest, Played (`P`), Won (`W`), Drawn (`D`), Lost (`L`), Goals For (`GF`), Goals Against (`GA`), Goal Difference (`GD`), Points (`PTS`), and 5-match Form Guide (`W`/`D`/`L`).
- **Comprehensive Teams Directory**: Browse clubs across sports with recent form, upcoming fixtures, and historical results.
- **Head-to-Head (H2H) Records**: Historical encounters between competing clubs with previous match dates, competitions, and final scores.

### 6. Personalized Favorites & iCalendar Sync
- **One-Tap Follow**: Star any club or league to customize the home feed.
- **Dynamic RFC 5545 Calendar Feed (`.ics`)**: Generates a live subscription URL importable into **Apple Calendar**, **Google Calendar**, and **Microsoft Outlook**. Fixtures update automatically as kick-off times are confirmed.
- **Native VAPID Web Push**: Background browser push notifications for goals, kick-offs, and final whistles even when the app tab is closed.

### 7. Adaptive Ingestion & Zero-Loss Reconnect
- **Adaptive Polling State Machine**: Adjusts polling frequencies dynamically according to match status:
  - `IDLE` (no games today): Poll every 30 minutes.
  - `PRE_MATCH` (within 2 hours of kickoff): Poll every 5 minutes.
  - `LIVE` (match in progress): Poll every 15 seconds.
  - `POST_MATCH` (final whistle): Poll once, then transition to `IDLE`.
- **SHA-256 State Diffing**: Hashes incoming match snapshots and compares against Redis to discard redundant cycles without database writes.
- **Zero-Loss Reconnect**: Clients supply `Last-Event-ID` on reconnection. The SSE Gateway queries MongoDB to replay any missed chronological events before resuming the live stream.

---

## 🏗️ System Architecture Diagram

```mermaid
flowchart TD
    subgraph Providers["Data Pipeline"]
        MCP["sportsdata-mcp (Python / uvx)"]
        ESPN["ESPN Public API\n(Football, MMA)"]
        NBA["NBA CDN\n(Basketball)"]
        OL["OpenLigaDB\n(Bundesliga)"]
        MCP --> ESPN & NBA & OL
    end

    subgraph Backend["Go Monorepo Services"]
        Worker["Ingestion Worker\n(Adaptive Poller + State Diff Machine)"]
        CoreAPI["Core REST API (:8088 / :8080)\n(Auth, Lineups, Standings, Teams, ICS)"]
        Gateway["SSE Gateway (:8089 / :8081)\n(Connection Pool + Event Streamer)"]
        PushWorker["VAPID Push Worker"]
    end

    subgraph Stores["Persistence Layer"]
        PG[("PostgreSQL 16\n(Users, Follows, Push Subscriptions)")]
        Mongo[("MongoDB 7 (Replica Set rs0)\n(Match Timelines & Event History)")]
        RedisCache[("Redis 7 Cache\n(Live State & State Hashes)")]
        RedisPubSub{{"Redis Pub/Sub\n(pubsub:match:id)"}}
    end

    subgraph Client["PWA Client Application (:3000)"]
        React["React 19 + TypeScript + Tailwind"]
        Zustand["Zustand Store\n(Settings, Matches, Favorites)"]
        Pitch["PitchFormationVisualizer\n(2D Canvas + Player Grid)"]
        Audio["Web Audio API Synthesizer\n(Goal Chimes & Whistles)"]
        SW["Service Worker (VitePWA / Workbox)"]
        React --> Zustand & Pitch & Audio & SW
    end

    %% Ingestion Pipeline
    MCP == JSON-RPC / Stdio ==> Worker
    Worker --> RedisCache
    Worker --> Mongo
    Worker --> RedisPubSub

    %% Live Real-time Broadcast
    RedisPubSub -- Fan-Out --> Gateway
    Gateway == HTTP/2 SSE Stream ==> React

    %% Core Services Communication
    React -. REST Requests .-> CoreAPI
    CoreAPI <--> PG
    CoreAPI <--> Mongo
    CoreAPI <--> RedisCache

    %% Web Push Notifications
    RedisPubSub --> PushWorker
    PushWorker --> PG
    PushWorker == Web Push Protocol ==> SW
```

---

## 🧰 Technology Stack

| Layer | Component | Version / Library | Rationale |
|---|---|---|---|
| **Backend** | Language | Go 1.25+ | Maximum concurrency, ultra-low memory footprint, fast cold-starts. |
| **API Framework** | Router | `go-chi/chi/v5` | Lightweight, idiomatic HTTP router with standard `net/http` handlers. |
| **Relational DB** | Database | PostgreSQL 16 | ACID-compliant storage for user profiles, follows, and push keys. |
| **Driver (PG)** | Connection Pool | `jackc/pgx/v5` | High-performance PostgreSQL driver with native connection pooling. |
| **Document Store** | Database | MongoDB 7 (`rs0`) | Flexible schema for play-by-play timelines and multi-document transactions. |
| **Cache & Pub/Sub** | In-Memory | Redis 7 (`go-redis/v9`) | Sub-millisecond snapshot caching and multi-subscriber SSE fan-out. |
| **Push Notifications** | Push Engine | `SherClockHolmes/webpush-go` | Native RFC 8291/8292 VAPID encryption without external push gateways. |
| **Frontend** | UI Framework | React 19 + TypeScript 5.7+ | Concurrent rendering, type safety, and component architecture. |
| **Build Tool** | Bundler | Vite 6 | Sub-second HMR and tree-shaken production bundles. |
| **Styling** | CSS Engine | Tailwind CSS v3 | Utility-first styling with dynamic CSS variable theming (Slate, OLED, Light). |
| **State Management**| Global State | Zustand 5 | Minimalist store with zero boilerplate and optimistic UI updates. |
| **PWA & Offline** | Service Worker | `vite-plugin-pwa` + Workbox | Cache-first offline asset delivery and installability. |
| **Data Ingestion** | Ingestion Bridge | `sportsdata-mcp` (via `uvx`) | Python MCP server exposing free sports endpoints over stdio/JSON-RPC. |

---

## 📁 Project Layout

```
not365/
├── backend/
│   ├── cmd/
│   │   ├── api/             # Core REST API entrypoint
│   │   ├── gateway/         # SSE Streaming Gateway entrypoint
│   │   ├── worker/          # Data Ingestion Worker entrypoint
│   │   ├── seed/            # Database seeder (teams, leagues, fixtures)
│   │   └── vapid-keygen/    # Utility to generate VAPID keypairs
│   ├── db/
│   │   └── migrations/      # PostgreSQL schema migrations (001_initial.sql)
│   └── internal/
│       ├── adapter/         # MCP stdio client & sports API parsers
│       ├── api/             # REST endpoints (matches, lineups, standings, teams)
│       ├── auth/            # JWT authentication & dev-login stub
│       ├── domain/          # Core domain models (Match, Lineup, Team, User)
│       ├── gateway/         # SSE connection hub and client streams
│       ├── ics/             # RFC 5545 iCalendar generator
│       ├── ingestion/       # Adaptive state machine poller & diff engine
│       ├── push/            # Web Push notification dispatcher
│       └── store/           # Database repositories (Postgres, Mongo, Redis)
├── frontend/
│   ├── public/              # Static assets, logos, and PWA icons
│   ├── src/
│   │   ├── components/      # UI components (PitchVisualizer, LiveScoreTicker, etc.)
│   │   ├── hooks/           # Custom React hooks (useMatchSSE)
│   │   ├── lib/             # API client, Web Audio synthesizer, Push utilities, Types
│   │   ├── pages/           # Views (MatchesPage, MatchDetailPage, SettingsPage)
│   │   ├── stores/          # Zustand stores (matchStore, settingsStore)
│   │   ├── App.tsx          # Main application shell with navigation
│   │   ├── index.css        # Global CSS variable theme palettes
│   │   └── main.tsx         # Entrypoint with PWA registration
│   ├── index.html           # HTML template
│   ├── nginx.conf           # Production Nginx reverse-proxy configuration
│   └── tailwind.config.ts   # Tailwind configuration with theme bindings
├── .env.example             # Documented environment configuration template
├── docker-compose.yml       # Production/development multi-container definition
├── Dockerfile               # Multi-stage Go and React container builds
├── Makefile                 # Developer automation targets
└── README.md                # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your host machine:
- **Docker & Docker Compose** (v24+)
- **Go** (v1.23+) *(only required for local binary development)*
- **Node.js** (v22+) and **pnpm** (`npm i -g pnpm`) *(only required for local frontend development)*
- **uv** (`pip install uv` or `curl -LsSf https://astral.sh/uv/install.sh | sh`)

---

### Quickstart via Docker Compose (Recommended)

Run the entire platform — all 3 backing databases, 3 Go microservices, and the Nginx frontend — in isolated containers with a single command:

```bash
# 1. Clone the repository
git clone https://github.com/NivRave/not365.git
cd not365

# 2. Initialize environment file
cp .env.example .env

# 3. Spin up all services
docker compose --profile app up -d --build
```

#### Access Points:
- **PWA Web Application**: [http://localhost:3000](http://localhost:3000)
- **Core REST API**: [http://localhost:8088/health](http://localhost:8088/health)
- **SSE Streaming Gateway**: [http://localhost:8089/health](http://localhost:8089/health)
- **PostgreSQL**: `localhost:5435`
- **MongoDB (Replica Set `rs0`)**: `localhost:27018`
- **Redis**: `localhost:6380`

To stop all services:
```bash
docker compose --profile app down
```

---

### Local Development Workflow

If you want to run Go binaries and the Vite dev server directly on your host machine with instant live reload:

#### 1. Start Backing Stores Only
```bash
docker compose up -d
```
*This starts PostgreSQL (`:5435`), MongoDB with auto-initiated replica set (`:27018`), and Redis (`:6380`).*

#### 2. Run Database Migrations
```bash
# On Windows (PowerShell):
Get-Content backend/db/migrations/001_initial.sql -Raw | docker exec -i not365-postgres psql -U not365 -d not365

# On Linux / macOS (Bash):
docker exec -i not365-postgres psql -U not365 -d not365 < backend/db/migrations/001_initial.sql
```

#### 3. Run Backend Services (Separate Terminals)
```bash
# Terminal 1: Core REST API
cd backend
go run ./cmd/api

# Terminal 2: SSE Gateway
cd backend
go run ./cmd/gateway

# Terminal 3: Ingestion Worker
cd backend
go run ./cmd/worker
```

#### 4. Run Frontend Dev Server
```bash
cd frontend
pnpm install
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000). Vite automatically proxies API requests (`/v1/`, `/auth/`) to `:8088` and SSE streams (`/v1/sse/`) to `:8089`.

---

## ⚙️ Configuration & Environment Variables

All services read configuration from environment variables or the `.env` file:

| Variable | Default | Description |
|---|---|---|
| `API_PORT` | `8088` (Docker: `8080`) | Port exposed by the Core REST API |
| `GATEWAY_PORT` | `8089` (Docker: `8081`) | Port exposed by the SSE Gateway |
| `POSTGRES_USER` | `not365` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `not365` | PostgreSQL password |
| `POSTGRES_DB` | `not365` | PostgreSQL database name |
| `POSTGRES_PORT` | `5435` | Host port mapped to PostgreSQL container |
| `POSTGRES_DSN` | `postgres://not365:not365@localhost:5435/not365?sslmode=disable` | Full PostgreSQL connection string |
| `MONGO_PORT` | `27018` | Host port mapped to MongoDB container |
| `MONGO_URI` | `mongodb://localhost:27018/?replicaSet=rs0&directConnection=true` | MongoDB connection URI with replica set |
| `MONGO_DB` | `not365` | MongoDB database name |
| `REDIS_PORT` | `6380` | Host port mapped to Redis container |
| `REDIS_ADDR` | `localhost:6380` | Host and port for Redis |
| `AUTH_MODE` | `stub` | Authentication mode (`stub` for dev, `jwt` for production) |
| `JWT_SECRET` | `dev-jwt-secret-not365-change-in-production-32chars` | 256-bit secret key for JWT signing |
| `VAPID_PUBLIC_KEY` | *(generated)* | Public key for browser Web Push subscription |
| `VAPID_PRIVATE_KEY` | *(generated)* | Private key for server Web Push message signing |
| `VAPID_EMAIL` | `mailto:admin@not365.app` | Contact email for Web Push notifications |

---

## 📡 API Reference

### Core REST API (Port `:8088` / `:8080`)

#### System & Auth
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/health` | Core API health check | Public |
| `POST` | `/auth/dev-login` | Instant developer login (returns JWT and user profile) | Public |
| `POST` | `/auth/refresh` | Refresh an active JWT session | Public |
| `DELETE` | `/auth/session` | Invalidate current session | Public |

#### Matches & Scores
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/v1/matches` | List matches. Query filters: `sport`, `status`, `date`, `league_id`, `team_id`, `team_ids`, `search`, `limit` | Public |
| `GET` | `/v1/matches/{id}` | Get match details, timeline events, scores, and statistics | Public |
| `GET` | `/v1/matches/{id}/lineups` | Get match lineups: starting XI, grid positions, ratings, captains, bench substitutes, and coaches | Public |
| `GET` | `/v1/matches/{id}/h2h` | Get historical head-to-head encounters between the two clubs | Public |
| `GET` | `/v1/matches/{id}/sync?since={seq}` | Chronological catchup of events missed during disconnection | Public |
| `POST` | `/v1/matches/simulate` | Trigger real-time live match simulation (Arsenal vs Chelsea) | Public |

#### Sports, Leagues & Teams
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/v1/sports` | List supported sports (`football`, `basketball`, `mma`) | Public |
| `GET` | `/v1/sports/{sport}/leagues` | List competitions under a sport | Public |
| `GET` | `/v1/leagues/{id}/standings` | Full league standings table with form, goal diff, points | Public |
| `GET` | `/v1/teams` | List teams with optional `sport` and `league_id` filters | Public |
| `GET` | `/v1/teams/{id}` | Team profile: metadata, form guide, recent & upcoming matches | Public |

#### User Profiles, Follows & Calendar
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/v1/me` | Retrieve authenticated user profile | Bearer JWT |
| `GET` | `/v1/me/follows` | List user's followed teams and leagues | Bearer JWT |
| `POST` | `/v1/me/follows` | Follow a team or league (`entity_type`, `entity_id`, `entity_name`) | Bearer JWT |
| `DELETE` | `/v1/me/follows/{id}` | Unfollow a team or league | Bearer JWT |
| `GET` | `/v1/calendar/{token}.ics` | Dynamic RFC 5545 iCalendar feed for followed entities | Public |
| `POST` | `/v1/me/push` | Register a browser VAPID push notification subscription | Bearer JWT |
| `DELETE` | `/v1/me/push` | Revoke push subscription | Bearer JWT |

---

### SSE Streaming Gateway (Port `:8089` / `:8081`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Gateway health check |
| `GET` | `/v1/sse/match/{id}` | Real-time HTTP/2 SSE event stream (`match_snapshot`, `match_update`, `replay`) |

---

## 🧪 Testing & Quality Assurance

The codebase includes an extensive automated test suite covering unit tests, domain models, ingestion cycles, and integration checks.

```bash
# Run all Go backend unit tests
make test
# Or directly with Go:
cd backend && go test -v ./...

# Build all Go binaries and compile the React PWA
make build

# Validate sportsdata-mcp connectivity and tool discovery
make mcp-doctor

# Generate a new pair of VAPID keys for Web Push
make vapid-keygen
```

---

## 📱 Progressive Web App (PWA) Installation

`not365` is fully configured as an installable Progressive Web App (PWA):
1. **Google Chrome & Microsoft Edge (Desktop)**: Click the **Install** icon in the URL omnibox or select *Settings -> Install Not365*.
2. **Apple Safari (iOS)**: Tap the **Share** button and select **Add to Home Screen**.
3. **Android Chrome**: Tap the menu (three dots) and tap **Install App** or **Add to Home Screen**.

Features work seamlessly in full-screen standalone mode with background caching and offline notifications.

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).
Feel free to fork, customize, and deploy for personal or commercial use.
