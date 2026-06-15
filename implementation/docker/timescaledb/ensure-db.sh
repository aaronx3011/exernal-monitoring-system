#!/bin/sh
# Ensures the monitoring database and TimescaleDB extension exist.
# Runs on every container start.
set -e

POSTGRES_USER="${POSTGRES_USER:-monitor}"
POSTGRES_DB="${POSTGRES_DB:-monitoring}"

/usr/local/bin/docker-entrypoint.sh postgres &

until pg_isready -U "$POSTGRES_USER" -d postgres 2>/dev/null; do
  sleep 1
done

if createdb -U "$POSTGRES_USER" "$POSTGRES_DB" 2>/dev/null; then
  echo "[timescaledb] Created database: $POSTGRES_DB"
else
  echo "[timescaledb] Database already exists: $POSTGRES_DB"
fi

psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "CREATE EXTENSION IF NOT EXISTS timescaledb" 2>/dev/null || true

echo "[timescaledb] Ready"
wait
