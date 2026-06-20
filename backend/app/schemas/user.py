from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import List, Optional
from app.core.security import sanitize_string

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    name: str = Field(..., min_length=1, max_length=100, description="Name is required")

    @field_validator("name", mode="before")
    @classmethod
    def clean_name(cls, v):
        return sanitize_string(v) if isinstance(v, str) else v

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class GoogleLoginRequest(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    image: Optional[str] = None
    google_id: Optional[str] = None

    @field_validator("name", mode="before")
    @classmethod
    def clean_name(cls, v):
        return sanitize_string(v) if isinstance(v, str) else v

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    providers: List[str]
    created_at: str
    image: Optional[str] = None

