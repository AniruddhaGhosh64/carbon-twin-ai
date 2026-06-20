from app.repositories.base_repository import BaseRepository
from datetime import datetime

class ProgressRepository(BaseRepository):
    def __init__(self):
        super().__init__("progress_history")

    def add_history_entry(self, user_id: str, date: str, score: int, emissions_kg: float) -> dict:
        try:
            doc_id = f"{user_id}_{date}"
            doc_ref = self.collection.document(doc_id)
            
            data = {
                "id": doc_id,
                "user_id": user_id,
                "date": date,
                "carbon_score": score,
                "emissions_kg": emissions_kg,
                "updated_at": datetime.utcnow().isoformat()
            }
            doc_ref.set(data)
            return data
        except Exception as e:
            self._handle_error("add_history_entry", e)

    def get_history(self, user_id: str) -> list[dict]:
        try:
            query = self.collection.where("user_id", "==", user_id).stream()
            docs = [doc.to_dict() for doc in query]
            docs.sort(key=lambda x: x.get("date", ""))
            return docs
        except Exception as e:
            self._handle_error("get_history", e)
