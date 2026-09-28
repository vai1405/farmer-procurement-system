"""
Management command: python manage.py seed_users

Creates the default ADMIN and STAFF accounts needed to demonstrate the
system. Safe to re-run — existing accounts are skipped, not duplicated.

Credentials can be overridden via command-line options so that real
deployments never use the demo defaults.
"""

from django.core.management.base import BaseCommand

from accounts import services
from accounts.repositories import UserRepository
from core.constants import Roles
from core.exceptions import AppException

user_repo = UserRepository()

DEFAULT_ACCOUNTS = [
    {
        'full_name': 'System Administrator',
        'email': 'admin@procurement.in',
        'phone': '9000000001',
        'password': 'Admin@123',
        'role': Roles.ADMIN,
    },
    {
        'full_name': 'Procurement Staff',
        'email': 'staff@procurement.in',
        'phone': '9000000002',
        'password': 'Staff@123',
        'role': Roles.STAFF,
    },
]


class Command(BaseCommand):
    help = "Create the default admin and staff accounts for demonstration."

    def add_arguments(self, parser):
        parser.add_argument('--admin-email', help="Override the admin email.")
        parser.add_argument('--admin-password', help="Override the admin password.")
        parser.add_argument('--staff-email', help="Override the staff email.")
        parser.add_argument('--staff-password', help="Override the staff password.")

    def handle(self, *args, **options):
        accounts = [dict(account) for account in DEFAULT_ACCOUNTS]

        # Apply any command-line overrides.
        if options.get('admin_email'):
            accounts[0]['email'] = options['admin_email']
        if options.get('admin_password'):
            accounts[0]['password'] = options['admin_password']
        if options.get('staff_email'):
            accounts[1]['email'] = options['staff_email']
        if options.get('staff_password'):
            accounts[1]['password'] = options['staff_password']

        self.stdout.write("Seeding default accounts...\n")

        for account in accounts:
            if user_repo.email_exists(account['email']):
                self.stdout.write(self.style.WARNING(
                    f"  [skip] {account['role']:<6} {account['email']} (already exists)"
                ))
                continue

            try:
                services.create_privileged_user(account)
                self.stdout.write(self.style.SUCCESS(
                    f"  [ok]   {account['role']:<6} {account['email']}"
                ))
            except AppException as exc:
                self.stdout.write(self.style.ERROR(
                    f"  [fail] {account['email']} -> {exc.message}"
                ))

        self.stdout.write(self.style.SUCCESS("\nDone."))
        self.stdout.write(
            "\nDemo credentials:\n"
            f"  ADMIN -> {accounts[0]['email']} / {accounts[0]['password']}\n"
            f"  STAFF -> {accounts[1]['email']} / {accounts[1]['password']}"
        )