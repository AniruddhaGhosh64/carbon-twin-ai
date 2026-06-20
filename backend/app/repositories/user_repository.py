from typing import Optional, Dict, Any
from app.repositories.base_repository import BaseRepository

class UserRepository(BaseRepository):
    def __init__(self):
        super().__init__("users")

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        try:
            # We use email as the document ID for simple, guaranteed unique lookup
            doc: Any = self.collection.document(email.lower()).get()
            if doc.exists:
                data = doc.to_dict()
                if data:
                    data["id"] = doc.id
                    return data
            return None
        except Exception as e:
            self._handle_error("get_user_by_email", e)
            return None

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            doc: Any = self.collection.document(user_id).get()
            if doc.exists:
                data = doc.to_dict()
                if data:
                    data["id"] = doc.id
                    return data
            return None
        except Exception as e:
            self._handle_error("get_user_by_id", e)
            return None

    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            email = user_data["email"].lower()
            # Enforce document ID as email
            self.collection.document(email).set(user_data)
            user_data["id"] = email
            return user_data
        except Exception as e:
            self._handle_error("create_user", e)
            return {}

    def update_user_providers(self, email: str, providers: list) -> bool:
        try:
            self.collection.document(email.lower()).update({
                "providers": providers
            })
            return True
        except Exception as e:
            self._handle_error("update_user_providers", e)
            return False
