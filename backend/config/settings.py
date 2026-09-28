"""
Django settings for the Smart Farmer Procurement & Queue Management System.

Database persistence is handled via PyMongo (MongoDB), NOT Django ORM.
Django ORM/migrations are only used for Django's own internal needs
(sessions, admin auth scaffolding) — application data lives in MongoDB.
"""

from pathlib import Path
from datetime import timedelta

from decouple import config, Csv


BASE_DIR = Path(__file__).resolve().parent.parent


# ---------------------------------------------------------------------------
# SECURITY
# ---------------------------------------------------------------------------

SECRET_KEY = config('SECRET_KEY')
JWT_SECRET = config('JWT_SECRET')

DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = ['*']


# ---------------------------------------------------------------------------
# APPLICATIONS
# ---------------------------------------------------------------------------

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'corsheaders',
    'channels',

    'core',
    'accounts',
    'farmers',
    'procurement',
    'queue_management',
    'payments',
    'notifications',
]


# ---------------------------------------------------------------------------
# MIDDLEWARE
# ---------------------------------------------------------------------------

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',

    'corsheaders.middleware.CorsMiddleware',

    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]


# ---------------------------------------------------------------------------
# URL / APPLICATION CONFIG
# ---------------------------------------------------------------------------

ROOT_URLCONF = 'config.urls'

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'


# ---------------------------------------------------------------------------
# TEMPLATES
# ---------------------------------------------------------------------------

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


# ---------------------------------------------------------------------------
# DATABASE
# ---------------------------------------------------------------------------
# Django's SQLite database is kept only for Django's internal machinery.
# Application data is stored in MongoDB through PyMongo.

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# ---------------------------------------------------------------------------
# MONGODB
# ---------------------------------------------------------------------------

MONGO_URI = config('MONGO_URI')
MONGO_DB_NAME = config('MONGO_DB_NAME')


# ---------------------------------------------------------------------------
# JWT AUTHENTICATION
# ---------------------------------------------------------------------------

JWT_ALGORITHM = 'HS256'

JWT_ACCESS_TOKEN_MINUTES = config(
    'JWT_ACCESS_TOKEN_MINUTES',
    default=60,
    cast=int
)

JWT_REFRESH_TOKEN_DAYS = config(
    'JWT_REFRESH_TOKEN_DAYS',
    default=7,
    cast=int
)

JWT_ISSUER = 'farmer-procurement-system'


# ---------------------------------------------------------------------------
# DJANGO CHANNELS / REDIS
# ---------------------------------------------------------------------------

# Redis URL used by Django Channels.
# Local Docker Redis:
# redis://127.0.0.1:6379/0

REDIS_URL = config(
    'REDIS_URL',
    default='redis://127.0.0.1:6379/0'
)

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [REDIS_URL],
        },
    },
}


# ---------------------------------------------------------------------------
# DJANGO REST FRAMEWORK
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'accounts.authentication.MongoJWTAuthentication',
    ),

    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),

    'EXCEPTION_HANDLER': 'config.expections.custom_exception_handler',

    'UNAUTHENTICATED_USER': None,
}


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    cast=Csv()
)

CORS_ALLOW_CREDENTIALS = True


# ---------------------------------------------------------------------------
# PASSWORD VALIDATION
# ---------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = []


# ---------------------------------------------------------------------------
# INTERNATIONALIZATION
# ---------------------------------------------------------------------------

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'Asia/Kolkata'

USE_I18N = True

USE_TZ = True


# ---------------------------------------------------------------------------
# STATIC FILES
# ---------------------------------------------------------------------------

STATIC_URL = 'static/'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ---------------------------------------------------------------------------
# LOGGING
# ---------------------------------------------------------------------------

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,

    'formatters': {
        'simple': {
            'format': '[{levelname}] {asctime} {name}: {message}',
            'style': '{',
        },
    },

    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },

    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}