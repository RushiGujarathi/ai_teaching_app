from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from models.database import get_db
from services.ai_service import chat_with_ai
import json

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    student_name: str
    message: str
    subject: Optional[str] = None
    history: Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    response: str
    student_name: str

@router.post("/", response_model=ChatResponse)
def send_message(request: ChatRequest):
    try:
        messages = [{"role": m.role, "content": m.content} for m in request.history]
        messages.append({"role": "user", "content": request.message})

        ai_response = chat_with_ai(messages, request.subject)

        # Save to database
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO chat_history (student_name, role, message, subject) VALUES (?, ?, ?, ?)",
            (request.student_name, "user", request.message, request.subject)
        )
        cursor.execute(
            "INSERT INTO chat_history (student_name, role, message, subject) VALUES (?, ?, ?, ?)",
            (request.student_name, "assistant", ai_response, request.subject)
        )
        conn.commit()
        conn.close()

        return ChatResponse(response=ai_response, student_name=request.student_name)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{student_name}")
def get_history(student_name: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM chat_history WHERE student_name = ? ORDER BY created_at DESC LIMIT 50",
        (student_name,)
    )
    history = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"history": history}
