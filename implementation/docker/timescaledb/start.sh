#!/bin/sh
set -e

POSTGRES_USER="${POSTGRES_USER:-monitor}"
POSTGRES_DB="${POSTGRES_DB:-monitoring}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-change_me}"

echo "[timescaledb] Starting PostgreSQL..."
/usr/local/bin/docker-entrypoint.sh postgres &

until pg_isready -U "$POSTGRES_USER" -d postgres 2>/dev/null; do
  sleep 1
done
echo "[timescaledb] PostgreSQL is accepting connections"

DB_EXISTS=$(psql -U "$POSTGRES_USER" -d postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname='$POSTGRES_DB'" | tr -d ' ')

if [ "$DB_EXISTS" != "1" ]; then
  echo "[timescaledb] Creating database '$POSTGRES_DB'..."
  createdb -U "$POSTGRES_USER" "$POSTGRES_DB"
  echo "[timescaledb] Database '$POSTGRES_DB' created"
else
  echo "[timescaledb] Database '$POSTGRES_DB' already exists"
fi

echo "[timescaledb] Ensuring TimescaleDB extension..."
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "CREATE EXTENSION IF NOT EXISTS timescaledb" 2>/dev/null || true

echo "[timescaledb] Ready"
wait
