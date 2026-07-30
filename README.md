# Ciudad Monstruo

### How to deploy

1. Clone this github repo
2. Install Docker
3. Prepare the docker image doing `docker compose build` or `docker-compose build`
4. Make sure the mapping of ports is correct in the `docker-compose.yaml` file
5. Run the docker image by doing: `docker compose up` or `docker-compose up`

If all goes alright, the docker instance should be running. Now, connect to the app server and prepare the database and seed data:

1. By doing `docker ps` you can find the running docker instances
2. Connect to the instance by doing: `docker exec -it <container name> /bin/bash`
3. Run the migrations: `python3 manage.py migrate` from the geodjango directory
4. Import the data from the CSV file: `python3 manage.py loadvictims`
5. Create superuser by doing `python manage.py createsuperuser`



### How to connect with DB

Use this: `psql -h db -U wikirootcito -d wikiando_db`

### How to migrate down

To migrate down to a specific migration, you can use the following command:

```bash
python3 manage.py migrate <app_name> <migration_name>
```

For example:
- To migrate down to migration 0010 in the world app: `python3 manage.py migrate world 0010`
- To migrate down to a specific migration by name: `python3 manage.py migrate world 0002_auto_20230101_1234`

You can also migrate down multiple apps at once:
```bash
python3 manage.py migrate world 0010 users 0005
```

To see all available migrations and their current state:
```bash
python3 manage.py showmigrations world
```

## Execute realtime vehicle update (Metrobus)

Execute the following script to register `python3 manage.py schedule_jobs` the syncing jobs for each one of the lines supported
See more here: https://pypi.org/project/django-apscheduler/

## Panel interno (/dashboard)

`/dashboard` es el panel de trabajo del equipo. Está detrás de la verificación de
sesión del admin (`staff_member_required`): quien no haya iniciado sesión — o no
sea *staff* — se va a `/admin/login/` y regresa aquí después. Crea el usuario con
`python3 manage.py createsuperuser`.

| Página | Qué hace |
| --- | --- |
| `/dashboard/` | Resumen: qué está esperando revisión y qué hizo la última búsqueda. |
| `/dashboard/notas/` | La cola de notas de prensa. Se publican o descartan por lotes, y se puede corregir el titular o el medio antes de publicar. |
| `/dashboard/fuentes/` | Alta y baja de fuentes RSS y de palabras clave. Es donde se controla qué busca el harvester. |
| `/dashboard/ejecuciones/` | La bitácora, con el botón que lanza una búsqueda. |
| `/dashboard/leads/` | Mensajes del formulario de contacto. |
| `/dashboard/reportes/` | Casos enviados desde el mapa de despojos. |

Los reportes de despojo y los leads traen datos personales — en el caso de los
reportes, de víctimas de un delito narrando lo que les pasó. No se publican, no
se dibujan en el mapa y no salen por ningún endpoint público: se leen aquí y se
responden por correo.

Todo lo del panel existe también en el admin de Django, que sigue siendo el
camino para cualquier cosa fuera de este flujo.

## Despojo news rail (proyectos/mapas/despojos-viviendas)

The "En las noticias" rail on the despojos map is fed from RSS. Everything is
managed from `/dashboard`, or from these four tables under *world* in the admin:

| Tabla | Para qué |
| --- | --- |
| **Fuentes de noticias (despojo)** | Los feeds que se leen. Una búsqueda en Google Noticias (escribes los términos) o el RSS propio de un medio. Cada fila guarda cómo le fue en la última lectura. |
| **Palabras clave (despojo)** | Los términos con que se filtra: de *tema* (la nota debe mencionar alguno), de *descarte* (si aparece, se ignora) y de *ciudad* (exigidos a las fuentes que no están acotadas a la CDMX). Acentos y mayúsculas dan igual. |
| **Notas de prensa (despojo)** | La cola de revisión. Lo que se encuentra queda en *Por revisar* y sólo llega al mapa cuando alguien lo publica. |
| **Ejecuciones del buscador (despojo)** | La bitácora: una fila por corrida, con conteos por fuente, errores y el detalle completo. |

**Nada corre en automático.** Una búsqueda se lanza desde el botón *Buscar notas
ahora* en `/dashboard/ejecuciones/`, desde el mismo botón en el admin, desde la
acción *Buscar notas ahora en las fuentes seleccionadas* en Fuentes, o desde la
terminal:

```
python3 manage.py despojo_news_fetch             # últimos 7 días
python3 manage.py despojo_news_fetch --days 30   # una ventana más amplia
python3 manage.py despojo_news_fetch --dry-run   # muestra sin guardar ni registrar
python3 manage.py despojo_news_fetch --feed gnews-despojadores
```

Desde el admin la corrida se hace en segundo plano: la fila aparece *En curso* y
se va llenando: recarga para verla terminar. Una fuente caída se anota en la
bitácora y no tumba el resto de la corrida.

