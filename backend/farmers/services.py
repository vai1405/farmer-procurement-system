"""
Farmer profile business logic.

The profile spans TWO collections:
  users   - full_name, email, phone (identity)
  farmers - full_name, phone, address, village, district, state (profile)

`full_name` and `phone` are intentionally duplicated across both. This is
a deliberate MongoDB denormalisation: it lets staff list farmers from a
single collection without a join on every row. The trade-off is that both
documents must be updated together, which this service handles.
"""

from accounts.repositories import UserRepository
from core.exceptions import NotFoundException
from core.serializers import serialize_document
from farmers.repositories import FarmerRepository
from farmers.validators import validate_profile_update

farmer_repo = FarmerRepository()
user_repo = UserRepository()


def _combined_profile(user_document, farmer_document):
    """Merge the user account and farmer profile into one response object."""
    user_data = serialize_document(user_document)
    farmer_data = serialize_document(farmer_document) or {}

    return {
        'id': user_data['id'],                       # the user id
        'profile_id': farmer_data.get('id'),         # the farmer-profile id
        'full_name': user_data.get('full_name'),
        'email': user_data.get('email'),
        'phone': user_data.get('phone'),
        'role': user_data.get('role'),
        'address': farmer_data.get('address', ''),
        'village': farmer_data.get('village', ''),
        'district': farmer_data.get('district', ''),
        'state': farmer_data.get('state', ''),
        'is_active': user_data.get('is_active', True),
        'created_at': user_data.get('created_at'),
        'updated_at': farmer_data.get('updated_at') or user_data.get('updated_at'),
    }


def get_profile(user_id):
    """
    Return the authenticated farmer's full profile.

    Raises:
        NotFoundException if either document is missing.
    """
    user_document = user_repo.find_by_id(user_id)
    if not user_document:
        raise NotFoundException("User account not found.")

    farmer_document = farmer_repo.find_by_user_id(user_document['_id'])
    if not farmer_document:
        raise NotFoundException("Farmer profile not found.")

    return _combined_profile(user_document, farmer_document)


def update_profile(user_id, data):
    """
    Update the farmer's profile.

    Keeps the duplicated `full_name` / `phone` fields in sync across both
    the users and farmers collections.

    Raises:
        ConflictException if the new phone number belongs to another user.
    """
    from core.exceptions import ConflictException

    cleaned = validate_profile_update(data)

    user_document = user_repo.find_by_id(user_id)
    if not user_document:
        raise NotFoundException("User account not found.")

    # A phone number must stay unique across all users.
    if 'phone' in cleaned and cleaned['phone'] != user_document.get('phone'):
        existing = user_repo.find_by_phone(cleaned['phone'])
        if existing and existing['_id'] != user_document['_id']:
            raise ConflictException(
                "This phone number is already registered to another account."
            )

    # Fields that belong to the users collection.
    user_updates = {
        key: value for key, value in cleaned.items()
        if key in ['full_name', 'phone']
    }
    if user_updates:
        user_repo.update_by_id(user_document['_id'], user_updates)

    # Everything goes to the farmers collection (including the duplicates).
    farmer_repo.update_by_user_id(user_document['_id'], cleaned)

    return get_profile(user_id)