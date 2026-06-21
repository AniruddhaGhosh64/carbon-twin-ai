from app.repositories.base_repository import BaseRepository
from datetime import datetime, timezone
from typing import List, Dict, Any, cast
from google.cloud.firestore import DocumentSnapshot

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
                "saved_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            }
            doc_ref.set(data)
            return data
        except Exception as e:
            self._handle_error("create", e)

    def list_scenarios(self, user_id: str) -> List[Dict[str, Any]]:
        try:
            query = self.collection.where("user_id", "==", user_id).stream()
            docs = []
            for doc in query:
                d = doc.to_dict()
                if d is not None:
                    docs.append(d)
            docs.sort(key=lambda x: x.get("saved_at", ""), reverse=True)
            return docs
        except Exception as e:
            self._handle_error("list", e)

    def delete_scenario(self, user_id: str, scenario_id: str) -> bool:
        try:
            doc_ref = self.collection.document(scenario_id)
            doc = cast(DocumentSnapshot, doc_ref.get())
            if doc.exists:
                doc_data = doc.to_dict()
                if doc_data is not None and doc_data.get("user_id") == user_id:
                    doc_ref.delete()
                    return True
            return False
        except Exception as e:
            self._handle_error("delete", e)
