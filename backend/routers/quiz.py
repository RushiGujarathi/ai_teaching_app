from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from models.database import get_db
from services.ai_service import generate_quiz_ai
import json

router = APIRouter()

class QuizRequest(BaseModel):
    topic: str
    num_questions: int = 5
    difficulty: str = "medium"

class QuizAttempt(BaseModel):
    student_name: str
    quiz_id: int
    answers: dict
    questions: list

@router.post("/generate")
def generate_quiz(request: QuizRequest):
    try:
        raw = generate_quiz_ai(request.topic, request.num_questions, request.difficulty)
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        clean = clean.strip()
        quiz_data = json.loads(clean)
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO quizzes (topic, difficulty, questions) VALUES (?, ?, ?)",
            (request.topic, request.difficulty, json.dumps(quiz_data["questions"]))
        )
        quiz_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return {"quiz_id": quiz_id, **quiz_data}
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI did not return valid JSON. Try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/submit")
def submit_quiz(attempt: QuizAttempt):
    try:
        score = 0
        results = []
        for q in attempt.questions:
            qid = str(q["id"])
            student_ans = attempt.answers.get(qid, "")
            is_correct = student_ans == q["correct"]
            if is_correct:
                score += 1
            results.append({
                "question": q["question"],
                "your_answer": student_ans,
                "correct_answer": q["correct"],
                "is_correct": is_correct,
                "explanation": q.get("explanation", "")
            })
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO quiz_attempts (student_name, quiz_id, score, total, answers) VALUES (?, ?, ?, ?, ?)",
            (attempt.student_name, attempt.quiz_id, score, len(attempt.questions), json.dumps(attempt.answers))
        )
        conn.commit()
        conn.close()
        return {
            "score": score,
            "total": len(attempt.questions),
            "percentage": round((score / len(attempt.questions)) * 100),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/attempts/{student_name}")
def get_attempts(student_name: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT qa.*, q.topic FROM quiz_attempts qa
           LEFT JOIN quizzes q ON qa.quiz_id = q.id
           WHERE qa.student_name = ? ORDER BY qa.created_at DESC""",
        (student_name,)
    )
    attempts = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"attempts": attempts}
