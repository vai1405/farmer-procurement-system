"""
Data-access layer for authentication-related collections.

Remember the rule from Step 2: repositories contain QUERIES ONLY.
No business rules, no validation, no notifications.
"""

from core.constants import Collections
from core.repository import BaseRepository


class UserRepository(BaseRepository):
    """Access to the `users` collection (all roles live here)."""

    collection_name = Collections.USERS

    def find_by_email(self, email):
        """Look up a user by email (stored lowercase)."""
        return self.find_one({'email': email.strip().lower()})

    def find_by_phone(self, phone):
        """Look up a user by phone number."""
        return self.find_one({'phone': phone.strip()})

    def find_by_identifier(self, identifier):
        """
        Look up a user by EITHER email or phone.
        Lets farmers log in with whichever they remember.
        """
        value = str(identifier).strip()
        return self.find_one({
            '$or': [
                {'email': value.lower()},
                {'phone': value},
            ]
        })

    def email_exists(self, email):
        return self.exists({'email': email.strip().lower()})

    def phone_exists(self, phone):
        return self.exists({'phone': phone.strip()})

    def find_by_role(self, role):
        return self.find_many({'role': role}, sort=[('created_at', -1)])

    def update_last_login(self, user_id, timestamp):
        return self.update_by_id(user_id, {'last_login': timestamp})


class FarmerProfileRepository(BaseRepository):
    """
    Access to the `farmers` collection.

    A farmer's login credentials live in `users`; their agricultural
    profile (address, village, district, state) lives here, linked by
    `user_id`. This keeps authentication concerns separate from
    domain data and avoids bloating the users collection.
    """

    collection_name = Collections.FARMERS

    def find_by_user_id(self, user_id):
        return self.find_one({'user_id': user_id})


class StaffProfileRepository(BaseRepository):
    """Access to the `staff` collection (staff-to-centre assignment)."""

    collection_name = Collections.STAFF

    def find_by_user_id(self, user_id):
        return self.find_one({'user_id': user_id})

    def find_by_centre(self, centre_id):
        return self.find_many({'centre_id': centre_id})


class TokenBlacklistRepository(BaseRepository):
    """
    Access to the `token_blacklist` collection.

    Revoked refresh-token IDs are stored here. A TTL index on
    `expires_at` causes MongoDB to delete each entry automatically
    once the token would have expired anyway.
    """

    collection_name = Collections.TOKEN_BLACKLIST

    def blacklist(self, jti, user_id, expires_at):
        """Revoke a token by storing its jti. Ignores duplicates."""
        return self.update_one(
            {'jti': jti},
            {
                '$set': {
                    'jti': jti,
                    'user_id': user_id,
                    'expires_at': expires_at,
                }
            },
            upsert=True,
        )

    def is_blacklisted(self, jti):
        return self.exists({'jti': jti})
    