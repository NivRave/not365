.PHONY: all dev docker-up docker-down build test mcp-doctor vapid-keygen

all: build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

build:
	cd backend && go build ./...
	cd frontend && pnpm build

test:
	cd backend && go test -v ./...

mcp-doctor:
	uvx sportsdata-mcp --config sportsdata-mcp.yaml doctor

vapid-keygen:
	cd backend && go run ./cmd/vapid-keygen