El filtro es a propósito flojo — un falso positivo cuesta un clic y un falso
negativo no se ve nunca — porque `despojo` en español también cubre restos
mortales y conflictos agrarios, y eso es justo lo que la revisión atrapa. El mapa
lee `/api/despojos/news` y cae a `static/data/despojo-news.json` cuando todavía
no hay nada publicado.

Las fuentes que vienen sembradas son búsquedas en Google Noticias, que es lo
único que cubre a la prensa mexicana en conjunto; su desventaja es que los
enlaces apuntan al agregador y no al medio. Agregar el RSS propio de un medio
(tipo *Feed RSS de un medio*) da enlaces directos.

## Prepare AGEB and DENUE data

For this, the following scripts need to be executed: 
+ `python3 manage.py geo_area_import --area-type ageb`
+ `python3 manage.py ageb_update_population`
+ `python3 manage.py risks_felonies_load`
+ `python3 manage.py geo_area_update_from_felonies --year 2020`
+ `python3 manage.py import_kei_data`
+ `python3 manage.py import_denue_cities`
+ `python3 manage.py ageb_update_motor_data`

### DENUE (registro de negocios del INEGI)

`DenueRecord` es lo que alimenta el asistente de `/negocios`: el autocompletado
de categorías del paso 2 se arma con los `codigo_act` distintos de esa tabla, así
que **con la tabla vacía el buscador no encuentra nada aunque escribas bien** —
no da error, simplemente no sugiere.

Los archivos no están en git (`geodjango/data/` está en `.gitignore`), así que
los descargan los scripts de despliegue desde el INEGI:

```
./deploy-local.sh --seed-denue
./deploy-production.sh --seed-denue
```

Baja tres ZIP (~120 MB) y los descomprime en `geodjango/data/denue/` como
`cdmx.csv`, `edomex1.csv` y `edomex2.csv` — el INEGI parte al Estado de México en
dos. Si los archivos ya están, no los vuelve a bajar. Después corre el import,
que tarda unos minutos (~760 mil registros entre CDMX y Edomex).

En producción la descarga ocurre **antes** del `build`, porque esa imagen hornea
el repo en vez de montarlo, igual que con el CSV de la FGJ.

Para correrlo a mano una vez que los CSV están en su lugar:

```
python3 manage.py import_denue_cities                  # los tres archivos
python3 manage.py import_denue_cities --cities cdmx    # sólo uno
python3 manage.py import_denue_cities --keep           # agrega en vez de reemplazar
```

Los CSV del INEGI vienen en ISO-8859-1; el comando detecta la codificación en
lugar de suponerla, porque latin-1 decodifica cualquier cosa sin quejarse y un
archivo UTF-8 acabaría guardado como `PanificaciÃ³n`.

Ojo con la taxonomía: DENUE usa SCIAN, no lenguaje coloquial. Una panadería está
como *Panificación tradicional*, no como *panadería*, así que buscar «panader» no
devuelve nada. El filtro del asistente tampoco ignora acentos, de modo que
«juridico» no encuentra *Bufetes jurídicos*.

## Ingest old AGEB data generated by the ITDP (2014)

In order to import the data from geographic zones any outstanding migrations need to be applied. Execute the following script: `python3 manage.py geo_import`

# For the social data part, you need to:

+ `python3 manage.py avatar_images_ingest`

To import the systems data:

+ `python3 manage.py transports_load --data-dir data/systems/organized/`

To do a backup do:

`sudo docker compose exec db pg_dump -v -U wikirootcito -d wikiando_db > verbose_backup.sql`

Debugging:

To run the interactive shell of Django do the following:

`python manage.py shell` and then `from world.models.felony import Felony` to work with a record model `Felony.objects.count()`

Handy commands:

Get the amount of records in a model `python manage.py shell -c "from world.models import BasicTrip; print(BasicTrip.objects.filter(utc_timestamp__year=2024, utc_timestamp__month=12).count())"`

Veraset processing:

The following commands are to be called when executing the data retrieval of BASIC trips up to the geojson generation:

1. Launch jobs to retrieve data for the given range dates `bash process_tourist_data.sh --from-date 2025-07-01 --to-date 2025-07-31 --schema-type "BASIC" --batch-size 9000 --control-dir data/jobs` . Around 10 jobs generated and their txt files.
2. Retrieve the data for each job: `aws s3 sync s3://veraset-prd-platform-us-west-2/output/TallerDeApps/<job-id> data/2024-11`
3. Merge the parquet files downloaded in previous step into it's own directory: `bash merge_subdirs.sh data/2024-11`
4. Transform all the parquet files into a CSV file `python manage.py veraset_parquet_to_csv --input-dir ../data/2024-11/`
5. Ingest the data `python manage.py veraset_ingest_basic_trip ../data/csv/2024-11.csv --batch-size 5000`
6. Calculate the polygons data: `python manage.py populate_tourist_visitors_in_geoareas --force`
