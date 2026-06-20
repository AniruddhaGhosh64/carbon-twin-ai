from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from app.core.security import sanitize_string

class MissionCheckIn(BaseModel):
    date: str
    status: str  # "completed", "missed"
    verified_auto: bool

class MissionConfig(BaseModel):
    target_frequency: str = Field(..., min_length=1, max_length=50)
    start_date: str        # ISO timestamp
    end_date: str          # ISO timestamp
    notes: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("target_frequency", "notes", mode="before")
    @classmethod
    def sanitize_config_fields(cls, v):
        return sanitize_string(v) if isinstance(v, str) else v

class EcoMission(BaseModel):
    id: str
    user_id: str
    action_id: str
    title: str
    description: str
    source: str           # "dashboard", "coach", "twin", "simulator", "manual"
    status: str           # "suggested", "active", "completed", "archived"
    carbon_reduction_kg: float
    money_saved_usd: float
    effort_level: str     # "low", "moderate", "high", "transformational"
    success_probability: float
    config: Optional[MissionConfig] = None
    check_ins: List[MissionCheckIn] = Field(default_factory=list)

class AdoptMissionRequest(BaseModel):
    action_id: str = Field(..., min_length=1, max_length=100)
    source: str = Field(..., min_length=1, max_length=50)
    config: MissionConfig

    @field_validator("action_id", "source", mode="before")
    @classmethod
    def sanitize_adopt_fields(cls, v):
        return sanitize_string(v) if isinstance(v, str) else v

class CustomMissionRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=500)
    carbon_reduction_kg: float = Field(ge=0)
    money_saved_usd: float = Field(ge=0)
    effort_level: str = Field(..., min_length=1, max_length=50)
    config: MissionConfig

    @field_validator("title", "description", "effort_level", mode="before")
    @classmethod
    def sanitize_custom_fields(cls, v):
        return sanitize_string(v) if isinstance(v, str) else v

