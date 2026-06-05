#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_DIR="$REPO_DIR/docker"
COMPOSE_FILE="$COMPOSE_DIR/docker-compose.yml"

echo "=== Pulling latest from git ==="
cd "$REPO_DIR"
git pull origin main

echo "=== Building Docker images ==="
docker compose -f "$COMPOSE_FILE" build

echo "=== Pulling latest images ==="
docker compose -f "$COMPOSE_FILE" pull

echo "=== Deploying services ==="
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo "=== Pruning old images ==="
docker image prune -f

echo "=== Checking service health ==="
services=("api" "postgres" "timescaledb" "redis" "loki" "prometheus" "grafana" "nginx" "wireguard")

for svc in "${services[@]}"; do
  status=$(docker compose -f "$COMPOSE_FILE" ps --format json "$svc" 2>/dev/null || echo "null")
  if [ "$status" != "null" ]; then
    echo "  $svc is running"
  else
    echo "  WARNING: $svc not found or not running"
  fi
done

echo "=== Deployment complete ==="
