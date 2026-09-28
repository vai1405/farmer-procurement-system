"""
Authentication business logic.

This layer owns the RULES:
  - who may register
  - what makes a login valid
  - what documents get created on signup
  - how tokens are issued and revoked

It knows nothing about HTTP. Views call into it; it returns plain dicts.
"""

from datetime import datetime, timezone

from bson import ObjectId

from accounts.jwt_utils import (
    ACCESS_TOKEN,
    REFRESH_TOKEN,
    create_token_pair,
    decode_token,
    get_token_expiry,
)
from accounts.password import hash_password, verify_password
from accounts.repositories import (
    FarmerProfileRepository,
    StaffProfileRepository,
    TokenBlacklistRepository,
    UserRepository,
)
from accounts.validators import (
    validate_login,
    validate_registration,
    validate_staff_creation,
)
from core.constants import Roles
from core.exceptions import (
    AuthenticationException,
    ConflictException,
    NotFoundException,
)
from core.serializers import serialize_document

user_repo = UserRepository()
farmer_repo = FarmerProfileRepository()
staff_repo = StaffProfileRepository()
blacklist_repo = TokenBlacklistRepository()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _public_user(user_document):
    """
    Convert a raw user document into the shape returned to clients.
    The password hash is stripped by serialize_document's SENSITIVE_FIELDS.
    """
    return serialize_document(user_document)


def _issue_session(user_document):
    """Build the standard auth payload: user info + token pair."""
    tokens = create_token_pair(user_document)

    return {
        'user': _public_user(user_document),
        'tokens': tokens,
    }


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------
def register_farmer(data):
    """
    Register a new farmer.

    Creates TWO documents:
      1. users    - credentials + role
      2. farmers  - address/village/district/state profile

    Raises:
        ConflictException if the email or phone is already registered.
    """
    cleaned = validate_registration(data)

    # Explicit duplicate checks give a clear message; the unique indexes
    # created in Step 2 are the real safety net against race conditions.
    if user_repo.email_exists(cleaned['email']):
        raise ConflictException("An account with this email already exists.")

    if user_repo.phone_exists(cleaned['phone']):
        raise ConflictException(
            "An account with this phone number already exists."
        )

    user_id = user_repo.create({
        'full_name': cleaned['full_name'],
        'email': cleaned['email'],
        'phone': cleaned['phone'],
        'password': hash_password(cleaned['password']),  # never plain text
        'role': Roles.FARMER,
        'is_active': True,
        'last_login': None,
    })

    farmer_repo.create({
        'user_id': ObjectId(user_id),
        'full_name': cleaned['full_name'],
        'phone': cleaned['phone'],
        'address': cleaned['address'],
        'village': cleaned['village'],
        'district': cleaned['district'],
        'state': cleaned['state'],
    })

    user_document = user_repo.find_by_id(user_id)

    # Step 7: Registration notification
    from notifications.services import notify
    from core.constants import NotificationType

    notify(
        user_id=user_document['_id'],
        notification_type=NotificationType.REGISTRATION,
        title="Welcome!",
        message=(
            f"Your account has been created successfully. "
            f"Welcome, {cleaned['full_name']}!"
        ),
    )

    return _issue_session(user_document)


def create_privileged_user(data):
    """
    Create a STAFF or ADMIN account.

    Not exposed as a public endpoint — called by the admin module and by
    the `seed_users` management command. Staff/admin accounts must never
    be self-registerable.
    """
    cleaned = validate_staff_creation(data)

    if user_repo.email_exists(cleaned['email']):
        raise ConflictException("An account with this email already exists.")

    if user_repo.phone_exists(cleaned['phone']):
        raise ConflictException(
            "An account with this phone number already exists."
        )

    user_id = user_repo.create({
        'full_name': cleaned['full_name'],
        'email': cleaned['email'],
        'phone': cleaned['phone'],
        'password': hash_password(cleaned['password']),
        'role': cleaned['role'],
        'is_active': True,
        'last_login': None,
    })

    if cleaned['role'] == Roles.STAFF:
        # centre_id is assigned later by an admin (Step 14).
        staff_repo.create({
            'user_id': ObjectId(user_id),
            'full_name': cleaned['full_name'],
            'centre_id': None,
        })

    return _public_user(user_repo.find_by_id(user_id))


