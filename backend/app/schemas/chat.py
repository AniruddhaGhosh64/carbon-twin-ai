from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from app.core.security import sanitize_string

class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the speaker: 'user' or 'model'")
    content: str = Field(..., description="Content of the message")

    @field_validator("role", "content", mode="before")
    @classmethod
    def sanitize_message_fields(cls, v):
        return sanitize_string(v) if isinstance(v, str) else v

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500, description="User query message")
    history: List[ChatMessage] = Field(default_factory=list, description="Previous conversation history")

    @field_validator("message", mode="before")
    @classmethod
    def sanitize_request_message(cls, v):
        return sanitize_string(v) if isinstance(v, str) else v

class ChatResponse(BaseModel):
    response: str = Field(..., description="AI response from the Carbon Coach")
