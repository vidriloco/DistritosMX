# Pinned to a Debian release that still has a package archive. The previous
# python:3.9.7 image was bullseye, whose security repository stopped serving
# packages, so every rebuild died in apt-get with 404s.
# Opine (ordena.laciudad.mx) is a Vite + React build with its own design. It
# needs a newer Node than Debian's, so it is compiled in its own stage and only
# the static output lands in the app image (served by geodjango/ordena_urls.py).
FROM node:22-bookworm-slim AS ordena
ENV CONTENT_JSON=/content/pozmvm.json
WORKDIR /ordena
COPY ordena/package*.json ./
RUN npm ci
COPY geodjango/consulta/content/pozmvm.json /content/pozmvm.json
COPY ordena/ ./
RUN npm run build

FROM python:3.9-bookworm
ENV PYTHONUNBUFFERED 1

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

RUN apt-get update && \
    apt-get install --no-install-recommends -y \
        build-essential \
        python3-gdal \
        cron

# Node is only needed for uglify-js (manage.py minify). Debian's own package is
# enough; the nodesource Node 16 script is end-of-life.
RUN apt-get install --no-install-recommends -y nodejs npm && \
    npm install -g uglify-js && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt
COPY . ./
COPY --from=ordena /ordena/dist ./ordena/dist
