# AI Teaching Assistant — Complete Project with ML Module

## What's Inside

```
full_project/
├── backend/          ← FastAPI Python server
│   ├── ml/           ← NEW: ML scripts + trained models + dataset
│   ├── routers/      ← API route handlers (chat, quiz, lesson, progress, ml)
│   ├── models/       ← SQLite database setup
│   ├── services/     ← Groq AI service
│   ├── main.py       ← FastAPI app entry point
│   ├── requirements.txt
│   └── .env          ← Put your GROQ_API_KEY here
│
└── frontend/         ← React app
    └── src/
        ├── pages/    ← ChatPage, QuizPage, LessonPage, ProgressPage, MLPage
        ├── services/ ← API calls
        ├── App.js    ← Routes + navbar
        └── App.css
```

---

## STEP-BY-STEP: How to Run

### Prerequisites
- Python 3.10 or higher → https://python.org/downloads
- Node.js 18 or higher  → https://nodejs.org
- A Groq API key        → https://console.groq.com (free)

---

### Step 1 — Add Your Groq API Key

Open `backend/.env` and replace the placeholder:

```
GROQ_API_KEY=your_actual_key_here
```

---

### Step 2 — Setup & Run the Backend

Open a terminal and run:

```bash
# Go into the backend folder
cd full_project/backend

# Create a virtual environment (recommended)
python -m venv venv

# Activate it:
# On Windows:
 Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install all dependencies
pip install -r requirements.txt

# Start the backend server
uvicorn main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

Test it: open http://localhost:8000 in your browser → you should see `{"message":"AI Teaching Assistant API is running!"}`

---

### Step 3 — Train the ML Models (one-time setup)

Open a **second terminal** (keep the backend running in the first one):

```bash
cd full_project/backend/ml

# 1. Generate the dataset (600 synthetic students)
python generate_dataset.py

# 2. Clean the data (remove duplicates, fix missing values, engineer features)
python data_cleaning.py

# 3. Train the models (Ridge Regression + Random Forest + Gradient Boosting)
python train_model.py
```

Expected output from train_model.py:
```
Ridge Regression  → R² = 0.70
Random Forest     → R² = 0.77
Gradient Boosting → R² = 0.79  ← Best model
✅ Models saved → models_saved/
```

> NOTE: If you skip this step, the ML page will show "Model not found".
> The pre-trained .pkl files are already included in the zip so you can skip this on first run.

---

### Step 4 — Setup & Run the Frontend

Open a **third terminal**:

```bash
# Go into the frontend folder
cd full_project/frontend

# Install Node.js packages
npm install

# Start the React development server
npm start
```

The browser will automatically open http://localhost:3000

---

### Step 5 — Use the App!

1. Enter your name on the login screen
2. Navigate using the top navbar:
   - 💬 **Chat** — Ask AI questions about any subject
   - 📝 **Quiz** — Generate custom quizzes with AI
   - 📚 **Lesson** — Create lesson plans (for teachers)
   - 📊 **Progress** — Track quiz scores and activity
   - 🤖 **ML** — ML Score Predictor (4 tabs below)

#### ML Page Tabs:
| Tab | What it shows |
|-----|--------------|
| 📊 Overview | Model comparison table, ML pipeline diagram, all 12 ML concepts explained |
| 🔮 Predict | Fill student profile with sliders → get predicted final score + grade |
| 🗂 Dataset | Sample of raw student data + all cleaning steps explained |
| 🔬 Features | Bar chart of Random Forest feature importances |

---

## API Endpoints Reference

| Endpoint | Description |
|----------|-------------|
| GET  /api/ml/status | Check if model is loaded |
| GET  /api/ml/evaluation | MAE, RMSE, R² for all 3 models |
| GET  /api/ml/feature-importance | Top features by importance |
| GET  /api/ml/dataset/sample | Raw dataset preview |
| POST /api/ml/predict | Predict score from student profile |
| POST /api/ml/train | Retrain models (via browser button too) |

Full API docs: http://localhost:8000/docs (Swagger UI, auto-generated)

---

## ML Concepts Implemented

| Concept | File |
|---------|------|
| Synthetic data generation | `ml/generate_dataset.py` |
| Outlier capping (IQR Winsorisation) | `ml/data_cleaning.py` |
| Missing value imputation (median/mode) | `ml/data_cleaning.py` |
| One-Hot Encoding (gender, school_type) | `ml/data_cleaning.py` |
| Feature Engineering (study_efficiency) | `ml/data_cleaning.py` |
| StandardScaler (Z-score normalisation) | `ml/data_cleaning.py` |
| Ridge Regression | `ml/train_model.py` |
| Random Forest Regressor | `ml/train_model.py` |
| Gradient Boosting Regressor | `ml/train_model.py` |
| Train/Test Split (80/20) | `ml/train_model.py` |
| 5-Fold Cross Validation | `ml/train_model.py` |
| MAE / RMSE / R² evaluation | `ml/train_model.py` |
| Feature Importance | `ml/train_model.py` |
| Model serialisation (joblib) | `ml/train_model.py` |
| REST inference API | `backend/routers/ml.py` |

---

## Troubleshooting

**Backend won't start:**
- Make sure Python virtual environment is activated
- Run `pip install -r requirements.txt` again

**ML page shows "Model not found":**
- Run the 3 python scripts in `backend/ml/` (Step 3 above)
- Or click the "🔄 Retrain Model" button on the ML page

**Frontend shows network error:**
- Make sure the backend is running on port 8000
- Check: http://localhost:8000/docs

**Chat / Quiz / Lesson not working:**
- Make sure your GROQ_API_KEY is set in `backend/.env`
- Get a free key at: https://console.groq.com
