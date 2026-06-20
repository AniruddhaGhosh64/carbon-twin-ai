from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    GEMINI_API_KEY: str = ""
    GEMINI_API_KEY_1: str = ""
    GEMINI_API_KEY_2: str = ""
    GEMINI_API_KEY_3: str = ""
    FIREBASE_PROJECT_ID: str = "carbontwin-ai-a7244"
    FIREBASE_CREDENTIALS_PATH: Optional[str] = None
    JWT_SECRET: str
    FRONTEND_URL: str = "http://localhost:3000"

    @property
    def gemini_api_keys(self) -> list[str]:
        keys = []
        for k in [self.GEMINI_API_KEY_1, self.GEMINI_API_KEY_2, self.GEMINI_API_KEY_3, self.GEMINI_API_KEY]:
            if k and k.strip():
                keys.append(k.strip())
        # Deduplicate preserving order
        seen = set()
        return [x for x in keys if not (x in seen or seen.add(x))]

settings = Settings()


