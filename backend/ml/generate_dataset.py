"""
generate_dataset.py
--------------------
Generates a realistic synthetic student performance dataset.

Features created:
  - study_hours_per_day    : float  [0.5 – 10]
  - attendance_pct         : float  [40 – 100]
  - prev_score             : float  [20 – 100]  (previous exam score)
  - sleep_hours            : float  [4 – 10]
  - tutoring_sessions      : int    [0 – 10]   (sessions per month)
  - parental_support       : int    [0|1|2]    (none / some / strong)
  - internet_access        : int    [0|1]
  - gender                 : str    male / female
  - school_type            : str    public / private
  - extracurricular        : int    [0|1]
  - final_score            : float  [0 – 100]  ← TARGET

Design rationale (for the report):
  final_score is a noisy linear function of the features so that
  regression models can learn meaningful weights.
"""

import numpy as np
import pandas as pd
import os

SEED = 42
N    = 600          # total students
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
OUT_PATH = os.path.join(DATA_DIR, "student_performance_raw.csv")

def generate(n: int = N, seed: int = SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    study_hours      = rng.uniform(0.5, 10,  n).round(1)
    attendance_pct   = rng.uniform(40,  100, n).round(1)
    prev_score       = rng.uniform(20,  100, n).round(1)
    sleep_hours      = rng.uniform(4,   10,  n).round(1)
    tutoring         = rng.integers(0,  11,  n)          # 0-10
    parental_support = rng.integers(0,  3,   n)          # 0,1,2
    internet_access  = rng.integers(0,  2,   n)          # 0,1
    gender           = rng.choice(["male", "female"],  n)
    school_type      = rng.choice(["public","private"], n, p=[0.65, 0.35])
    extracurricular  = rng.integers(0, 2, n)             # 0,1

    # ---------- deterministic target with controlled noise ----------
    score = (
          4.2  * study_hours
        + 0.30 * attendance_pct
        + 0.35 * prev_score
        + 1.5  * sleep_hours
        + 1.8  * tutoring
        + 3.0  * parental_support
        + 4.0  * internet_access
        + 3.5  * (school_type == "private").astype(int)
        - 1.0  * extracurricular          # slight distraction
        + rng.normal(0, 6, n)             # Gaussian noise
    )
    # Clip to [0, 100]
    score = np.clip(score, 0, 100).round(2)

    df = pd.DataFrame({
        "study_hours_per_day" : study_hours,
        "attendance_pct"      : attendance_pct,
        "prev_score"          : prev_score,
        "sleep_hours"         : sleep_hours,
        "tutoring_sessions"   : tutoring,
        "parental_support"    : parental_support,
        "internet_access"     : internet_access,
        "gender"              : gender,
        "school_type"         : school_type,
        "extracurricular"     : extracurricular,
        "final_score"         : score,
    })

    # ---------- inject realistic messiness ----------
    # 5 % missing values in a few columns
    for col in ["study_hours_per_day", "sleep_hours", "attendance_pct"]:
        mask = rng.random(n) < 0.05
        df.loc[mask, col] = np.nan

    # 3 % duplicate rows
    dup_idx = rng.choice(n, int(n * 0.03), replace=False)
    df = pd.concat([df, df.iloc[dup_idx]], ignore_index=True)

    # A handful of outliers
    outlier_idx = rng.choice(len(df), 8, replace=False)
    df.loc[outlier_idx, "study_hours_per_day"] = rng.uniform(12, 20, 8).round(1)

    return df


if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)
    df = generate()
    df.to_csv(OUT_PATH, index=False)
    print(f"✅  Raw dataset saved → {OUT_PATH}")
    print(f"   Shape  : {df.shape}")
    print(f"   Columns: {list(df.columns)}")
    print(df.describe().round(2).to_string())
