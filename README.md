# 🎓 AI Teaching Assistance Project

A full-stack AI-powered teaching assistant built with **React** (Frontend) and **Python 3.9 + FastAPI** (Backend).

---

## 📁 Complete Project Structure

```
ai-teaching-app/
├── backend/
│   ├── main.py                  ← FastAPI app entry point
│   ├── requirements.txt         ← Python dependencies
│   ├── .env.example             ← API key template
│   ├── models/
│   │   ├── __init__.py
│   │   └── database.py          ← SQLite database setup
│   ├── services/
│   │   ├── __init__.py
│   │   └── ai_service.py        ← Anthropic Claude API integration
│   └── routers/
│       ├── __init__.py
│       ├── chat.py              ← /api/chat endpoints
│       ├── quiz.py              ← /api/quiz endpoints
│       ├── lesson.py            ← /api/lesson endpoints
│       └── progress.py          ← /api/progress endpoints
│
└── frontend/
    ├── package.json
    └── src/
        ├── index.js             ← React entry point
        ├── App.js               ← Router + Navbar + Login
        ├── App.css              ← All styles
        ├── services/
        │   └── api.js           ← Axios API service
        └── pages/
            ├── ChatPage.js      ← AI Chat interface
            ├── QuizPage.js      ← Quiz generator & results
            ├── LessonPage.js    ← Lesson plan creator
            └── ProgressPage.js  ← Student progress tracker
```

---

## 🚀 Setup & Run Instructions

### Step 1 — Get Anthropic API Key (FREE)
1. Go to: https://console.anthropic.com
2. Sign up / Login
3. Click "API Keys" → "Create Key"
4. Copy the key

---

### Step 2 — Backend Setup (Python 3.9)

```bash
# Navigate to backend folder
cd ai-teaching-app/backend

# Create virtual environment (recommended)
python3.9 -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Open .env and add your API key:
# ANTHROPIC_API_KEY=sk-ant-your-key-here

# Run the backend server
uvicorn main:app --reload --port 8000
```

Backend will start at: http://localhost:8000
API Docs (Swagger): http://localhost:8000/docs

---

### Step 3 — Frontend Setup (React)

Open a NEW terminal:

```bash
# Navigate to frontend folder
cd ai-teaching-app/frontend

# Install dependencies
npm install

# Start React app
npm start
```

Frontend will open at: http://localhost:3000

---

## ✅ Features

| Feature | Description |
|---------|-------------|
| 💬 AI Chat | Subject-wise Q&A powered by Claude AI |
| 📝 Quiz Generator | Auto-generate MCQ quizzes by topic & difficulty |
| 📚 Lesson Planner | Create complete lesson plans for any grade |
| 📊 Progress Tracker | Track student scores, quiz history, activity |

---

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/chat/ | Send chat message to AI |
| GET | /api/chat/history/{name} | Get chat history |
| POST | /api/quiz/generate | Generate AI quiz |
| POST | /api/quiz/submit | Submit quiz answers |
| GET | /api/quiz/attempts/{name} | Get quiz history |
| POST | /api/lesson/generate | Generate lesson plan |
| GET | /api/lesson/all | Get all saved lessons |
| POST | /api/progress/student | Create student |
| GET | /api/progress/student/{name} | Get student progress |
| GET | /api/progress/students | List all students |

---

## 🛠 Tech Stack

- **Frontend**: React 18, React Router v6, Axios, React Markdown
- **Backend**: Python 3.9, FastAPI, Uvicorn, Pydantic v2
- **Database**: SQLite (no setup required!)
- **AI**: Anthropic Claude (claude-sonnet-4-20250514)

---

## 🐛 Troubleshooting

**CORS Error?**
→ Make sure backend is running on port 8000

**API Key Error?**
→ Check .env file has correct ANTHROPIC_API_KEY

**Module not found?**
→ Run `pip install -r requirements.txt` again

**React not starting?**
→ Run `npm install` in frontend folder

---

## 📞 Support
Built with ❤️ using React + FastAPI + Claude AI
