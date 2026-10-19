#!/usr/bin/env bash
# Applies the migrations to a throwaway Postgres database and runs the
# security tests in supabase/tests. Needs psql and a Postgres server; set
# DATABASE_URL to point at one (default: local postgres user).
set -euo pipefail
cd "$(dirname "$0")/.."

ADMIN_URL="${DATABASE_URL:-postgresql://postgres@localhost:5432/postgres}"
DB="peerpop_test_$$"
psql_admin() { psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -q "$@"; }
TEST_URL="${ADMIN_URL%/*}/$DB"

psql_admin -c "create database $DB"
trap 'psql_admin -c "drop database if exists $DB with (force)" >/dev/null' EXIT

run() { psql "$TEST_URL" -v ON_ERROR_STOP=1 -q -o /dev/null -f "$1"; }
run supabase/tests/00_supabase_stub.sql
for f in supabase/migrations/*.sql; do run "$f"; done
for f in supabase/tests/[1-9]*.sql; do echo "== $f"; run "$f"; done
echo "All database tests passed."
