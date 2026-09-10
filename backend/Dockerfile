# syntax=docker/dockerfile:1

# Stage 1: Build all Go binaries
FROM golang:alpine AS builder

WORKDIR /app

RUN apk add --no-cache git ca-certificates tzdata

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /bin/api ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /bin/gateway ./cmd/gateway
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /bin/worker ./cmd/worker
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /bin/vapid-keygen ./cmd/vapid-keygen

# Stage 2: Core API service
FROM alpine:3.20 AS api
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /bin/api /app/api
EXPOSE 8080
ENV API_PORT=8080
ENTRYPOINT ["/app/api"]

# Stage 3: SSE Gateway service
FROM alpine:3.20 AS gateway
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /bin/gateway /app/gateway
EXPOSE 8081
ENV GATEWAY_PORT=8081
ENTRYPOINT ["/app/gateway"]

# Stage 4: Ingestion Worker service
FROM alpine:3.20 AS worker
RUN apk add --no-cache ca-certificates tzdata python3 py3-pip
WORKDIR /app
COPY --from=builder /bin/worker /app/worker
ENTRYPOINT ["/app/worker"]
