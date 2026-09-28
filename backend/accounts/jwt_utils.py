"""
JWT creation and verification.

We implement this directly with PyJWT rather than using a library tied to
Django's ORM, because our users live in MongoDB.

Token design:
  Access token  - short-lived (60 min), stateless, carries user id + role.
  Refresh token - long-lived (7 days), carries a unique `jti` so it can be
                  revoked via the token_blacklist collection.

The signing secret comes from settings.JWT_SECRET, which is loaded from
the .env file. It is never hard-coded.
"""

import uuid
from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings

from core.exceptions import AuthenticationException

ACCESS_TOKEN = 'access'
REFRESH_TOKEN = 'refresh'


def _now():
    return datetime.now(timezone.utc)


def _build_payload(user, token_type, lifetime):
    """
    Construct the JWT claim set.

    Standard claims used:
        sub - subject (the user's MongoDB _id as a string)
        iat - issued at
        exp - expiry
        iss - issuer
        jti - unique token id (used for blacklisting refresh tokens)
    """
    issued_at = _now()

    return {
        'sub': str(user['_id']),
        'role': user['role'],
        'email': user.get('email'),
        'type': token_type,
        'iat': issued_at,
        'exp': issued_at + lifetime,
        'iss': settings.JWT_ISSUER,
        'jti': uuid.uuid4().hex,
    }


def create_access_token(user):
    """Create a short-lived access token for the given user document."""
    payload = _build_payload(
        user,
        ACCESS_TOKEN,
        timedelta(minutes=settings.JWT_ACCESS_TOKEN_MINUTES),
    )
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user):
    """Create a long-lived refresh token for the given user document."""
    payload = _build_payload(
        user,
        REFRESH_TOKEN,
        timedelta(days=settings.JWT_REFRESH_TOKEN_DAYS),
    )
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_token_pair(user):
    """Create both tokens at once — used by login, register, and refresh."""
    return {
        'access': create_access_token(user),
        'refresh': create_refresh_token(user),
    }


def decode_token(token, expected_type=None):
    """
    Verify a token's signature and expiry, and return its payload.

    Args:
        token: the encoded JWT string.
        expected_type: 'access' or 'refresh'. If given, the token's `type`
            claim must match — this prevents a refresh token from being
            used as an access token, a common and serious vulnerability.

    Raises:
        AuthenticationException with a user-friendly message.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            issuer=settings.JWT_ISSUER,
            options={'require': ['exp', 'iat', 'sub', 'jti']},
        )
    except jwt.ExpiredSignatureError:
        raise AuthenticationException("Your session has expired. Please log in again.")
    except jwt.InvalidIssuerError:
        raise AuthenticationException("Invalid authentication token.")
    except jwt.InvalidTokenError:
        raise AuthenticationException("Invalid authentication token.")

    if expected_type and payload.get('type') != expected_type:
        raise AuthenticationException("Invalid authentication token.")

    return payload


def get_token_expiry(payload):
    """Return the token's expiry as a timezone-aware datetime."""
    return datetime.fromtimestamp(payload['exp'], tz=timezone.utc)