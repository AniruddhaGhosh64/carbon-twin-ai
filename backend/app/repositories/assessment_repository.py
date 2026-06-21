from app.repositories.base_repository import BaseRepository
from datetime import datetime, timezone

class AssessmentRepository(BaseRepository):
    def __init__(self):
        super().__init__("assessments")

    def create_assessment(self, user_id: str, assessment_dict: dict) -> dict:
        try:
            doc_ref = self.collection.document()
            doc_id = doc_ref.id
            
            data = {
                "id": doc_id,
                "user_id": user_id,
                **assessment_dict,
                "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            }
            doc_ref.set(data)
            return data
        except Exception as e:
            self._handle_error("create", e)

    from typing import Optional, Dict, Any

    def get_latest_assessment(self, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            query = self.collection.where("user_id", "==", user_id).stream()
            docs = []
            for doc in query:
                d = doc.to_dict()
                if d is not None:
                    docs.append(d)
            if docs:
                docs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
                return docs[0]
            return None
        except Exception as e:
            self._handle_error("get_latest", e)
