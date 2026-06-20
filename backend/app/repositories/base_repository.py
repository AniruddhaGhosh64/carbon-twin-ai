from google.cloud import firestore
from app.core.firebase import db
from fastapi import HTTPException

class BaseRepository:
    def __init__(self, collection_name: str):
        self.db = db
        self.collection_name = collection_name
        self.collection = db.collection(collection_name)

    def _handle_error(self, operation: str, error: Exception):
        print(f"Database Error during {operation} on {self.collection_name}: {error}")
        raise HTTPException(
            status_code=500,
            detail=f"Database error during {operation} on {self.collection_name}."
        )
