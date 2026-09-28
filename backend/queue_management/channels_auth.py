"""
WebSocket authentication middleware for Django Channels.

Standard Channels auth relies on Django sessions tied to the ORM User
model. Our users live in MongoDB and authenticate via JWT (Step 3), so
we replicate that here for WebSocket connections.

The access token is passed as a query parameter because browsers do not
allow custom headers on the WebSocket handshake request:
    ws://host/ws/queue/<slot_id>/?token=<access_token>
"""

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware

from accounts.jwt_utils import ACCESS_TOKEN, decode_token
from accounts.repositories import UserRepository
from core.exceptions import AuthenticationException


@database_sync_to_async
def _load_user(token):
    """
    Decode the JWT and load the matching MongoDB user document.
    Wrapped in database_sync_to_async because PyMongo calls are
    synchronous, but Channels consumers run in an async context.
    """
    payload = decode_token(token, expected_type=ACCESS_TOKEN)
    user_repo = UserRepository()
    user_document = user_repo.find_by_id(payload['sub'])

    if not user_document or not user_document.get('is_active', True):
        return None

    return user_document


class JWTAuthMiddleware(BaseMiddleware):
    """
    Populates scope['user'] with a MongoDB user document (or None) based
    on the ?token= query parameter, mirroring MongoJWTAuthentication from
    Step 3's REST layer.
    """

    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]

        scope['user'] = None

        if token:
            try:
                scope['user'] = await _load_user(token)
            except AuthenticationException:
                scope['user'] = None

        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    """Convenience wrapper matching Channels' naming convention."""
    return JWTAuthMiddleware(inner)