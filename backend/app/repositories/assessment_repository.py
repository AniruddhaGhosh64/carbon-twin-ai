from app.repositories.base_repository import BaseRepository
from datetime import datetime

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
                "created_at": datetime.utcnow().isoformat()
            }
            doc_ref.set(data)
            return data
        except Exception as e:
            self._handle_error("create", e)

    def get_latest_assessment(self, user_id: str) -> dict:
        try:
            query = self.collection.where("user_id", "==", user_id).stream()
            docs = [doc.to_dict() for doc in query]
            if docs:
                docs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
                return docs[0]
            return None
        except Exception as e:
            self._handle_error("get_latest", e)
