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
    git pull --ff-only
fi

# The data directories are tracked in git but ignored for new files; restore
# them if missing so they get baked into the image for seeding.
if [ ! -d geodjango/data ] || [ ! -f data/polygons.geojson ]; then
    echo "==> Restoring data directories from git..."
    git checkout -- data geodjango/data
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

echo "==> Running migrations..."
$COMPOSE exec -T app bash -c "cd geodjango && python3 manage.py migrate --noinput"

if [ "$SEED" = true ]; then
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

echo "==> Health check..."
sleep 3
PORT="${APP_PORT:-8000}"
# With DEBUG=false Django rejects Host: 127.0.0.1, so present an allowed host
HOST_HEADER="$(echo "${DJANGO_ALLOWED_HOSTS:-localhost}" | cut -d, -f1)"
HOST_HEADER="${HOST_HEADER#.}"
if curl -fsS -o /dev/null --max-time 10 -H "Host: ${HOST_HEADER}" "http://127.0.0.1:${PORT}/"; then
    echo "App is responding on port ${PORT}."
else
    echo "WARNING: app is not responding yet on port ${PORT}. Check: $COMPOSE logs app" >&2
fi

echo
echo "Done. Logs: $COMPOSE logs -f app"
