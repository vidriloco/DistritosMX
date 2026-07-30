import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve(strict=True).parent.parent

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/3.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "top_secret")

# SECURITY WARNING: don't run with debug turned on in production!
# Defaults to OFF. Anything that forgets to pass DJANGO_DEBUG — a one-off
# `docker compose run`, a cron container, a new compose file — then gets a
# production-safe process instead of one serving tracebacks and settings to the
# internet. Local development opts in explicitly, in docker-compose.yaml.
DEBUG = os.getenv("DJANGO_DEBUG", "false").strip().lower() in ("1", "true", "yes")
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True

# Secure cookies require HTTPS, so pinning them True makes a plain-HTTP local
# server unable to hold a session at all: the browser accepts the login and
# then drops the cookie, and /admin and /dashboard bounce back to the form
# forever. Tied to DEBUG so production keeps them and localhost works.
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG

# Off by default: switching this on without the proxy header below — or in
# front of a load balancer that terminates TLS itself — produces a redirect
# loop, so it is the operator's call, per environment.
SECURE_SSL_REDIRECT = os.getenv("DJANGO_SECURE_SSL_REDIRECT", "false").strip().lower() in ("1", "true", "yes")
if os.getenv("DJANGO_BEHIND_TLS_PROXY", "false").strip().lower() in ("1", "true", "yes"):
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# HSTS is close to irreversible for the duration it advertises — browsers honour
# it even after the header stops being sent — so it stays 0 until switched on.
SECURE_HSTS_SECONDS = int(os.getenv("DJANGO_HSTS_SECONDS", "0") or 0)
if SECURE_HSTS_SECONDS:
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

ALLOWED_HOSTS = [
    h.strip()
    for h in os.getenv(
        "DJANGO_ALLOWED_HOSTS",
        "127.0.0.1,192.168.178.209,localhost,metrobus.localhost",
    ).split(",")
    if h.strip()
]

# Site URL for password reset links
SITE_URL = 'https://www.wikiando.mx'
SITE_NAME = 'Wikiando MX'

SECURE_CROSS_ORIGIN_OPENER_POLICY = None

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.gis',
    'world',
    'django_apscheduler',
    'leaflet',
    'tinymce',
    'storages',
    'django_hosts',
    'taggit',
    # authentication
    "allauth", 
    'allauth.account', 
    'allauth.socialaccount'
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # Compresses the large GeoJSON payloads (agebs, neighbourhoods, despojos);
    # must sit ahead of anything that rewrites the response body.
    'django.middleware.gzip.GZipMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django_hosts.middleware.HostsRequestMiddleware',
    'django_hosts.middleware.HostsResponseMiddleware',
    'allauth.account.middleware.AccountMiddleware',
    'django.middleware.locale.LocaleMiddleware'
]

# File-based rather than the default per-process locmem, so that a cache warmed
# once (see the despojos_warm_cache command) is shared by every gunicorn worker
# in the container instead of each one recomputing it on its first request.
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
        'LOCATION': os.environ.get('DJANGO_CACHE_DIR', '/tmp/distritos-cache'),
        'TIMEOUT': 60 * 60 * 12,
        'OPTIONS': {'MAX_ENTRIES': 500},
    }
}

ROOT_URLCONF = 'geodjango.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'django.template.context_processors.request'
            ],
        },
    },
]

WSGI_APPLICATION = 'geodjango.wsgi.application'

AUTHENTICATION_BACKENDS = (
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
)

# Database
# https://docs.djangoproject.com/en/3.1/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': 'geodjango',
        'USER': 'geo',
        "HOST": os.getenv("DB_HOST", "localhost"),
        "PORT": os.getenv("DB_PORT", "5432"),
        "NAME": os.getenv("DB_NAME", "wikiando_db"),
        "USER": os.getenv("DB_USER", "wikirootcito"),
        "PASSWORD": os.getenv("DB_PASSWORD", "passwordcita03921!"),
    },
}


# Password validation
# https://docs.djangoproject.com/en/3.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

SITE_ID = 1
ACCOUNT_EMAIL_REQUIRED = True
LOGIN_REDIRECT_URL = "home"
ACCOUNT_LOGOUT_ON_GET = True
ACCOUNT_USERNAME_MIN_LENGTH = 5
ACCOUNT_USERNAME_REQUIRED = True
ACCOUNT_EMAIL_VERIFICATION = 'none'

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/3.1/howto/static-files/

