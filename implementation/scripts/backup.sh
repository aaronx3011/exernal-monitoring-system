#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/data/backups/postgres}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-monitor}"
DB_DATABASE="${DB_DATABASE:-monitoring}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

echo "=== Backing up database: $DB_DATABASE ==="
BACKUP_FILE="$BACKUP_DIR/${DB_DATABASE}_${TIMESTAMP}.sql.gz"

PGPASSWORD="${DB_PASSWORD}" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USERNAME" \
  -d "$DB_DATABASE" \
  --clean \
  --if-exists \
  | gzip > "$BACKUP_FILE"

echo "Backup saved to: $BACKUP_FILE"

echo "=== Cleaning backups older than $RETENTION_DAYS days ==="
find "$BACKUP_DIR" -name "${DB_DATABASE}_*.sql.gz" -type f -mtime "+$RETENTION_DAYS" -delete

echo "=== Backup complete ==="
