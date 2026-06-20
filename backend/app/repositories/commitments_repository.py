from app.repositories.base_repository import BaseRepository
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any

class CommitmentsRepository(BaseRepository):
    def __init__(self):
        super().__init__("recommendation_commitments")
        self.missions_collection = self.db.collection("eco_missions")

    def get_commitments(self, user_id: str) -> list[str]:
        try:
            query = self.collection.where("user_id", "==", user_id).stream()
            commitments = []
            for doc in query:
                d = doc.to_dict()
                if d and d.get("committed", False):
                    commitments.append(d.get("action_id", ""))
            return commitments
        except Exception as e:
            self._handle_error("get_commitments", e)

    def set_commitment(self, user_id: str, action_id: str, committed: bool) -> dict:
        try:
            doc_id = f"{user_id}_{action_id}"
            doc_ref = self.collection.document(doc_id)
            data = {
                "id": doc_id,
                "user_id": user_id,
                "action_id": action_id,
                "committed": committed,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            doc_ref.set(data)
            return data
        except Exception as e:
            self._handle_error("set_commitment", e)

    def get_missions(self, user_id: str) -> List[Dict[str, Any]]:
        try:
            query = self.missions_collection.where("user_id", "==", user_id).stream()
            results = []
            for doc in query:
                if doc.exists:
                    d = doc.to_dict()
                    if d is not None:
                        results.append(d)
            return results
        except Exception as e:
            self._handle_error("get_missions", e)

    def get_mission(self, user_id: str, mission_id: str) -> Optional[Dict[str, Any]]:
        try:
            doc_ref = self.missions_collection.document(mission_id)
            doc = doc_ref.get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            self._handle_error("get_mission", e)

    def save_mission(self, user_id: str, mission_data: dict) -> dict:
        try:
            doc_id = mission_data["id"]
            doc_ref = self.missions_collection.document(doc_id)
            mission_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            doc_ref.set(mission_data)
            return mission_data
        except Exception as e:
            self._handle_error("save_mission", e)

    def delete_mission(self, user_id: str, mission_id: str) -> bool:
        try:
            doc_ref = self.missions_collection.document(mission_id)
            # Use get() on reference
            if doc_ref.get().exists:
                doc_ref.delete()
                return True
            return False
        except Exception as e:
            self._handle_error("delete_mission", e)
