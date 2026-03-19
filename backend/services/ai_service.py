import os
import requests
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = """You are a helpful, friendly AI teaching assistant for students and teachers.
You help with:
- Answering subject-related questions clearly
- Explaining concepts in simple language
- Generating quizzes and assessments
- Creating lesson plans
- Providing study tips and encouragement
Always be encouraging, patient, and adapt your language to the student's level."""


def call_groq(messages: list) -> str:
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 2048
    }
    try:
        response = requests.post(GROQ_URL, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]
    except requests.exceptions.RequestException as e:
        raise Exception(f"Groq API error: {str(e)}")
    except (KeyError, IndexError) as e:
        raise Exception(f"Unexpected Groq response: {str(e)}")


def chat_with_ai(messages: list, subject: str = None) -> str:
    system = SYSTEM_PROMPT
    if subject:
        system += f"\n\nCurrent subject: {subject}"

    full_messages = [{"role": "system", "content": system}] + messages
    return call_groq(full_messages)


def generate_quiz_ai(topic: str, num_questions: int = 5, difficulty: str = "medium") -> str:
    prompt = f"""Generate a {difficulty} difficulty quiz on: "{topic}"
Create exactly {num_questions} multiple choice questions.
IMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, no extra text.

{{
  "topic": "{topic}",
  "difficulty": "{difficulty}",
  "questions": [
    {{
      "id": 1,
      "question": "Question text?",
      "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
      "correct": "A",
      "explanation": "Why A is correct"
    }}
  ]
}}"""
    return call_groq([{"role": "user", "content": prompt}])


def generate_lesson_ai(topic: str, grade_level: str, duration: str) -> str:
    prompt = f"""Create a lesson plan for Topic: {topic}, Grade: {grade_level}, Duration: {duration}
IMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, no extra text.

{{
  "topic": "{topic}",
  "grade_level": "{grade_level}",
  "duration": "{duration}",
  "objectives": ["Objective 1", "Objective 2", "Objective 3"],
  "materials": ["Material 1", "Material 2"],
  "introduction": "Introduction description",
  "main_content": [
    {{"time": "10 min", "activity": "Activity name", "description": "What to do"}},
    {{"time": "15 min", "activity": "Activity name", "description": "What to do"}}
  ],
  "assessment": "Assessment method",
  "homework": "Homework assignment",
  "teacher_notes": "Tips for teacher"
}}"""
    return call_groq([{"role": "user", "content": prompt}])