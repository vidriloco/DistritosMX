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
#   ./deploy-production.sh --seed-hazards re-download the Atlas de Riesgos layers
#                                      behind "Terreno y clima" (otherwise only
#                                      fetched when the hazards volume is empty)
#   ./deploy-production.sh --seed-foot-traffic re-download the foot-traffic file
#                                      behind the /negocios hourly chart from S3
#                                      (otherwise only when the volume lacks it)
#   ./deploy-production.sh --seed-scores recompute the Índice de habitabilidad per
#                                      AGEB and colonia (otherwise only when the
#                                      table is empty; the admin can also rerun it)
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
SEED_HAZARDS=false
SEED_SCORES=false
SEED_FOOT_TRAFFIC=false
for arg in "$@"; do
    case "$arg" in
        --pull) PULL=true ;;
        --seed) SEED=true ;;
        --seed-fgj) SEED_FGJ=true ;;
        --seed-denue) SEED_DENUE=true ;;
        --seed-hazards) SEED_HAZARDS=true ;;
        --seed-scores) SEED_SCORES=true ;;
        --seed-foot-traffic) SEED_FOOT_TRAFFIC=true ;;
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

# Opine's questions and options (ordena.laciudad.mx) live in
# geodjango/consulta/content/pozmvm.json; this refreshes the tables from it.
echo "==> Loading the POZMVM consultation content..."
$COMPOSE exec -T app bash -c "cd geodjango && python3 manage.py load_content"

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

# "Terreno y clima" in the /negocios report reads GeoParquet files built from
# the Atlas de Riesgos CDMX, kept in the `hazards` volume rather than in
# PostGIS. Without them the report just leaves the block out, silently, so the
# first deploy onto a new volume fetches them. Refresh with --seed-hazards
# when the Atlas publishes a new year (and its layer ids are in hazards.py).
# A network hiccup on the Atlas side must not fail an otherwise good deploy.
if [ "$SEED_HAZARDS" = true ] || ! $COMPOSE exec -T app test -f geodjango/data/hazards/ageb_hazards.parquet; then
    echo "==> Downloading the Atlas de Riesgos layers (Terreno y clima, ~3MB, a minute or two)..."
    $COMPOSE exec -T app bash -c "cd geodjango && python3 manage.py build_hazards" || \
        echo "WARNING: could not build the hazard layers; Terreno y clima stays as it was. Retry with --seed-hazards." >&2
fi

# The hourly foot-traffic chart in the /negocios report reads one GeoParquet
# file built from licensed Veraset pings by `manage.py build_foot_traffic`. It
# cannot be built here (the pings never leave the laptop) and is gitignored, so
# its master copy lives in the private distritosmx-data bucket and lands in the
# `foot_traffic` volume. Without it the report hides the chart without a word,
# hence the loud warning. The key is read-only and passed to this one command
# only: the app's own AWS_* variables switch django-storages on and stay unset.
# Refresh with --seed-foot-traffic after uploading a new build:
#   aws s3 cp geodjango/data/foot_traffic/foot_traffic.parquet s3://distritosmx-data/foot_traffic/
FOOT_TRAFFIC_S3_URI="${FOOT_TRAFFIC_S3_URI:-s3://distritosmx-data/foot_traffic/foot_traffic.parquet}"
if [ "$SEED_FOOT_TRAFFIC" = true ] || ! $COMPOSE exec -T app test -f geodjango/data/foot_traffic/foot_traffic.parquet; then
    if [ -z "${FOOT_TRAFFIC_AWS_ACCESS_KEY_ID:-}" ] || [ -z "${FOOT_TRAFFIC_AWS_SECRET_ACCESS_KEY:-}" ]; then
        echo "WARNING: no foot-traffic file and no FOOT_TRAFFIC_AWS_* key in $ENV_FILE; the /negocios hourly chart stays hidden." >&2
    else
        echo "==> Downloading the foot-traffic file from ${FOOT_TRAFFIC_S3_URI}..."
        $COMPOSE exec -T \
            -e AWS_ACCESS_KEY_ID="$FOOT_TRAFFIC_AWS_ACCESS_KEY_ID" \
            -e AWS_SECRET_ACCESS_KEY="$FOOT_TRAFFIC_AWS_SECRET_ACCESS_KEY" \
            -e AWS_DEFAULT_REGION="${FOOT_TRAFFIC_AWS_REGION:-us-east-2}" \
            -e FOOT_TRAFFIC_S3_URI="$FOOT_TRAFFIC_S3_URI" \
            app python3 - <<'PY' || echo "WARNING: could not download the foot-traffic file; the chart keeps the previous one, if any. Retry with --seed-foot-traffic." >&2
import os, boto3
bucket, key = os.environ["FOOT_TRAFFIC_S3_URI"][len("s3://"):].split("/", 1)
target = "geodjango/data/foot_traffic/foot_traffic.parquet"
os.makedirs(os.path.dirname(target), exist_ok=True)
# Into a temporary name first, so a request never reads a half-written file.
boto3.client("s3").download_file(bucket, key, target + ".tmp")
os.replace(target + ".tmp", target)
print(f"    -> {target} ({os.path.getsize(target) // 1024} KB)")
PY
    fi
fi

# The Índice de habitabilidad (AreaScore) is computed from what the seeds above
# load plus the Atlas files, so it runs after them: on request, after any seed,
# or when the table is still empty. It downloads the Censo 2020 AGEB table from
# INEGI itself (~45MB) and takes a few minutes. Like the hazards, a failure
# here leaves the previous scores in place rather than failing the deploy.
SCORES_EMPTY="$($COMPOSE exec -T app bash -c "cd geodjango && python3 manage.py shell -c 'from world.models import AreaScore; print(AreaScore.objects.exists())'" 2>/dev/null | tail -1 | tr -d '\r')"
if [ "$SEED_SCORES" = true ] || [ "$SEED" = true ] || [ "$SEED_DENUE" = true ] || [ "$SEED_FGJ" = true ] || [ "$SCORES_EMPTY" = "False" ]; then
    echo "==> Computing the Índice de habitabilidad per AGEB and colonia (a few minutes)..."
    $COMPOSE exec -T app bash -c "cd geodjango && python3 manage.py build_area_scores" || \
        echo "WARNING: could not compute the index; the previous scores stay. See Admin > Cálculos del índice." >&2
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
# ordena (¿Qué opinas?) and despojos are their own host configs in hosts.py, so the
# main site answering says nothing about them. ordena is checked on its API too:
# an empty topic list means load_content did not run.
BASE_DOMAIN="${HOST_HEADER#www.}"
for sub in ordena despojos; do
    if curl -fsS -o /dev/null --max-time 10 -H "Host: ${sub}.${BASE_DOMAIN}" "http://127.0.0.1:${PORT}/"; then
        echo "${sub}.${BASE_DOMAIN} is responding."
    else
        echo "WARNING: ${sub}.${BASE_DOMAIN} is not responding. Check: $COMPOSE logs app" >&2
    fi
done
if curl -fsS --max-time 10 -H "Host: ordena.${BASE_DOMAIN}" "http://127.0.0.1:${PORT}/api/areas/" | grep -q '"slug"'; then
    echo "ordena.${BASE_DOMAIN} has its consultation topics."
else
    echo "WARNING: ordena.${BASE_DOMAIN}/api/areas/ has no topics. Run: $COMPOSE exec app bash -c 'cd geodjango && python3 manage.py load_content'" >&2
fi

echo
echo "Done. Logs: $COMPOSE logs -f app"
