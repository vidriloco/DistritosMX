#!/usr/bin/env bash
#
# Production deployment: run this ON the server, from the repo root.
# Uses docker-compose.prod.yaml (gunicorn, no source bind-mount, persistent
# DB volume) with secrets read from .env.production.
#
# Usage:
#   ./deploy-production.sh            build, start/restart, migrate
#   ./deploy-production.sh --pull     git pull before building
#   ./deploy-production.sh --seed     ingest the datasets tracked in git
#   ./deploy-production.sh --seed-fgj also download + ingest the FGJ carpetas de
#                                      investigacion dataset (felonies, despojos, etc.)
#   ./deploy-production.sh --seed-denue also download + ingest the INEGI DENUE
#                                      business registry (powers /negocios)
#
set -euo pipefail
cd "$(dirname "$0")"

ENV_FILE=".env.production"
COMPOSE="docker compose --env-file $ENV_FILE -f docker-compose.prod.yaml"

# Accumulated FGJ "carpetas de investigacion" open-data CSV (2016-present, ~560MB).
# Must be downloaded BEFORE `build`, since prod bakes the repo into the image
# (no source bind-mount) rather than mounting it live.
FGJ_CSV="geodjango/data/fgj/carpetas.csv"
FGJ_URL="https://archivo.datos.cdmx.gob.mx/FGJ/carpetas/carpetasFGJ_acumulado_2025_01.csv"

# INEGI DENUE, the national business registry (~120MB zipped, ~1M rows across
# the three files). Feeds DenueRecord, which is what the /negocios wizard reads
# for its category autocomplete and its per-radius business stats. Like the FGJ
# CSV, it must be on disk BEFORE `build`, since prod bakes the repo into the
# image. INEGI splits Mexico state in two; 09 = CDMX, 15 = Mexico state.
DENUE_DIR="geodjango/data/denue"
DENUE_BASE_URL="https://www.inegi.org.mx/contenidos/masiva/denue"
DENUE_PARTS=(
    "cdmx:denue_09_csv"
    "edomex1:denue_15_1_csv"
    "edomex2:denue_15_2_csv"
)

PULL=false
SEED=false
SEED_FGJ=false
SEED_DENUE=false
for arg in "$@"; do
    case "$arg" in
        --pull) PULL=true ;;
        --seed) SEED=true ;;
        --seed-fgj) SEED_FGJ=true ;;
        --seed-denue) SEED_DENUE=true ;;
        *) echo "Unknown option: $arg" >&2; exit 1 ;;
    esac
done

download_fgj_carpetas() {
    if [ -f "$FGJ_CSV" ]; then
        echo "==> $FGJ_CSV already present, skipping download."
        return
    fi
    echo "==> Downloading FGJ carpetas de investigacion dataset (~560MB, 2016-present)..."
    mkdir -p "$(dirname "$FGJ_CSV")"
    curl -fL --progress-bar -o "${FGJ_CSV}.tmp" "$FGJ_URL"
    mv "${FGJ_CSV}.tmp" "$FGJ_CSV"
}

download_denue() {
    if ! command -v unzip >/dev/null 2>&1; then
        echo "unzip is required to unpack the DENUE downloads. Install it and retry." >&2
        exit 1
    fi
    mkdir -p "$DENUE_DIR"

    for part in "${DENUE_PARTS[@]}"; do
        local city="${part%%:*}"
        local slug="${part##*:}"
        local target="${DENUE_DIR}/${city}.csv"

        if [ -f "$target" ]; then
            echo "==> $target already present, skipping download."
            continue
        fi

        echo "==> Downloading DENUE ${city} (${slug}.zip) from INEGI..."
        local tmpdir
        tmpdir="$(mktemp -d)"
        # Cleaned up on any exit path, including a failed curl under `set -e`.
        trap 'rm -rf "$tmpdir"' RETURN

        curl -fL --progress-bar -o "${tmpdir}/denue.zip" "${DENUE_BASE_URL}/${slug}.zip"

        # The payload sits under conjunto_de_datos/ and its filename encodes
        # INEGI's own numbering, so it is globbed rather than named.
        unzip -o -q -j "${tmpdir}/denue.zip" "conjunto_de_datos/*.csv" -d "$tmpdir"
        local extracted
        extracted="$(find "$tmpdir" -maxdepth 1 -name '*.csv' | head -1)"
        if [ -z "$extracted" ]; then
            echo "No CSV found inside ${slug}.zip — INEGI may have changed the layout." >&2
            exit 1
        fi
        mv "$extracted" "$target"
        echo "    -> $target ($(du -h "$target" | cut -f1))"
    done
}

