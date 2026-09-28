"""
Password hashing utilities.

We use Django's built-in hashers (PBKDF2-SHA256 by default) because they
are well-audited, correctly salted, and have no database dependency.
Passwords are NEVER stored or logged in plain text anywhere in this project.
"""

from django.contrib.auth.hashers import check_password as django_check_password
from django.contrib.auth.hashers import make_password as django_make_password


def hash_password(raw_password):
    """
    Return a salted PBKDF2 hash of the given plain-text password.

    The returned string embeds the algorithm, iteration count, and salt,
    e.g. 'pbkdf2_sha256$600000$<salt>$<hash>'.
    """
    return django_make_password(raw_password)


def verify_password(raw_password, hashed_password):
    """
    Compare a plain-text password against a stored hash.

    Uses a constant-time comparison internally to resist timing attacks.
    Returns True on match, False otherwise.
    """
    if not hashed_password:
        return False
    return django_check_password(raw_password, hashed_password)