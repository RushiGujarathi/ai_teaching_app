from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from models.database import get_db

router = APIRouter()

class StudentCreate(BaseModel):
    name: str
    subject: str = None
    grade: str = None

@router.post("/student")
def create_student(student: StudentCreate):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO students (name, subject, grade) VALUES (?, ?, ?)",
            (student.name, student.subject, student.grade)
        )
        conn.commit()
        student_id = cursor.lastrowid
        conn.close()
        return {"id": student_id, "name": student.name, "message": "Student created!"}
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail="Student already exists or error: " + str(e))

@router.get("/student/{student_name}")
def get_progress(student_name: str):
    conn = get_db()
    cursor = conn.cursor()

    # Quiz stats
    cursor.execute(
        """SELECT COUNT(*) as total_quizzes,
                  AVG(score * 100.0 / total) as avg_score,
                  MAX(score * 100.0 / total) as best_score
           FROM quiz_attempts WHERE student_name = ?""",
        (student_name,)
    )
    quiz_stats = dict(cursor.fetchone())

    # Chat count
    cursor.execute(
        "SELECT COUNT(*) as total_chats FROM chat_history WHERE student_name = ? AND role = 'user'",
        (student_name,)
    )
    chat_stats = dict(cursor.fetchone())

    # Recent quiz attempts
    cursor.execute(
        """SELECT qa.score, qa.total, qa.created_at, q.topic
           FROM quiz_attempts qa LEFT JOIN quizzes q ON qa.quiz_id = q.id
           WHERE qa.student_name = ? ORDER BY qa.created_at DESC LIMIT 5""",
        (student_name,)
    )
    recent_quizzes = [dict(row) for row in cursor.fetchall()]

    conn.close()
    return {
        "student_name": student_name,
        "quiz_stats": quiz_stats,
        "chat_stats": chat_stats,
        "recent_quizzes": recent_quizzes
    }

@router.get("/students")
def list_students():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM students ORDER BY created_at DESC")
    students = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"students": students}
