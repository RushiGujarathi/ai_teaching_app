"""
routers/ml.py
--------------
FastAPI router exposing ML model capabilities:

  GET  /api/ml/status          → is the model loaded?
  GET  /api/ml/evaluation      → training metrics for all 3 models
  GET  /api/ml/dataset/stats   → summary statistics of cleaned dataset
  GET  /api/ml/dataset/sample  → first N rows of raw dataset
  POST /api/ml/predict         → predict final_score from student features
  GET  /api/ml/feature-importance → top feature importances
  POST /api/ml/train           → re-run full pipeline (admin endpoint)
"""

import os, sys, json
import numpy as np
import pandas as pd
import joblib

from fastapi  import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing   import Optional

# ── resolve paths relative to this file ──────────────────────────────────────
THIS_DIR   = os.path.dirname(os.path.abspath(__file__))
ML_DIR     = os.path.join(THIS_DIR, "..", "ml")  # backend/ml/
DATA_DIR   = os.path.join(ML_DIR, "data")
MODELS_DIR = os.path.join(ML_DIR, "models_saved")

SCALER_PATH  = os.path.join(MODELS_DIR, "scaler.pkl")
RF_PATH      = os.path.join(MODELS_DIR, "random_forest.pkl")
EVAL_PATH    = os.path.join(DATA_DIR,   "model_evaluation.json")
CLEANED_PATH = os.path.join(DATA_DIR,   "student_performance_cleaned.csv")
RAW_PATH     = os.path.join(DATA_DIR,   "student_performance_raw.csv")
FEAT_PATH    = os.path.join(DATA_DIR,   "feature_names.json")
STATS_PATH   = os.path.join(DATA_DIR,   "cleaning_stats.json")

router = APIRouter()

# ── lazy-load models once ────────────────────────────────────────────────────
_scaler  = None
_rf      = None
_features = None

def _load_artifacts():
    global _scaler, _rf, _features
    if _rf is None:
        if not os.path.exists(RF_PATH):
            raise RuntimeError("Model not found. Run /api/ml/train first.")
        _scaler   = joblib.load(SCALER_PATH)
        _rf       = joblib.load(RF_PATH)
        with open(FEAT_PATH) as f:
            _features = json.load(f)


# ── Pydantic schema ───────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    study_hours_per_day : float = Field(..., ge=0, le=20, description="Daily study hours (0–20)")
    attendance_pct      : float = Field(..., ge=0, le=100, description="Attendance percentage (0–100)")
    prev_score          : float = Field(..., ge=0, le=100, description="Previous exam score (0–100)")
    sleep_hours         : float = Field(7.0, ge=4, le=12,  description="Hours of sleep per night")
    tutoring_sessions   : int   = Field(0,   ge=0, le=10,  description="Tutoring sessions per month")
    parental_support    : int   = Field(1,   ge=0, le=2,   description="0=none,1=some,2=strong")
    internet_access     : int   = Field(1,   ge=0, le=1,   description="Internet at home (0/1)")
    gender              : str   = Field("male",              description="male or female")
    school_type         : str   = Field("public",            description="public or private")
    extracurricular     : int   = Field(0,   ge=0, le=1,   description="Extracurricular activities (0/1)")


# ── helpers ───────────────────────────────────────────────────────────────────
def _grade(score: float) -> str:
    if score >= 90: return "A+"
    if score >= 80: return "A"
    if score >= 70: return "B"
    if score >= 60: return "C"
    if score >= 50: return "D"
    return "F"

def _tier(score: float) -> str:
    if score >= 80: return "excellent"
    if score >= 60: return "good"
    if score >= 40: return "average"
    return "low"

