"""
data_cleaning.py
-----------------
Loads the raw dataset, applies a full cleaning & feature-engineering
pipeline, and saves the cleaned version ready for model training.

Steps performed
===============
1.  Load raw CSV
2.  Drop exact duplicate rows
3.  Cap outliers with IQR fencing (Winsorisation)
4.  Impute missing values
        numeric  → median imputation
        categoric → mode imputation
5.  Encode categorical features (One-Hot)
6.  Feature engineering
        - study_efficiency  = study_hours * attendance_pct / 100
        - score_improvement = final_score - prev_score
        - performance_tier  = label bucketed from prev_score
7.  Scale numeric features (StandardScaler) — saved for inference
8.  Save cleaned CSV + fitted scaler
"""

import os
import json
import numpy as np
import pandas as pd
import joblib
from sklearn.preprocessing import StandardScaler

# ── paths ────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(__file__)
DATA_DIR   = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "models_saved")

RAW_PATH     = os.path.join(DATA_DIR, "student_performance_raw.csv")
CLEANED_PATH = os.path.join(DATA_DIR, "student_performance_cleaned.csv")
SCALER_PATH  = os.path.join(MODELS_DIR, "scaler.pkl")
STATS_PATH   = os.path.join(DATA_DIR, "cleaning_stats.json")

NUMERIC_FEATURES = [
    "study_hours_per_day",
    "attendance_pct",
    "prev_score",
    "sleep_hours",
    "tutoring_sessions",
    "parental_support",
    "internet_access",
    "extracurricular",
]

CAT_FEATURES = ["gender", "school_type"]


# ─────────────────────────────────────────────────────────────────────────────
def load_raw(path: str = RAW_PATH) -> pd.DataFrame:
    df = pd.read_csv(path)
    print(f"[1/7] Loaded  : {df.shape[0]} rows, {df.shape[1]} cols")
    return df


def drop_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    before = len(df)
    df = df.drop_duplicates().reset_index(drop=True)
    print(f"[2/7] Duplicates removed : {before - len(df)}")
    return df


def cap_outliers(df: pd.DataFrame) -> pd.DataFrame:
    """IQR-based Winsorisation for numeric columns (excludes target)."""
    capped = 0
    cols = [c for c in NUMERIC_FEATURES if c in df.columns]
    for col in cols:
        Q1, Q3 = df[col].quantile(0.25), df[col].quantile(0.75)
        IQR = Q3 - Q1
        lo, hi = Q1 - 1.5 * IQR, Q3 + 1.5 * IQR
        mask = (df[col] < lo) | (df[col] > hi)
        capped += mask.sum()
        df[col] = df[col].clip(lo, hi)
    print(f"[3/7] Outlier values capped : {capped}")
    return df


def impute_missing(df: pd.DataFrame) -> pd.DataFrame:
    missing_before = df.isnull().sum().sum()
    # Numeric → median
    for col in NUMERIC_FEATURES:
        if col in df.columns and df[col].isnull().any():
            df[col] = df[col].fillna(df[col].median())
    # Categorical → mode
    for col in CAT_FEATURES:
        if col in df.columns and df[col].isnull().any():
            df[col] = df[col].fillna(df[col].mode()[0])
    print(f"[4/7] Missing values filled : {missing_before}")
    return df


def encode_categoricals(df: pd.DataFrame) -> pd.DataFrame:
    df = pd.get_dummies(df, columns=CAT_FEATURES, drop_first=True)
    print(f"[5/7] After OHE : {df.shape[1]} columns")
    return df


def feature_engineering(df: pd.DataFrame) -> pd.DataFrame:
    # study_efficiency: how well study time translates (weighted by attendance)
    if "study_hours_per_day" in df.columns and "attendance_pct" in df.columns:
        df["study_efficiency"] = (
            df["study_hours_per_day"] * df["attendance_pct"] / 100
        ).round(3)

    # score_improvement: difference from previous exam
    if "prev_score" in df.columns and "final_score" in df.columns:
        df["score_improvement"] = (df["final_score"] - df["prev_score"]).round(2)

    # performance_tier based on previous score
    if "prev_score" in df.columns:
        df["performance_tier"] = pd.cut(
            df["prev_score"],
            bins=[0, 40, 60, 80, 100],
            labels=["low", "average", "good", "excellent"],
        ).astype(str)
        df = pd.get_dummies(df, columns=["performance_tier"], drop_first=True)

    print(f"[6/7] Feature engineering done. Cols: {df.shape[1]}")
    return df


def scale_features(df: pd.DataFrame) -> tuple[pd.DataFrame, StandardScaler, list]:
    """
    Fit StandardScaler on numeric features (excluding target + engineered booleans).
    Returns updated df, fitted scaler, list of scaled column names.
    """
    target = "final_score"
    # columns that are float/int but not binary flags, not target
    scale_cols = [
        c for c in df.select_dtypes(include=[np.number]).columns
        if c != target and df[c].nunique() > 2
    ]
    scaler = StandardScaler()
    df[scale_cols] = scaler.fit_transform(df[scale_cols])
    print(f"[7/7] Scaled {len(scale_cols)} numeric columns")
    return df, scaler, scale_cols


# ─────────────────────────────────────────────────────────────────────────────
def run_pipeline() -> pd.DataFrame:
    os.makedirs(DATA_DIR,   exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)

    df = load_raw()
    raw_shape = df.shape

    df = drop_duplicates(df)
    df = cap_outliers(df)
    df = impute_missing(df)
    df = encode_categoricals(df)
    df = feature_engineering(df)
    df, scaler, scaled_cols = scale_features(df)

    # Save artefacts
    df.to_csv(CLEANED_PATH, index=False)
    joblib.dump(scaler, SCALER_PATH)

    stats = {
        "raw_shape"        : list(raw_shape),
        "cleaned_shape"    : list(df.shape),
        "scaled_columns"   : scaled_cols,
        "final_columns"    : list(df.columns),
        "target"           : "final_score",
        "missing_remaining": int(df.isnull().sum().sum()),
    }
    with open(STATS_PATH, "w") as f:
        json.dump(stats, f, indent=2)

    print(f"\n✅  Cleaned dataset → {CLEANED_PATH}")
    print(f"   Final shape   : {df.shape}")
    print(f"   Scaler saved  → {SCALER_PATH}")
    return df


if __name__ == "__main__":
    run_pipeline()
