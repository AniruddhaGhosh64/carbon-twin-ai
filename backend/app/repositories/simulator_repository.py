from app.repositories.base_repository import BaseRepository
from datetime import datetime

class SimulatorRepository(BaseRepository):
    def __init__(self):
        super().__init__("simulator_scenarios")

    def create_scenario(self, user_id: str, scenario_dict: dict) -> dict:
        try:
            doc_ref = self.collection.document()
            doc_id = doc_ref.id
            
            data = {
                "id": doc_id,
                "user_id": user_id,
                **scenario_dict,
                "saved_at": datetime.utcnow().isoformat()
            }
            doc_ref.set(data)
            return data
        except Exception as e:
            self._handle_error("create", e)

    def list_scenarios(self, user_id: str) -> list[dict]:
        try:
            query = self.collection.where("user_id", "==", user_id).stream()
            docs = [doc.to_dict() for doc in query]
            docs.sort(key=lambda x: x.get("saved_at", ""), reverse=True)
            return docs
        except Exception as e:
            self._handle_error("list", e)

    def delete_scenario(self, user_id: str, scenario_id: str) -> bool:
        try:
            doc_ref = self.collection.document(scenario_id)
            doc = doc_ref.get()
            if doc.exists:
                doc_data = doc.to_dict()
                if doc_data.get("user_id") == user_id:
                    doc_ref.delete()
                    return True
            return False
        except Exception as e:
            self._handle_error("delete", e)
