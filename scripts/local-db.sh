#!/usr/bin/env bash
# Isolated local Postgres for development and tests (port 54329, data in .local/pg).
#   npm run db:local -- start|stop|status|reset-test
set -euo pipefail
cd "$(dirname "$0")/.."
PGBIN="$(dirname "$(command -v pg_ctl || command -v psql)")"
DATA=.local/pg
PORT=54329
case "${1:-status}" in
  start)
    if [ ! -d "$DATA" ]; then
      mkdir -p .local
      "$PGBIN/initdb" -D "$DATA" -U shabari --auth=trust -E UTF8 --locale=C >/dev/null
      printf "port = %s\nlisten_addresses = '127.0.0.1'\nunix_socket_directories = ''\n" "$PORT" >> "$DATA/postgresql.conf"
    fi
    "$PGBIN/pg_ctl" -D "$DATA" -l .local/pg.log -w status >/dev/null 2>&1 || "$PGBIN/pg_ctl" -D "$DATA" -l .local/pg.log -w start
    for db in sws_dev sws_test; do
      "$PGBIN/psql" -h 127.0.0.1 -p "$PORT" -U shabari -d postgres -tAc "select 1 from pg_database where datname='$db'" | grep -q 1 \
        || "$PGBIN/psql" -h 127.0.0.1 -p "$PORT" -U shabari -d postgres -c "create database $db" >/dev/null
    done
    echo "postgres on 127.0.0.1:$PORT (sws_dev, sws_test)";;
  stop) "$PGBIN/pg_ctl" -D "$DATA" -w stop;;
  status) "$PGBIN/pg_ctl" -D "$DATA" status;;
  *) echo "usage: $0 start|stop|status" >&2; exit 2;;
esac