if [ ! -f "$ENV_FILE" ]; then
    echo "Missing $ENV_FILE. Copy .env.production.example to $ENV_FILE and fill it in." >&2
    exit 1
fi
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

if [ "$PULL" = true ]; then
    echo "==> Pulling latest code..."
    # Skip the LFS smudge filter. The only file still in LFS is a 94MB design
    # asset that the server never opens and .dockerignore excludes anyway, so
    # letting git try to fetch it means a deploy that dies on "Bad credentials"
    # for something the app does not use. Everything the app needs at runtime is
    # a normal git object.
    GIT_LFS_SKIP_SMUDGE=1 git pull --ff-only
fi

# Only `data/polygons.geojson` is in git. `geodjango/data/` is NOT — it is
# gitignored, so `git checkout` can never restore it and asking it to just
# produces a fatal pathspec error on a fresh clone. The directory is created
# empty so the FGJ and DENUE downloads have somewhere to land; everything else
# under it has to be copied onto the server by hand.
mkdir -p geodjango/data
if [ ! -f data/polygons.geojson ]; then
    if git cat-file -e HEAD:data/polygons.geojson 2>/dev/null; then
        echo "==> Restoring data/polygons.geojson from git..."
        git checkout -- data/polygons.geojson
    else
        echo "WARNING: data/polygons.geojson is missing and not in this commit." >&2
    fi
fi

if [ "$SEED_FGJ" = true ]; then
    download_fgj_carpetas
fi

if [ "$SEED_DENUE" = true ]; then
    download_denue
fi

echo "==> Building image..."
$COMPOSE build

echo "==> Starting database..."
$COMPOSE up -d db
echo "==> Waiting for PostGIS to accept connections..."
for i in $(seq 1 30); do
    if $COMPOSE exec -T db pg_isready -U "${DB_USER:-wikirootcito}" -d "${DB_NAME:-wikiando_db}" >/dev/null 2>&1; then
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo "Database did not become ready in time." >&2
        exit 1
    fi
    sleep 2
done

echo "==> Starting app (collectstatic runs on container start)..."
$COMPOSE up -d app

echo "==> Verifying the app is really in production mode..."
# The container command starts gunicorn regardless, so a misconfigured DEBUG
# would only show up as tracebacks on a public page. Asked of the running
# process rather than of the compose file, which is the thing that can lie.
MODE="$($COMPOSE exec -T app bash -c "cd geodjango && python3 -c \"
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'geodjango.settings')
django.setup()
from django.conf import settings
print('DEBUG=%s|HOSTS=%s|CSRF=%s' % (
    settings.DEBUG, ','.join(settings.ALLOWED_HOSTS), ','.join(settings.CSRF_TRUSTED_ORIGINS)))
\"" | tr -d '\r')"
echo "    $MODE"
case "$MODE" in
    DEBUG=False*) ;;
    *) echo "REFUSING TO CONTINUE: the app is running with DEBUG on. Check DJANGO_DEBUG in $ENV_FILE and docker-compose.prod.yaml." >&2
       exit 1 ;;
esac

echo "==> Running migrations..."
$COMPOSE exec -T app bash -c "cd geodjango && python3 manage.py migrate --noinput"

echo "==> Preparing static assets..."
# The container command already runs this on start; repeating it here makes a
# failure visible in the deploy output instead of only in a restart loop, and
# --clear drops files deleted from the source tree, which a plain collectstatic
# leaves behind forever.
$COMPOSE exec -T app bash -c "cd geodjango && python3 manage.py collectstatic --noinput --clear" | tail -3

# ...and then the app has to come back. WhiteNoise reads every file's size and
# ETag once, at startup, and serves from that index forever after. The line
# above deletes the tree it indexed and writes a new one underneath it, so
# without this restart it keeps answering with the old sizes: a file that grew
# is delivered truncated at its previous length, which reaches the browser as a
# syntax error partway through a line. Restarting re-runs collectstatic — by
# then a no-op — and rebuilds the index against what is actually on disk.
echo "==> Restarting app so it re-reads the static files..."
$COMPOSE restart app

