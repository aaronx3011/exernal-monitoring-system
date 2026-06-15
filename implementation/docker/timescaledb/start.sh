#!/bin/sh
set -e

POSTGRES_USER="${POSTGRES_USER:-monitor}"
POSTGRES_DB="${POSTGRES_DB:-monitoring}"

/usr/local/bin/docker-entrypoint.sh postgres &

until pg_isready -U "$POSTGRES_USER" -d postgres 2>/dev/null; do
  sleep 1
done

psql -U "$POSTGRES_USER" -d postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname='$POSTGRES_DB'" | \
  grep -q 1 || createdb -U "$POSTGRES_USER" "$POSTGRES_DB"

psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "CREATE EXTENSION IF NOT EXISTS timescaledb" 2>/dev/null || true

wait
