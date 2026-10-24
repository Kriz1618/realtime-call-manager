#!/usr/bin/env bash
set -euo pipefail
set -a; source .env; set +a

docker compose exec -T postgres psql -U "$POSTGRES_USER" -d postgres -tc \
  "select 1 from pg_database where datname = 'rcm_test'" | grep -q 1 \
  || docker compose exec -T postgres psql -U "$POSTGRES_USER" -d postgres -c "create database rcm_test"

DATABASE_URL="$DATABASE_URL_TEST" pnpm --filter api exec prisma migrate deploy
