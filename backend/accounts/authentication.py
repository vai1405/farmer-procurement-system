"""
Custom DRF authentication backend for MongoDB-stored users.

DRF's built-in authentication classes assume Django ORM users. This class
decodes our JWT and loads the matching MongoDB document instead.

It attaches an `AuthUser` object to `request.user`, which exposes the
minimal interface DRF and our permission classes expect.
"""

from rest_framework.authentication import BaseAuthentication, get_authorization_header

from accounts.jwt_utils import ACCESS_TOKEN, decode_token
from accounts.repositories import UserRepository
from core.exceptions import AuthenticationException

user_repo = UserRepository()


class AuthUser:
    """
    Lightweight stand-in for Django's User model.

    Views access it as `request.user`, e.g.:
        request.user.id        -> '65f1a...' (string ObjectId)
        request.user.object_id -> ObjectId(...)  (for Mongo queries)
        request.user.role      -> 'FARMER' | 'STAFF' | 'ADMIN'
    """

    def __init__(self, document):
        self.document = document
        self.object_id = document['_id']
        self.id = str(document['_id'])
        self.full_name = document.get('full_name')
        self.email = document.get('email')
        self.phone = document.get('phone')
        self.role = document.get('role')
        self.is_active = document.get('is_active', True)

    # DRF and Django middleware check these attributes.
    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def __str__(self):
        return f"{self.full_name} <{self.email}> ({self.role})"


class MongoJWTAuthentication(BaseAuthentication):
    """
    Reads the `Authorization: Bearer <token>` header, validates the access
    token, and loads the user from MongoDB.

    Returning None (rather than raising) when no header is present lets
    DRF fall through to permission classes, so public endpoints still work.
    """

    keyword = 'Bearer'

    def authenticate(self, request):
        auth_header = get_authorization_header(request).split()

        if not auth_header:
            return None  # no credentials supplied — anonymous request

        if auth_header[0].decode('utf-8').lower() != self.keyword.lower():
            return None  # a different auth scheme — not ours to handle

        if len(auth_header) == 1:
            raise AuthenticationException("Authorization header is missing the token.")
        if len(auth_header) > 2:
            raise AuthenticationException("Authorization header is malformed.")

        token = auth_header[1].decode('utf-8')

        # Enforcing expected_type='access' stops a refresh token from being
        # accepted as an access token.
        payload = decode_token(token, expected_type=ACCESS_TOKEN)

        user_document = user_repo.find_by_id(payload['sub'])

        if not user_document:
            raise AuthenticationException("User account no longer exists.")

        if not user_document.get('is_active', True):
            raise AuthenticationException("This account has been deactivated.")

        return (AuthUser(user_document), token)

    def authenticate_header(self, request):
        """Value of the WWW-Authenticate header on 401 responses."""
        return self.keyword