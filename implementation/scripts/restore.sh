#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup-file>"
  echo "Example: $0 /data/backups/postgres/monitoring_20250101_120000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-monitor}"
DB_DATABASE="${DB_DATABASE:-monitoring}"

echo "=== Restoring database: $DB_DATABASE from $BACKUP_FILE ==="

echo "Dropping and recreating database..."
PGPASSWORD="${DB_PASSWORD}" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USERNAME" \
  -d postgres \
  -c "DROP DATABASE IF EXISTS \"$DB_DATABASE\";"
PGPASSWORD="${DB_PASSWORD}" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USERNAME" \
  -d postgres \
  -c "CREATE DATABASE \"$DB_DATABASE\";"

echo "Restoring from backup..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" | PGPASSWORD="${DB_PASSWORD}" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USERNAME" \
    -d "$DB_DATABASE"
else
  PGPASSWORD="${DB_PASSWORD}" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USERNAME" \
    -d "$DB_DATABASE" \
    -f "$BACKUP_FILE"
fi

echo "=== Restore complete ==="
