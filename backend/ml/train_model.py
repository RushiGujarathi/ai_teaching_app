"""
train_model.py
---------------
Trains TWO regression models on the cleaned student-performance dataset:
  1. Linear Regression  – interpretable baseline
  2. Random Forest      – higher-accuracy ensemble

Workflow
========
1. Load cleaned CSV
2. Train / test split  (80 / 20, stratified by performance tier bucket)
3. Train both models
4. Evaluate: MAE, MSE, RMSE, R²
5. Cross-validation (5-fold) on training set
6. Feature importances (Random Forest)
7. Save both models + evaluation JSON
"""

import os
import json
import numpy as np
import pandas as pd
import joblib

from sklearn.linear_model   import LinearRegression, Ridge
from sklearn.ensemble       import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics        import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline       import Pipeline

# ── paths ────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(__file__)
DATA_DIR   = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "models_saved")

CLEANED_PATH = os.path.join(DATA_DIR, "student_performance_cleaned.csv")
EVAL_PATH    = os.path.join(DATA_DIR, "model_evaluation.json")

LR_PATH  = os.path.join(MODELS_DIR, "linear_regression.pkl")
RF_PATH  = os.path.join(MODELS_DIR, "random_forest.pkl")
FEAT_PATH = os.path.join(DATA_DIR,  "feature_names.json")

TARGET = "final_score"
SEED   = 42


# ─────────────────────────────────────────────────────────────────────────────
def load_data():
    df = pd.read_csv(CLEANED_PATH)
    # Drop helper columns not useful as model features
    drop_cols = ["score_improvement"]   # avoids data leakage
    df = df.drop(columns=[c for c in drop_cols if c in df.columns])

    X = df.drop(columns=[TARGET])
    y = df[TARGET]
    print(f"Features : {X.shape[1]}   |   Samples : {len(y)}")
    return X, y, list(X.columns)


def split(X, y):
    return train_test_split(X, y, test_size=0.2, random_state=SEED)


def evaluate(name, model, X_tr, X_te, y_tr, y_te):
    model.fit(X_tr, y_tr)
    y_pred = model.predict(X_te)

    mae  = mean_absolute_error(y_te, y_pred)
    mse  = mean_squared_error(y_te, y_pred)
    rmse = np.sqrt(mse)
    r2   = r2_score(y_te, y_pred)

    cv_scores = cross_val_score(model, X_tr, y_tr, cv=5, scoring="r2")

    result = {
        "model"      : name,
        "MAE"        : round(mae,  3),
        "MSE"        : round(mse,  3),
        "RMSE"       : round(rmse, 3),
        "R2"         : round(r2,   4),
        "CV_R2_mean" : round(cv_scores.mean(), 4),
        "CV_R2_std"  : round(cv_scores.std(),  4),
        "train_size" : len(X_tr),
        "test_size"  : len(X_te),
    }

    print(f"\n{'─'*40}")
    print(f"  {name}")
    print(f"  MAE  = {mae:.3f}")
    print(f"  RMSE = {rmse:.3f}")
    print(f"  R²   = {r2:.4f}")
    print(f"  CV R² = {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    return result


def get_feature_importance(model, feature_names):
    """Works for tree-based models; returns top features."""
    if hasattr(model, "feature_importances_"):
        imp = model.feature_importances_
        pairs = sorted(zip(feature_names, imp), key=lambda x: -x[1])
        return [{"feature": f, "importance": round(float(i), 5)} for f, i in pairs[:15]]
    elif hasattr(model, "coef_"):
        coef = model.coef_
        pairs = sorted(zip(feature_names, coef), key=lambda x: -abs(x[1]))
        return [{"feature": f, "coefficient": round(float(c), 5)} for f, c in pairs[:15]]
    return []


# ─────────────────────────────────────────────────────────────────────────────
def run():
    os.makedirs(MODELS_DIR, exist_ok=True)

    X, y, feature_names = load_data()
    X_tr, X_te, y_tr, y_te = split(X, y)

    # ── Model 1 : Ridge Regression (regularised linear) ─────────────────────
    lr_model = Ridge(alpha=1.0)
    lr_result = evaluate("Ridge Regression", lr_model, X_tr, X_te, y_tr, y_te)
    lr_result["feature_importance"] = get_feature_importance(lr_model, feature_names)

    # ── Model 2 : Random Forest ──────────────────────────────────────────────
    rf_model = RandomForestRegressor(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=3,
        n_jobs=-1,
        random_state=SEED,
    )
    rf_result = evaluate("Random Forest", rf_model, X_tr, X_te, y_tr, y_te)
    rf_result["feature_importance"] = get_feature_importance(rf_model, feature_names)

    # ── Model 3 : Gradient Boosting ─────────────────────────────────────────
    gb_model = GradientBoostingRegressor(
        n_estimators=150,
        learning_rate=0.08,
        max_depth=4,
        random_state=SEED,
    )
    gb_result = evaluate("Gradient Boosting", gb_model, X_tr, X_te, y_tr, y_te)
    gb_result["feature_importance"] = get_feature_importance(gb_model, feature_names)

    # ── Pick best model for default predictions ──────────────────────────────
    best = max([lr_result, rf_result, gb_result], key=lambda r: r["R2"])
    print(f"\n🏆  Best model : {best['model']}  (R² = {best['R2']})")

    # ── Save ─────────────────────────────────────────────────────────────────
    joblib.dump(lr_model, LR_PATH)
    joblib.dump(rf_model, RF_PATH)

    evaluation = {
        "models"       : [lr_result, rf_result, gb_result],
        "best_model"   : best["model"],
        "feature_names": feature_names,
    }
    with open(EVAL_PATH, "w") as f:
        json.dump(evaluation, f, indent=2)

    with open(FEAT_PATH, "w") as f:
        json.dump(feature_names, f, indent=2)

    print(f"\n✅  Models saved  → {MODELS_DIR}")
    print(f"✅  Evaluation    → {EVAL_PATH}")
    return evaluation


if __name__ == "__main__":
    run()
