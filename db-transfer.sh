#!/usr/bin/env bash
#
# Dump and restore the whole database.
#
# Usage:
#   ./db-transfer.sh dump                      dump local  -> ./dumps/<db>-<stamp>.dump
#   ./db-transfer.sh dump --prod               dump production
#   ./db-transfer.sh dump --out FILE           write somewhere specific
#
#   ./db-transfer.sh restore FILE              restore into local
#   ./db-transfer.sh restore FILE --prod       restore into production
#   ./db-transfer.sh restore FILE --db NAME    restore into another database
#   ./db-transfer.sh restore FILE --yes        skip the confirmation prompt
#
# The dump is everything: every schema, every table, PostGIS included, in
# PostgreSQL's compressed custom format. Restore DROPS the target database and
# recreates it, so what you get back is exactly what you dumped.
#
# The dump contains personal data — despojo case reports written by crime
# victims, contact leads, and Django password hashes. Treat the file as a
# secret: ./dumps/ is gitignored, keep it off shared drives, delete it when the
# transfer is done.
#
set -euo pipefail
cd "$(dirname "$0")"

ACTION="${1:-}"
shift || true

PROD=false
OUT=""
TARGET_DB=""
ASSUME_YES=false
FILE=""

for arg in "$@"; do
    case "$arg" in
        --prod) PROD=true ;;
        --yes|-y) ASSUME_YES=true ;;
        --out) OUT="__next__" ;;
        --db) TARGET_DB="__next__" ;;
        *)
            if [ "$OUT" = "__next__" ]; then OUT="$arg"
            elif [ "$TARGET_DB" = "__next__" ]; then TARGET_DB="$arg"
            elif [ -z "$FILE" ]; then FILE="$arg"
            else echo "Unexpected argument: $arg" >&2; exit 1
            fi ;;
    esac
done

if [ "$PROD" = true ]; then
    ENV_FILE=".env.production"
    [ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE." >&2; exit 1; }
    # shellcheck disable=SC1090
    set -a; source "$ENV_FILE"; set +a
    COMPOSE="docker compose --env-file $ENV_FILE -f docker-compose.prod.yaml"
    WHERE="PRODUCTION"
else
    COMPOSE="docker compose"
    WHERE="local"
fi

DB_USER="${DB_USER:-wikirootcito}"
DB_NAME="${DB_NAME:-wikiando_db}"
TARGET_DB="${TARGET_DB:-$DB_NAME}"
[ "$TARGET_DB" = "__next__" ] && { echo "--db needs a database name." >&2; exit 1; }
[ "$OUT" = "__next__" ] && { echo "--out needs a file path." >&2; exit 1; }

# Every psql/pg_dump call goes through the db service, so nothing needs Postgres
# installed on the host.
db() { $COMPOSE exec -T db "$@"; }

case "$ACTION" in
dump)
    if [ -z "$OUT" ]; then
        mkdir -p dumps
        OUT="dumps/${DB_NAME}-$(date +%Y%m%d-%H%M%S).dump"
    fi
    mkdir -p "$(dirname "$OUT")"

    echo "==> Dumping $WHERE database '$DB_NAME' -> $OUT"
    echo "    (this is the full database; expect a few minutes and a large file)"
    # -Fc: custom format, compressed, restorable with pg_restore.
    # --no-owner/--no-privileges: the roles differ between machines, and without
    # these the restore fails on every GRANT to a role that does not exist there.
    # Written to a temp name first so an interrupted dump cannot be mistaken for
    # a complete one.
    db pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc --no-owner --no-privileges > "${OUT}.part"
    mv "${OUT}.part" "$OUT"

    echo
    echo "Done: $OUT ($(du -h "$OUT" | cut -f1))"
    # Read the table of contents back through the container: the host is not
    # required to have the Postgres client tools installed, and asking it to
    # silently reported "0 tables" for a perfectly good dump.
    echo "    $(db pg_restore --list < "$OUT" | grep -c 'TABLE DATA') tables with data"
    echo
    echo "Copy it to the server with something like:"
    echo "    scp \"$OUT\" user@server:/path/to/DistritosMX/dumps/"
    ;;

restore)
    [ -n "$FILE" ] || { echo "Usage: ./db-transfer.sh restore FILE [--prod] [--db NAME] [--yes]" >&2; exit 1; }
    [ -f "$FILE" ] || { echo "No such file: $FILE" >&2; exit 1; }

    echo "About to restore into the $WHERE database '$TARGET_DB'."
    echo "  source : $FILE ($(du -h "$FILE" | cut -f1))"
    echo "  THIS DROPS '$TARGET_DB' AND EVERYTHING IN IT, then recreates it."
    if [ "$ASSUME_YES" != true ]; then
        printf "Type the database name to confirm: "
        read -r reply
        [ "$reply" = "$TARGET_DB" ] || { echo "Aborted." >&2; exit 1; }
    fi

    echo "==> Dropping and recreating '$TARGET_DB'..."
    # Connect through the maintenance database, since you cannot drop the
    # database you are connected to. Existing sessions are kicked first —
    # gunicorn holds pooled connections and would otherwise block the DROP.
    db psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
          WHERE datname = '$TARGET_DB' AND pid <> pg_backend_pid();" >/dev/null
    db psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$TARGET_DB\";"
    db psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$TARGET_DB\" OWNER \"$DB_USER\";"

    echo "==> Restoring (this takes a while for a full database)..."
    # --exit-on-error is deliberately NOT set: a dump taken from a database whose
    # PostGIS extension was created by a different superuser emits a handful of
    # harmless "already exists"/permission notices for extension-owned objects.
    # The summary below is what tells you whether the data actually landed.
    if db pg_restore -U "$DB_USER" -d "$TARGET_DB" --no-owner --no-privileges < "$FILE"; then
        echo "    pg_restore finished cleanly."
    else
        echo "    pg_restore reported warnings (usually PostGIS extension objects)." >&2
    fi

    echo
    echo "==> Verifying..."
    db psql -U "$DB_USER" -d "$TARGET_DB" -c "
        SELECT relname AS tabla, to_char(n_live_tup,'FM999,999,999') AS filas
          FROM pg_stat_user_tables
         WHERE schemaname = 'public' AND n_live_tup > 0
         ORDER BY n_live_tup DESC LIMIT 10;"
    echo "Restored into '$TARGET_DB' on $WHERE."
    echo "If this was production, restart the app so it drops stale connections:"
    echo "    $COMPOSE restart app"
    ;;

*)
    sed -n '3,20p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
