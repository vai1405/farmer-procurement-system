"""
BaseRepository — generic CRUD operations over a MongoDB collection.

Every feature module defines its own repository that inherits from this
and adds only its domain-specific queries. For example:

    class BookingRepository(BaseRepository):
        collection_name = Collections.BOOKINGS

        def find_active_by_slot(self, slot_id):
            return self.find_many({
                'slot_id': slot_id,
                'status': {'$in': BookingStatus.ACTIVE},
            }, sort=[('queue_position', 1)])

Repositories contain DATABASE ACCESS ONLY. Business rules belong in services.
"""

from datetime import datetime, timezone

from pymongo import ReturnDocument
from pymongo.errors import PyMongoError

from core.exceptions import DatabaseException
from core.mongo import get_collection
from core.validators import validate_object_id


def utc_now():
    """Timezone-aware current UTC timestamp, used for created_at/updated_at."""
    return datetime.now(timezone.utc)


class BaseRepository:
    """Generic data-access layer for a single MongoDB collection."""

    collection_name = None  # subclasses MUST override this

    def __init__(self):
        if not self.collection_name:
            raise NotImplementedError(
                f"{self.__class__.__name__} must define `collection_name`."
            )
        self.collection = get_collection(self.collection_name)

    # ------------------------------------------------------------------
    # CREATE
    # ------------------------------------------------------------------
    def create(self, data):
        """
        Insert a document, automatically adding created_at / updated_at.

        Returns:
            str: the inserted document's id.
        """
        try:
            now = utc_now()
            document = {**data, 'created_at': now, 'updated_at': now}
            result = self.collection.insert_one(document)
            return str(result.inserted_id)
        except PyMongoError as exc:
            raise DatabaseException(
                f"Failed to create record in '{self.collection_name}'."
            ) from exc

    # ------------------------------------------------------------------
    # READ
    # ------------------------------------------------------------------
    def find_by_id(self, record_id):
        """Return a single document by its _id, or None if not found."""
        object_id = validate_object_id(record_id)
        try:
            return self.collection.find_one({'_id': object_id})
        except PyMongoError as exc:
            raise DatabaseException("Failed to fetch record.") from exc

    def find_one(self, filters):
        """Return the first document matching `filters`, or None."""
        try:
            return self.collection.find_one(filters)
        except PyMongoError as exc:
            raise DatabaseException("Failed to fetch record.") from exc

    def find_many(self, filters=None, sort=None, limit=0, skip=0, projection=None):
        """
        Return a list of documents matching `filters`.

        Args:
            filters: Mongo query dict (defaults to {} = all documents).
            sort: list of (field, direction) tuples, e.g. [('created_at', -1)].
            limit: max documents to return (0 = no limit).
            skip: number of documents to skip (for pagination).
            projection: fields to include/exclude.
        """
        try:
            cursor = self.collection.find(filters or {}, projection)

            if sort:
                cursor = cursor.sort(sort)
            if skip:
                cursor = cursor.skip(skip)
            if limit:
                cursor = cursor.limit(limit)

            return list(cursor)
        except PyMongoError as exc:
            raise DatabaseException("Failed to fetch records.") from exc

    def count(self, filters=None):
        """Count documents matching `filters`."""
        try:
            return self.collection.count_documents(filters or {})
        except PyMongoError as exc:
            raise DatabaseException("Failed to count records.") from exc

    def exists(self, filters):
        """Return True if at least one document matches `filters`."""
        return self.count(filters) > 0

    # ------------------------------------------------------------------
    # UPDATE
    # ------------------------------------------------------------------
    def update_by_id(self, record_id, data):
        """
        Update a document by id using $set, refreshing updated_at.

        Returns:
            bool: True if a document was matched.
        """
        object_id = validate_object_id(record_id)
        try:
            result = self.collection.update_one(
                {'_id': object_id},
                {'$set': {**data, 'updated_at': utc_now()}},
            )
            return result.matched_count > 0
        except PyMongoError as exc:
            raise DatabaseException("Failed to update record.") from exc

    def update_one(self, filters, update, upsert=False):
        """
        Run an arbitrary update operation (e.g. $inc, $push) with a filter.
        Use this when you need operators other than $set.

        Returns:
            bool: True if a document was matched or upserted.
        """
        try:
            result = self.collection.update_one(filters, update, upsert=upsert)
            return result.matched_count > 0 or result.upserted_id is not None
        except PyMongoError as exc:
            raise DatabaseException("Failed to update record.") from exc

    def update_many(self, filters, update):
        """Apply an update to all matching documents. Returns modified count."""
        try:
            result = self.collection.update_many(filters, update)
            return result.modified_count
        except PyMongoError as exc:
            raise DatabaseException("Failed to update records.") from exc

    def find_one_and_update(self, filters, update, return_new=True):
        """
        Atomically find a document, update it, and return it.

        This is the key method for concurrency safety in the booking and
        queue modules (Steps 7-9). Because MongoDB performs the match and
        the update as a single atomic operation, two farmers cannot both
        claim the last available slot.

        Returns:
            dict: the matched document (post-update by default), or None.
        """
        try:
            return self.collection.find_one_and_update(
                filters,
                update,
                return_document=ReturnDocument.AFTER if return_new
                else ReturnDocument.BEFORE,
            )
        except PyMongoError as exc:
            raise DatabaseException("Failed to update record.") from exc

    # ------------------------------------------------------------------
    # DELETE
    # ------------------------------------------------------------------
    def delete_by_id(self, record_id):
        """Delete a document by id. Returns True if something was deleted."""
        object_id = validate_object_id(record_id)
        try:
            result = self.collection.delete_one({'_id': object_id})
            return result.deleted_count > 0
        except PyMongoError as exc:
            raise DatabaseException("Failed to delete record.") from exc

    def delete_many(self, filters):
        """Delete all documents matching `filters`. Returns deleted count."""
        try:
            result = self.collection.delete_many(filters)
            return result.deleted_count
        except PyMongoError as exc:
            raise DatabaseException("Failed to delete records.") from exc

    # ------------------------------------------------------------------
    # AGGREGATION
    # ------------------------------------------------------------------
    def aggregate(self, pipeline):
        """
        Run an aggregation pipeline.
        Used in the admin reports module (Step 14) for summaries and joins.
        """
        try:
            return list(self.collection.aggregate(pipeline))
        except PyMongoError as exc:
            raise DatabaseException("Failed to run aggregation.") from exc