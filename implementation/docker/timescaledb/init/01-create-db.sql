-- This file is executed once during first database initialization.
-- For existing volumes, run manually:
--   docker compose exec timescaledb createdb -U monitor monitoring
--   docker compose exec timescaledb psql -U monitor -d monitoring -c "CREATE EXTENSION IF NOT EXISTS timescaledb"

-- The database is usually created by POSTGRES_DB env var, but
-- this init script ensures it exists even if env var is missing.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'monitoring') THEN
    PERFORM dblink_exec('dbname=postgres', 'CREATE DATABASE monitoring');
    RAISE NOTICE 'Created monitoring database via init script';
  END IF;
END
$$;

\c monitoring
CREATE EXTENSION IF NOT EXISTS timescaledb;