# `restart` returns when the container is running, not when the app inside it
# is. Coming back up means collectstatic over ~660 files and then gunicorn
# booting its workers, which is comfortably longer than the health check's
# patience — and the cache warm-up in between would otherwise be racing it too.
PORT="${APP_PORT:-8000}"
HOST_HEADER="$(echo "${DJANGO_ALLOWED_HOSTS:-localhost}" | cut -d, -f1)"
HOST_HEADER="${HOST_HEADER#.}"
for i in $(seq 1 45); do
    if curl -fsS -o /dev/null --max-time 5 -H "Host: ${HOST_HEADER}" "http://127.0.0.1:${PORT}/" 2>/dev/null; then
        echo "    app is back after ${i}s."
        break
    fi
    if [ "$i" -eq 45 ]; then
        echo "    app has not answered in 45s; continuing anyway — see the health check below." >&2
    fi
    sleep 1
done

if [ "$SEED" = true ]; then
    # Every command below reads from geodjango/data/, which is not in git. On a
    # fresh server it is empty, and `set -e` would otherwise kill the deploy on
    # the first command with a traceback instead of an explanation.
    if [ -z "$(ls -A geodjango/data 2>/dev/null)" ]; then
        echo "Cannot --seed: geodjango/data/ is empty and is not tracked in git." >&2
        echo "Copy it onto the server first, or use --seed-fgj / --seed-denue," >&2
        echo "which download their own inputs." >&2
        exit 1
    fi
    echo "==> Seeding database with datasets tracked in the repo..."
    for cmd in \
        "geo_area_import --area-type ageb" \
        "ageb_update_population" \
        "import_kei_data" \
        "avatar_images_ingest" \
        "transports_load --data-dir data/systems/organized/"
    do
        echo "--> manage.py $cmd"
        $COMPOSE exec -T app bash -c "cd geodjango && python3 manage.py $cmd"
    done
    echo "NOTE: Airbnb ingestion skipped — its input file is not in git. See"
    echo "README 'Prepare AGEB and DENUE data' and place it under"
    echo "geodjango/data/ before running that command manually."
    echo "DENUE is handled by --seed-denue, felonies by --seed-fgj."
fi

if [ "$SEED_DENUE" = true ]; then
    echo "==> Seeding DENUE business registry (powers the /negocios wizard)..."
    # ~1M rows: minutes, not seconds. Files were downloaded before the build.
    $COMPOSE exec -T app bash -c "cd geodjango && python3 manage.py import_denue_cities"
fi

if [ "$SEED_FGJ" = true ]; then
    echo "==> Seeding FGJ carpetas de investigacion (felonies, despojos, etc.)..."
    $COMPOSE exec -T app bash -c "cd geodjango && python3 manage.py risks_felonies_load"
    echo "--> warming the despojos map cache"
    $COMPOSE exec -T app bash -c "cd geodjango && python3 manage.py despojos_warm_cache"
    echo "NOTE: run 'geo_area_update_from_felonies' manually if you also want"
    echo "AGEB/neighbourhood/municipality aggregates updated from this data."
fi

# The despojos map caches full-table scans for 12 hours in a file cache that
# survives restarts. Any deploy that changed the data — a seed, a restore, a
# migration — leaves it stale, and a cache warmed against an empty table shows
# "0 carpetas" for half a day. Cheap to redo, so it is unconditional.
echo "==> Rebuilding the despojos map cache..."
$COMPOSE exec -T app bash -c "cd geodjango && python3 manage.py despojos_warm_cache" || \
    echo "WARNING: could not warm the despojos cache." >&2

echo "==> Health check..."
# PORT and HOST_HEADER are set by the wait loop after the restart above. With
# DEBUG=false Django rejects Host: 127.0.0.1, hence the allowed host.
if curl -fsS -o /dev/null --max-time 10 -H "Host: ${HOST_HEADER}" "http://127.0.0.1:${PORT}/"; then
    echo "App is responding on port ${PORT}."
else
    echo "WARNING: app is not responding yet on port ${PORT}. Check: $COMPOSE logs app" >&2
fi

echo
echo "Done. Logs: $COMPOSE logs -f app"