STATIC_URL = '/static/'

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_USE_TLS = True
EMAIL_PORT = 587
EMAIL_HOST_USER = "alex@tallerdeapps.mx"
EMAIL_HOST_PASSWORD = 'jmmy bsbk gnco ygwy'
DEFAULT_FROM_EMAIL = "no-reply@tallerdeapps.mx"
ACCOUNT_EMAIL_SUBJECT_PREFIX = "Wikiando MX - "

# AWS settings
# Credentials come from the environment only — never a default in
# source. See .env.production / docker-compose.yaml for how they are supplied.
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID', '')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY', '')
AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME', 'wikiando')
AWS_S3_REGION_NAME = os.getenv('AWS_S3_REGION_NAME', 'us-east-2')

AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'

# Optionally, enable file overwrites and auto-delete:
AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = None
AWS_QUERYSTRING_AUTH = False

# Media settings
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'

MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media/')

LEAFLET_CONFIG = {
    'DEFAULT_CENTER': (19.4326, -99.1332),  # Center of the map (latitude, longitude)
    'DEFAULT_ZOOM': 13,  # Default zoom level
    'MIN_ZOOM': 5,
    'MAX_ZOOM': 23,
    'TILES': 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    'ATTRIBUTION_PREFIX': 'Powered by Django & Leaflet'
}

TINYMCE_DEFAULT_CONFIG = {
    "height": 500,
    "width": 800,
    "plugins": "image imagetools media link code",
    "toolbar": "undo redo | bold italic | alignleft aligncenter alignright | image media link | code",
    "image_caption": True,
    "automatic_uploads": True,
    "file_picker_types": 'image',
    "file_picker_callback": """
    function(callback, value, meta) {
        var input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.onchange = function() {
            var file = this.files[0];
            var reader = new FileReader();
            reader.onload = function() {
                callback(reader.result, {
                    alt: ''
                });
            };
            reader.readAsDataURL(file);
        };
        input.click();
    }
    """,
}

DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

LOCALE_PATHS = [
    os.path.join(BASE_DIR, 'locale')
]

ROOT_HOSTCONF = 'geodjango.hosts'
DEFAULT_HOST = 'www'

TAGGIT_CASE_INSENSITIVE = True

# Django 4 rejects any POST whose Origin is not listed here, so a stale value is
# not a warning — it is every form on the site failing at once: the contact
# form, the despojo intake, the dashboard, the admin login. It was pinned to
# wikiando.mx, which would have broken all of them the moment the site answered
# on distritos.mx. Derived from ALLOWED_HOSTS instead, so moving domains is one
# environment variable rather than a code change somebody has to remember.
def _csrf_origins_from_hosts(hosts):
    origins = []
    for host in hosts:
        if not host or host == "*":
            continue
        # A leading dot means "this domain and its subdomains"; CSRF spells the
        # same idea with an explicit wildcard label.
        origins.append(f"https://*{host}" if host.startswith(".") else f"https://{host}")
        # Local development is served over plain HTTP.
        if host in ("localhost", "127.0.0.1", "[::1]") or host.endswith(".localhost"):
            origins.append(f"http://{host}")
    return origins


CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("DJANGO_CSRF_TRUSTED_ORIGINS", "").split(",")
    if origin.strip()
] or _csrf_origins_from_hosts(ALLOWED_HOSTS)

# Internationalization
# https://docs.djangoproject.com/en/3.1/topics/i18n/

LANGUAGE_CODE = 'es'
LANGUAGES = (
    ('es', 'Spanish'),
)

LOCALE_PATHS = [os.path.join(BASE_DIR, 'locale')]

TIME_ZONE = 'America/Mexico_City'

USE_I18N = True

USE_L10N = True

USE_TZ = True

# S3 Storage Configuration
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME', 'wikiando')
S3_REGION = os.getenv('S3_REGION', 'us-east-2')
S3_BASE_URL = os.getenv('S3_BASE_URL', f'https://{S3_BUCKET_NAME}.s3.{S3_REGION}.amazonaws.com')
S3_TRANSPORTS_PATH = os.getenv('S3_TRANSPORTS_PATH', 'transports/systems/stations')
S3_SYSTEMS_PATH = os.getenv('S3_SYSTEMS_PATH', 'transports/systems')

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(PROJECT_ROOT, 'static')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'