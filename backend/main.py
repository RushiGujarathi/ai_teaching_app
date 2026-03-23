from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import chat, quiz, lesson, progress
from routers import ml as ml_router          # NEW
from models.database import init_db
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AI Teaching Assistant API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    init_db()

app.include_router(chat.router,       prefix="/api/chat",     tags=["Chat"])
app.include_router(quiz.router,       prefix="/api/quiz",     tags=["Quiz"])
app.include_router(lesson.router,     prefix="/api/lesson",   tags=["Lesson"])
app.include_router(progress.router,   prefix="/api/progress", tags=["Progress"])
app.include_router(ml_router.router,  prefix="/api/ml",       tags=["ML"])   # NEW

@app.get("/")
def root():
    return {"message": "AI Teaching Assistant API is running!"}
