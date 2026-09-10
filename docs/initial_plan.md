# Master Implementation Plan: Real-Time Multi-Sport Platform
**Target Audience:** AI Agent Context (Google Antigravity)
**Project Goal:** Generate a detailed, step-by-step implementation plan for a high-concurrency live sports platform.

## 1. App Summary & Core Features
A Progressive Web App (PWA) comparable to 365Scores, delivering live scores, match schedules, alerts, and standings.
*   **Multi-Sport Support:** Initial launch with football; architecture must support unified schemas for basketball, MMA, and more.
*   **Live Events:** Sub-second latency for live score updates, match events, and state changes.
*   **User Personalization:** Users can select specific teams and leagues to follow.
*   **Calendar Integration:** Ability to export dynamic `.ics` calendar files for match reminders.
*   **Platform:** Mobile-first Progressive Web App (PWA) to bypass App Store restrictions and utilize Web Push APIs.

## 2. Technology Stack
*   **Backend Application:** Go (1.22+), utilizing standard `net/http` or `go-chi/chi` for routing.
*   **Relational Database:** PostgreSQL (managed via `jackc/pgx` and `sqlc` for type-safe query generation).
*   **Document Database:** MongoDB (`go.mongodb.org/mongo-driver`) for flexible historical match timelines.
*   **In-Memory Cache & Message Broker:** Redis (`redis/go-redis/v9`).
*   **Frontend Client:** React (TypeScript) built with Vite, `vite-plugin-pwa`, Zustand (state management), and Tailwind CSS.
*   **Authentication:** OAuth 2.0 (Google, Apple) via `golang.org/x/oauth2` and JWT session tokens.
*   **Data Provider:** `sportsdata-mcp` (Open-source MCP server aggregating 64+ free providers including ESPN, NBA, Premier League, UFC, and live betting odds).

## 3. Infrastructure & AI Tooling
*   **Local Development:** `docker-compose` defining the Postgres, Mongo, and Redis topology alongside backend Go services.
*   **Infrastructure as Code:** Terraform for future cloud deployment provisioning.
*   **Agent Context (MCP):** Antigravity must utilize the `sportsdata-mcp` Model Context Protocol server to natively inspect live responses from public sports APIs. This enables the agent to automatically generate precise Go domain structs and parsers for our unified sports ingestion pipeline.

## 4. Architecture & Data Flow

```mermaid
flowchart TD
    subgraph External Provider
        API[sportsdata-mcp\n(Aggregates Public APIs)]
    end

    subgraph Go Backend Services
        Worker[Ingestion Worker\nState Machine]
        Gateway[SSE Gateway\nHTTP/2 Streams]
        Core[Core API\nAuth & Sync]
    end

    subgraph Data Persistence
        PG[(PostgreSQL\nUsers, Follows, Auth)]
        Mongo[(MongoDB\nMatch Timelines, Hist)]
        RedisCache[(Redis Cache\nLive Match State)]
        RedisPubSub((Redis Pub/Sub\nChannel: match:id))
    end

    subgraph Client
        PWA[Mobile PWA Client\nReact/Vite]
    end

    %% Ingestion Pipeline
    Worker == 1. Adaptive Polling ==> API
    Worker <== 2. Diff State ==> RedisCache
    Worker -- 3. Write History --> Mongo
    Worker -- 4. Publish Hybrid Payload --> RedisPubSub
    
    %% Real-Time Delivery
    RedisPubSub -- 5. Fan-Out --> Gateway
    Gateway == 6. Server-Sent Events (SSE) ==> PWA

    %% Fallback & Identity
    PWA -. 7. Sync Missed Sequences .-> Core
    Core -. Read Last State .-> Mongo
    Core -. Read/Write Identity .-> PG
```