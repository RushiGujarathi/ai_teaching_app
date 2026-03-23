from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from models.database import get_db
from services.ai_service import generate_lesson_ai
import json

router = APIRouter()

class LessonRequest(BaseModel):
    topic: str
    grade_level: str
    duration: str = "45 minutes"

@router.post("/generate")
def generate_lesson(request: LessonRequest):
    try:
        raw = generate_lesson_ai(request.topic, request.grade_level, request.duration)
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        clean = clean.strip()
        lesson_data = json.loads(clean)
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO lesson_plans (topic, grade_level, duration, objectives, content) VALUES (?, ?, ?, ?, ?)",
            (request.topic, request.grade_level, request.duration,
             json.dumps(lesson_data.get("objectives", [])), json.dumps(lesson_data))
        )
        lesson_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return {"lesson_id": lesson_id, **lesson_data}
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI did not return valid JSON. Try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/all")
def get_all_lessons():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, topic, grade_level, duration, created_at FROM lesson_plans ORDER BY created_at DESC")
    lessons = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"lessons": lessons}

@router.get("/{lesson_id}")
def get_lesson(lesson_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM lesson_plans WHERE id = ?", (lesson_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Lesson not found")
    lesson = dict(row)
    lesson["content"] = json.loads(lesson["content"])
    return lesson
