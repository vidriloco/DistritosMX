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

PULL=false
SEED=false
SEED_FGJ=false
for arg in "$@"; do
    case "$arg" in
        --pull) PULL=true ;;
        --seed) SEED=true ;;
        --seed-fgj) SEED_FGJ=true ;;
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
    echo "NOTE: DENUE/Airbnb ingestion skipped — their input files are not in"
    echo "git. See README 'Prepare AGEB and DENUE data' and place the files"
    echo "under geodjango/data/ before running those commands manually."
    echo "Felonies (risks_felonies_load) are handled by --seed-fgj instead."
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
