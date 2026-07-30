#!/usr/bin/env bash
#
# Local deployment: builds and starts the app + PostGIS via docker compose,
# restores the git-tracked data directories if missing, runs migrations and
# (optionally) seeds the database with the datasets available in the repo.
#
# Usage:
#   ./deploy-local.sh                 build, start, migrate
#   ./deploy-local.sh --seed          also ingest the datasets tracked in git
#   ./deploy-local.sh --seed-fgj      also download + ingest the FGJ carpetas de
#                                     investigacion dataset (felonies, despojos, etc.)
#   ./deploy-local.sh --superuser     also create a Django superuser (interactive)
#   ./deploy-local.sh --fresh         drop containers and start from a clean DB
#
set -euo pipefail
cd "$(dirname "$0")"

COMPOSE="docker compose"
DB_USER="wikirootcito"
DB_NAME="wikiando_db"

# Accumulated FGJ "carpetas de investigacion" open-data CSV (2016-present, ~560MB).
# Feeds the Felony model used by risks_felonies_load, including the
# despojos-viviendas map layer.
FGJ_CSV="geodjango/data/fgj/carpetas.csv"
FGJ_URL="https://archivo.datos.cdmx.gob.mx/FGJ/carpetas/carpetasFGJ_acumulado_2025_01.csv"

SEED=false
SEED_FGJ=false
SUPERUSER=false
FRESH=false
for arg in "$@"; do
    case "$arg" in
        --seed) SEED=true ;;
        --seed-fgj) SEED_FGJ=true ;;
        --superuser) SUPERUSER=true ;;
        --fresh) FRESH=true ;;
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

# The data directories are tracked in git but ignored for new files; restore
# them if they are missing from the working tree.
if [ ! -d geodjango/data ] || [ ! -f data/polygons.geojson ]; then
    echo "==> Restoring data directories from git..."
    git checkout -- data geodjango/data
fi

if [ "$FRESH" = true ]; then
    echo "==> Removing existing containers and volumes..."
    $COMPOSE down -v
fi

echo "==> Building images..."
$COMPOSE build

echo "==> Starting database..."
$COMPOSE up -d db
echo "==> Waiting for PostGIS to accept connections..."
for i in $(seq 1 30); do
    if $COMPOSE exec -T db pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo "Database did not become ready in time." >&2
        exit 1
    fi
    sleep 2
done

echo "==> Starting app..."
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
    cat <<'EOF'
NOTE: the following ingestion steps were SKIPPED because their input files are
not tracked in git (see README "Prepare AGEB and DENUE data") and must be
placed in geodjango/data/ manually before running them:
  - risks_felonies_load                (use --seed-fgj to fetch + run this one)
  - geo_area_update_from_felonies       (run manually once felonies are loaded)
  - import_denue_cities                (needs data/denue/<city>.csv)
  - ageb_update_from_denues
  - ageb_update_motor_data
  - import_airbnb_listings             (needs data/airbnbs/cdmx.csv)
EOF
fi

if [ "$SEED_FGJ" = true ]; then
    echo "==> Seeding FGJ carpetas de investigacion (felonies, despojos, etc.)..."
    download_fgj_carpetas
    $COMPOSE exec -T app bash -c "cd geodjango && python3 manage.py risks_felonies_load"
    echo "--> warming the despojos map cache"
    $COMPOSE exec -T app bash -c "cd geodjango && python3 manage.py despojos_warm_cache"
    echo "NOTE: run 'geo_area_update_from_felonies' manually if you also want"
    echo "AGEB/neighbourhood/municipality aggregates updated from this data."
fi

if [ "$SUPERUSER" = true ]; then
    echo "==> Creating superuser..."
    $COMPOSE exec app bash -c "cd geodjango && python3 manage.py createsuperuser"
fi

echo
echo "Done. App running at http://localhost:8110"
echo "Logs: docker compose logs -f app"
