"""
MongoDB connection management using PyMongo.

Design decision:
We create ONE MongoClient for the entire Django process and reuse it.
PyMongo's MongoClient is thread-safe and maintains its own internal
connection pool, so creating a new client per request would be both
wasteful and a common source of connection-exhaustion bugs.

The client is created lazily (on first use) rather than at import time,
so that Django management commands that don't touch the database
(e.g. `collectstatic`) don't fail when MongoDB is unreachable.
"""

import logging

from django.conf import settings
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

logger = logging.getLogger(__name__)

# Module-level cache for the singleton client/database objects.
_client = None
_database = None


def get_client():
    """
    Return the shared MongoClient instance, creating it on first call.

    Raises:
        ConnectionFailure: if MongoDB cannot be reached.
    """
    global _client

    if _client is None:
        try:
            _client = MongoClient(
                settings.MONGO_URI,
                # Fail fast instead of hanging for 30 seconds if Mongo is down.
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                # Retry writes once on transient network errors.
                retryWrites=True,
            )
            # force an actual connection attempt so errors surface here,
            # not deep inside some unrelated query later.
            _client.admin.command('ping')
            logger.info("MongoDB connection established.")
        except (ConnectionFailure, ServerSelectionTimeoutError) as exc:
            _client = None
            logger.error("MongoDB connection failed: %s", exc)
            raise ConnectionFailure(
                "Unable to connect to MongoDB. "
                "Verify that the MongoDB server is running and MONGO_URI is correct."
            ) from exc

    return _client


def get_database():
    """Return the application database object (singleton)."""
    global _database

    if _database is None:
        _database = get_client()[settings.MONGO_DB_NAME]

    return _database


def get_collection(name):
    """
    Return a collection handle by name.

    Example:
        bookings = get_collection('bookings')
    """
    return get_database()[name]


def ping():
    """
    Lightweight connectivity check.
    Returns True if MongoDB responds, False otherwise.
    """
    try:
        get_client().admin.command('ping')
        return True
    except Exception:  # noqa: BLE001 - any failure means "not connected"
        return False


def close_connection():
    """Close the shared client. Mainly useful in tests and shutdown hooks."""
    global _client, _database

    if _client is not None:
        _client.close()
        _client = None
        _database = None
        