def _build_input_df(req: PredictRequest, feature_names: list) -> pd.DataFrame:
    """
    Reconstruct a 1-row DataFrame whose columns match the training features
    (after OHE + feature engineering + scaling).
    """
    raw = {
        "study_hours_per_day" : req.study_hours_per_day,
        "attendance_pct"      : req.attendance_pct,
        "prev_score"          : req.prev_score,
        "sleep_hours"         : req.sleep_hours,
        "tutoring_sessions"   : req.tutoring_sessions,
        "parental_support"    : req.parental_support,
        "internet_access"     : req.internet_access,
        "extracurricular"     : req.extracurricular,
    }
    row = {f: 0.0 for f in feature_names}  # initialise all cols to 0

    # Copy numeric
    for k, v in raw.items():
        if k in row:
            row[k] = float(v)

    # OHE: gender
    if req.gender == "male" and "gender_male" in row:
        row["gender_male"] = 1.0

    # OHE: school_type
    if req.school_type == "private" and "school_type_private" in row:
        row["school_type_private"] = 1.0

    # Feature engineering
    if "study_efficiency" in row:
        row["study_efficiency"] = req.study_hours_per_day * req.attendance_pct / 100

    # performance_tier OHE from prev_score
    tier = _tier(req.prev_score)
    for t in ["average", "excellent", "good", "low"]:
        key = f"performance_tier_{t}"
        if key in row:
            row[key] = 1.0 if t == tier else 0.0

    df = pd.DataFrame([row])[feature_names]
    return df


def _scale_input(df: pd.DataFrame, scaler, feature_names: list) -> pd.DataFrame:
    # Replicate the same columns that were scaled during training
    with open(STATS_PATH) as f:
        stats = json.load(f)
    scale_cols = [c for c in stats.get("scaled_columns", []) if c in df.columns]
    df[scale_cols] = scaler.transform(df[scale_cols])
    return df


# ── routes ────────────────────────────────────────────────────────────────────
@router.get("/status")
def ml_status():
    model_ready = os.path.exists(RF_PATH) and os.path.exists(SCALER_PATH)
    return {
        "model_ready"  : model_ready,
        "model_path"   : RF_PATH,
        "dataset_ready": os.path.exists(CLEANED_PATH),
    }


@router.get("/evaluation")
def get_evaluation():
    if not os.path.exists(EVAL_PATH):
        raise HTTPException(404, "Evaluation file not found. Run /api/ml/train first.")
    with open(EVAL_PATH) as f:
        return json.load(f)


@router.get("/dataset/stats")
def dataset_stats():
    if not os.path.exists(CLEANED_PATH):
        raise HTTPException(404, "Cleaned dataset not found.")
    df = pd.read_csv(CLEANED_PATH)
    desc = df.describe().round(3).to_dict()
    return {
        "shape"  : list(df.shape),
        "columns": list(df.columns),
        "stats"  : desc,
        "missing": int(df.isnull().sum().sum()),
    }


@router.get("/dataset/sample")
def dataset_sample(n: int = 20):
    if not os.path.exists(RAW_PATH):
        raise HTTPException(404, "Raw dataset not found.")
    df = pd.read_csv(RAW_PATH).head(n)
    return {"sample": df.to_dict(orient="records")}


@router.post("/predict")
def predict(req: PredictRequest):
    try:
        _load_artifacts()
        df = _build_input_df(req, _features)
        df = _scale_input(df, _scaler, _features)
        pred = float(np.clip(_rf.predict(df)[0], 0, 100))
        return {
            "predicted_score": round(pred, 2),
            "grade"          : _grade(pred),
            "performance"    : _tier(pred),
            "input_summary"  : req.dict(),
        }
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/feature-importance")
def feature_importance():
    if not os.path.exists(EVAL_PATH):
        raise HTTPException(404, "Run /api/ml/train first.")
    with open(EVAL_PATH) as f:
        data = json.load(f)
    rf_data = next((m for m in data["models"] if "Random Forest" in m["model"]), None)
    return {"importances": rf_data["feature_importance"] if rf_data else []}


@router.post("/train")
def retrain():
    """Re-run the full ML pipeline (generate → clean → train)."""
    try:
        sys.path.insert(0, ML_DIR)
        import generate_dataset, data_cleaning, train_model

        generate_dataset.generate()
        df_raw = generate_dataset.generate()
        df_raw.to_csv(os.path.join(DATA_DIR, "student_performance_raw.csv"), index=False)

        data_cleaning.run_pipeline()
        result = train_model.run()

        # Reset cached models
        global _scaler, _rf, _features
        _scaler = _rf = _features = None

        return {"status": "success", "summary": result}
    except Exception as e:
        raise HTTPException(500, f"Training failed: {str(e)}")
