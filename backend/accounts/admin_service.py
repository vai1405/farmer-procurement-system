"""
Admin-only account management: system-wide user listing, staff account
creation, and activate/deactivate for any account.

Kept separate from accounts/services.py (which handles login/registration
flows any authenticated or anonymous request might trigger) to keep a
clear line between "authentication logic" and "administrative control
over other people's accounts."
"""

from accounts.password import hash_password
from accounts.repositories import StaffProfileRepository, UserRepository
from accounts.validators import validate_staff_creation, validate_status_update
from core.constants import Roles
from core.exceptions import ConflictException, NotFoundException
from core.serializers import serialize_document, serialize_documents

user_repo = UserRepository()
staff_repo = StaffProfileRepository()


def list_users(role=None, is_active=None, keyword=None, page=1, page_size=20):
    """
    Paginated, filterable listing of ALL user accounts (any role) —
    the admin's system-wide view, distinct from Step 13's farmer-only
    directory.
    """
    filters = {}

    if role:
        filters['role'] = role.upper()
    if is_active is not None:
        filters['is_active'] = is_active
    if keyword:
        filters['$or'] = [
            {'full_name': {'$regex': keyword, '$options': 'i'}},
            {'email': {'$regex': keyword, '$options': 'i'}},
            {'phone': {'$regex': keyword, '$options': 'i'}},
        ]

    skip = (page - 1) * page_size

    users = user_repo.find_many(filters, sort=[('created_at', -1)], skip=skip, limit=page_size)
    total = user_repo.count(filters)

    return {
        'users': serialize_documents(users),
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total': total,
            'total_pages': max(1, (total + page_size - 1) // page_size),
        },
    }


def create_staff_account(data, requesting_admin):
    """
    Create a STAFF or ADMIN account.

    Thin wrapper around accounts.services.create_privileged_user (built
    in Step 3, used until now only by the seed_users command) — this is
    that function's first real caller from an actual admin action.
    """
    from accounts.services import create_privileged_user
    return create_privileged_user(data)


def set_user_status(user_id, is_active, requesting_admin):
    """
    Activate or deactivate any user account.

    Guards against an admin locking themselves out by deactivating their
    own account — a small but important safety check for a system with
    no separate "super admin" tier to fix it afterward.
    """
    cleaned = validate_status_update({'is_active': is_active})

    target_user = user_repo.find_by_id(user_id)
    if not target_user:
        raise NotFoundException("User account not found.")

    if str(target_user['_id']) == str(requesting_admin.object_id) and not cleaned['is_active']:
        raise ConflictException("You cannot deactivate your own account.")

    user_repo.update_by_id(user_id, cleaned)
    return serialize_document(user_repo.find_by_id(user_id))


def assign_staff_centre(staff_user_id, centre_id):
    """
    Assign a staff member to a procurement centre.

    Staff accounts are created with centre_id=None (Step 3); an admin
    completes the assignment here. Not strictly required by the spec's
    permission model (IsStaffOrAdmin doesn't check centre assignment),
    but it's useful operational metadata for a real deployment and for
    the admin UI to show "which centre does this staff member work at."
    """
    from core.validators import validate_object_id

    staff_profile = staff_repo.find_by_user_id(validate_object_id(staff_user_id, "staff"))
    if not staff_profile:
        raise NotFoundException("Staff profile not found.")

    centre_object_id = validate_object_id(centre_id, "centre") if centre_id else None
    staff_repo.update_by_id(staff_profile['_id'], {'centre_id': centre_object_id})

    return serialize_document(staff_repo.find_by_id(staff_profile['_id']))