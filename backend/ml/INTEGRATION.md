# ML Module — Integration Guide

## Directory Structure After Integration

```
your-project/
├── backend/
│   ├── ml/                          ← NEW: copy entire ml_module/ here
│   │   ├── generate_dataset.py
│   │   ├── data_cleaning.py
│   │   ├── train_model.py
│   │   ├── data/                    ← auto-created by scripts
│   │   │   ├── student_performance_raw.csv
│   │   │   ├── student_performance_cleaned.csv
│   │   │   ├── model_evaluation.json
│   │   │   ├── feature_names.json
│   │   │   └── cleaning_stats.json
│   │   └── models_saved/            ← auto-created by training
│   │       ├── linear_regression.pkl
│   │       ├── random_forest.pkl
│   │       └── scaler.pkl
│   ├── routers/
│   │   ├── ml.py                    ← NEW: copy ml_router.py → routers/ml.py
│   │   ├── chat.py
│   │   └── ...
│   ├── main.py                      ← EDIT: add 2 lines
│   └── requirements.txt             ← EDIT: add 3 packages
│
└── frontend/
    └── src/
        ├── pages/
        │   └── MLPage.js            ← NEW: copy MLPage.js here
        └── App.js                   ← EDIT: add route + nav link
```

---

## Step 1 — Copy Files

```bash
# From your project root:
cp -r ml_module/  backend/ml/
cp ml_module/ml_router.py  backend/routers/ml.py
cp ml_module/MLPage.js     frontend/src/pages/MLPage.js
```

---

## Step 2 — Update backend/requirements.txt

Add these lines:
```
scikit-learn==1.5.0
pandas==2.2.0
numpy==1.26.0
joblib==1.4.0
```

---

## Step 3 — Edit backend/main.py

Add these two lines (shown in context):

```python
# EXISTING imports
from routers import chat, quiz, lesson, progress
# ADD THIS:
from routers import ml as ml_router

# EXISTING router includes
app.include_router(progress.router, prefix="/api/progress", tags=["Progress"])
# ADD THIS:
app.include_router(ml_router.router, prefix="/api/ml", tags=["ML"])
```

---

## Step 4 — Edit frontend/src/App.js

```jsx
// ADD import at top
import MLPage from './pages/MLPage';

// ADD nav link (inside <div className="nav-links">)
<NavLink to="/ml" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
  🤖 ML
</NavLink>

// ADD route (inside <Routes>)
<Route path="/ml" element={<MLPage />} />
```

---

## Step 5 — Train the Models

```bash
cd backend/ml
python generate_dataset.py   # creates raw CSV (618 rows)
python data_cleaning.py      # cleans + engineers features → 601 rows, 16 cols
python train_model.py        # trains 3 models, saves .pkl files
```

Or just hit the API endpoint once the server starts:
```
POST http://localhost:8000/api/ml/train
```

---

## Step 6 — Install & Run

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## API Endpoints Reference

| Method | Endpoint                    | Description                        |
|--------|-----------------------------|------------------------------------|
| GET    | /api/ml/status              | Check if model files exist         |
| GET    | /api/ml/evaluation          | MAE, RMSE, R² for all 3 models     |
| GET    | /api/ml/feature-importance  | Top features by RF importance      |
| GET    | /api/ml/dataset/stats       | Dataset shape, describe() stats    |
| GET    | /api/ml/dataset/sample?n=20 | First N rows of raw dataset        |
| POST   | /api/ml/predict             | Predict score from student profile |
| POST   | /api/ml/train               | Re-run full pipeline               |

### POST /api/ml/predict — Example Body
```json
{
  "study_hours_per_day": 6.0,
  "attendance_pct": 85.0,
  "prev_score": 72.0,
  "sleep_hours": 7.5,
  "tutoring_sessions": 4,
  "parental_support": 1,
  "internet_access": 1,
  "gender": "female",
  "school_type": "public",
  "extracurricular": 0
}
```

### Response
```json
{
  "predicted_score": 82.47,
  "grade": "A",
  "performance": "excellent",
  "input_summary": { ... }
}
```

---

## ML Concepts Implemented

| Concept                  | Where                              |
|--------------------------|------------------------------------|
| Synthetic data generation| generate_dataset.py                |
| Outlier handling (IQR)   | data_cleaning.py → cap_outliers()  |
| Missing value imputation | data_cleaning.py → impute_missing()|
| One-Hot Encoding         | data_cleaning.py → encode_categoricals()|
| Feature Engineering      | data_cleaning.py → feature_engineering()|
| StandardScaler           | data_cleaning.py → scale_features()|
| Linear/Ridge Regression  | train_model.py                     |
| Random Forest Regressor  | train_model.py                     |
| Gradient Boosting        | train_model.py                     |
| Train/Test Split (80/20) | train_model.py → split()           |
| 5-Fold Cross Validation  | train_model.py → evaluate()        |
| MAE / RMSE / R² metrics  | train_model.py → evaluate()        |
| Feature Importance       | train_model.py → get_feature_importance()|
| Model Serialisation      | joblib.dump / joblib.load          |
| REST inference API       | routers/ml.py                      |
