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
#   ./deploy-local.sh --seed-denue    also download + ingest the INEGI DENUE
#                                     business registry (powers /negocios)
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

# INEGI DENUE, the national business registry (~120MB zipped, ~1M rows across
# the three files). Feeds DenueRecord, which is what the /negocios wizard reads
# for its category autocomplete and its per-radius business stats.
# INEGI splits Mexico state in two; the local names match the stems
# import_denue_cities expects. Entity codes: 09 = CDMX, 15 = Mexico state.
DENUE_DIR="geodjango/data/denue"
DENUE_BASE_URL="https://www.inegi.org.mx/contenidos/masiva/denue"
DENUE_PARTS=(
    "cdmx:denue_09_csv"
    "edomex1:denue_15_1_csv"
    "edomex2:denue_15_2_csv"
)

SEED=false
SEED_FGJ=false
SEED_DENUE=false
SUPERUSER=false
FRESH=false
for arg in "$@"; do
    case "$arg" in
        --seed) SEED=true ;;
        --seed-fgj) SEED_FGJ=true ;;
        --seed-denue) SEED_DENUE=true ;;
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
    cat <<'EOF'
NOTE: the following ingestion steps were SKIPPED because their input files are
not tracked in git (see README "Prepare AGEB and DENUE data") and must be
placed in geodjango/data/ manually before running them:
  - risks_felonies_load                (use --seed-fgj to fetch + run this one)
  - geo_area_update_from_felonies       (run manually once felonies are loaded)
  - import_denue_cities                (use --seed-denue to fetch + run this one)
  - ageb_update_motor_data
  - import_airbnb_listings             (needs data/airbnbs/cdmx.csv)
EOF
fi

if [ "$SEED_DENUE" = true ]; then
    echo "==> Seeding DENUE business registry (powers the /negocios wizard)..."
    download_denue
    # ~1M rows: minutes, not seconds.
    $COMPOSE exec -T app bash -c "cd geodjango && python3 manage.py import_denue_cities"
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
