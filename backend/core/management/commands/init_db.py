"""
Management command: python manage.py init_db

Verifies the MongoDB connection and creates all indexes defined in
core/indexes.py. Safe to re-run — MongoDB ignores index creation for
indexes that already exist with identical definitions.

This is the PyMongo equivalent of `python manage.py migrate`.
"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from pymongo.errors import OperationFailure, PyMongoError

from core.indexes import INDEX_DEFINITIONS
from core.mongo import get_database, ping


class Command(BaseCommand):
    help = "Verify the MongoDB connection and create all required indexes."

    def handle(self, *args, **options):
        self.stdout.write("Checking MongoDB connection...")

        if not ping():
            raise CommandError(
                "Could not connect to MongoDB.\n"
                f"  MONGO_URI    = {settings.MONGO_URI}\n"
                f"  MONGO_DB_NAME = {settings.MONGO_DB_NAME}\n"
                "Ensure MongoDB is running and the URI in backend/.env is correct."
            )

        self.stdout.write(self.style.SUCCESS(
            f"Connected to database '{settings.MONGO_DB_NAME}'."
        ))
        self.stdout.write("\nCreating indexes...\n")

        database = get_database()
        created = 0
        skipped = 0

        for collection_name, definitions in INDEX_DEFINITIONS.items():
            collection = database[collection_name]

            for keys, options in definitions:
                index_name = options.get('name', 'unnamed')
                try:
                    collection.create_index(keys, **options)
                    self.stdout.write(f"  [ok] {collection_name}.{index_name}")
                    created += 1
                except OperationFailure as exc:
                    # Usually means an index with the same name but different
                    # options already exists.
                    self.stdout.write(self.style.WARNING(
                        f"  [skip] {collection_name}.{index_name} -> {exc.details.get('errmsg', exc)}"
                    ))
                    skipped += 1
                except PyMongoError as exc:
                    raise CommandError(
                        f"Failed creating index {collection_name}.{index_name}: {exc}"
                    )

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. {created} index(es) ensured, {skipped} skipped."
        ))
        