# ---------------------------------------------------------------------------
# Login / Logout / Refresh
# ---------------------------------------------------------------------------
def login(data, allowed_roles=None):
    """
    Authenticate a user by email-or-phone plus password.

    Args:
        data: raw request payload.
        allowed_roles: optional list restricting which roles may use this
            endpoint (e.g. the staff login page).

    Raises:
        AuthenticationException — deliberately using ONE generic message
        for both "no such user" and "wrong password", so attackers cannot
        enumerate which accounts exist.
    """
    cleaned = validate_login(data)

    user_document = user_repo.find_by_identifier(cleaned['identifier'])

    if not user_document or not verify_password(
        cleaned['password'], user_document.get('password')
    ):
        raise AuthenticationException(
            "Invalid credentials. Please try again."
        )

    if not user_document.get('is_active', True):
        raise AuthenticationException(
            "This account has been deactivated. Please contact the administrator."
        )

    if allowed_roles and user_document['role'] not in allowed_roles:
        raise AuthenticationException(
            "This account is not permitted to sign in here."
        )

    user_repo.update_last_login(
        user_document['_id'],
        datetime.now(timezone.utc),
    )

    return _issue_session(user_document)


def refresh_session(refresh_token):
    """
    Exchange a valid refresh token for a new token pair.

    Implements REFRESH TOKEN ROTATION: the old refresh token is
    blacklisted immediately, so a stolen token can only be used once.
    """
    if not refresh_token:
        raise AuthenticationException("Refresh token is required.")

    payload = decode_token(
        refresh_token,
        expected_type=REFRESH_TOKEN,
    )

    if blacklist_repo.is_blacklisted(payload['jti']):
        raise AuthenticationException(
            "This session is no longer valid. Please log in again."
        )

    user_document = user_repo.find_by_id(payload['sub'])

    if not user_document or not user_document.get('is_active', True):
        raise AuthenticationException(
            "Account not found or deactivated."
        )

    # Rotate: revoke the token we just consumed.
    blacklist_repo.blacklist(
        jti=payload['jti'],
        user_id=user_document['_id'],
        expires_at=get_token_expiry(payload),
    )

    return _issue_session(user_document)


def logout(refresh_token):
    """
    Revoke a refresh token so it can never be used again.

    The access token remains technically valid until it expires (max 60
    minutes) — that is the accepted trade-off of stateless access tokens.
    The frontend discards it immediately on logout.
    """
    if not refresh_token:
        # Nothing to revoke; treat as a successful logout rather than an
        # error, so the client can always clear its state.
        return

    try:
        payload = decode_token(
            refresh_token,
            expected_type=REFRESH_TOKEN,
        )
    except AuthenticationException:
        # An already-expired or malformed token needs no revocation.
        return

    blacklist_repo.blacklist(
        jti=payload['jti'],
        user_id=ObjectId(payload['sub']),
        expires_at=get_token_expiry(payload),
    )


# ---------------------------------------------------------------------------
# Current user
# ---------------------------------------------------------------------------
def get_current_user(user_id):
    """
    Return the authenticated user's account info plus their role-specific
    profile, used by the frontend to restore session state on page reload.
    """
    user_document = user_repo.find_by_id(user_id)

    if not user_document:
        raise NotFoundException("User account not found.")

    result = _public_user(user_document)

    if user_document['role'] == Roles.FARMER:
        profile = farmer_repo.find_by_user_id(user_document['_id'])
        result['profile'] = serialize_document(profile)

    elif user_document['role'] == Roles.STAFF:
        profile = staff_repo.find_by_user_id(user_document['_id'])
        result['profile'] = serialize_document(profile)

    else:
        result['profile'] = None

    return result