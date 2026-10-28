from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..services import ai_analyst

router = APIRouter(prefix="/api", tags=["ai"])


class Message(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(max_length=8000)


class ChatRequest(BaseModel):
    messages: list[Message] = Field(min_length=1, max_length=40)


@router.post("/chat")
def chat(req: ChatRequest):
    try:
        return ai_analyst.ask([m.model_dump() for m in req.messages])
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"The AI analyst could not answer: {exc}") from exc
