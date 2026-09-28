"""
Management command: python manage.py check_indexes

Verifies that every index defined in core/indexes.py actually exists in
MongoDB. Useful as a pre-demo sanity check — catches the case where
init_db was run before a collection existed yet, or silently skipped
an index due to a naming conflict.
"""

from django.core.management.base import BaseCommand

from core.indexes import INDEX_DEFINITIONS
from core.mongo import get_database


class Command(BaseCommand):
    help = "Verify all expected indexes exist; report any that are missing."

    def handle(self, *args, **options):
        database = get_database()
        missing = []

        for collection_name, definitions in INDEX_DEFINITIONS.items():
            existing_names = set(database[collection_name].index_information().keys())

            for _, options_dict in definitions:
                expected_name = options_dict.get('name')
                if expected_name and expected_name not in existing_names:
                    missing.append(f"{collection_name}.{expected_name}")

        if missing:
            self.stdout.write(self.style.ERROR(
                f"Missing {len(missing)} index(es):"
            ))
            for name in missing:
                self.stdout.write(f"  - {name}")
            self.stdout.write(self.style.WARNING(
                "\nRun 'python manage.py init_db' to create them."
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                "All expected indexes are present."
            ))