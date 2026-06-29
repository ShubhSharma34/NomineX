# NomineX — Nomination Filtering System
# Author: Shubh Sharma | June 2025
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor

np.random.seed(42)

print("=" * 55)
print("  NOMINATION FILTERING SYSTEM — MODEL TRAINING")
print("=" * 55)

BASE_DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "nomination_synthetic_dataset_v3.xlsx")

# ── 1. Load ───────────────────────────────────────────────────────────────────
print("\n[1/7] Loading raw sheets...")
df_emp    = pd.read_excel(DATA_PATH, sheet_name="Employees")
df_skills = pd.read_excel(DATA_PATH, sheet_name="Skills")
df_hist   = pd.read_excel(DATA_PATH, sheet_name="Training History")
df_avail  = pd.read_excel(DATA_PATH, sheet_name="Availability")
print(f"      Employees        : {len(df_emp)} rows")
print(f"      Training History : {len(df_hist)} rows")

# ── 2. Feature Engineering ────────────────────────────────────────────────────
print("\n[2/7] Engineering features...")
QUAL_RANK = {"High School":1,"Diploma":2,"Bachelor's":3,"Master's":4,"MBA":5,"PhD":6}
df_emp["qual_rank"]   = df_emp["Qualification"].map(QUAL_RANK).fillna(1)
df_emp["experience"]  = df_emp["Experience (Years)"]
df_emp["performance"] = df_emp["Performance Rating (1-5)"]
df_emp["Last Promotion Date"] = pd.to_datetime(
    df_emp["Last Promotion Date"], dayfirst=True, errors="coerce")
TODAY = pd.Timestamp("2025-06-05")
df_emp["days_since_promotion"] = (TODAY - df_emp["Last Promotion Date"]).dt.days.fillna(365)
dept_map = {d: i for i, d in enumerate(df_emp["Department"].unique())}
df_emp["dept_code"] = df_emp["Department"].map(dept_map).fillna(0)

hist_completed = df_hist[df_hist["Status"] == "Completed"]
hist_failed    = df_hist[df_hist["Status"].isin(["Failed","Dropped"])]
hist_agg = hist_completed.groupby("Employee ID").agg(
    trainings_completed=("Program Name","count"),
    avg_training_score=("Score (%)","mean")).reset_index()
hist_fail_agg = hist_failed.groupby("Employee ID").agg(
    trainings_failed=("Program Name","count")).reset_index()

LEVEL_RANK = {"Beginner":1,"Intermediate":2,"Advanced":3}
for col in ["Skill 1 Level","Skill 2 Level","Skill 3 Level"]:
    df_skills[col] = df_skills[col].map(LEVEL_RANK).fillna(1)
df_skills["avg_skill_level"] = df_skills[["Skill 1 Level","Skill 2 Level","Skill 3 Level"]].mean(axis=1)
df_skills["max_skill_level"] = df_skills[["Skill 1 Level","Skill 2 Level","Skill 3 Level"]].max(axis=1)
skill_agg = df_skills[["Employee ID","avg_skill_level","max_skill_level"]]

avail_cols = [c for c in df_avail.columns if c != "Employee ID"]
for col in avail_cols:
    df_avail[col] = df_avail[col].map({"Yes":1,"No":0}).fillna(0)
df_avail["weeks_available"] = df_avail[avail_cols].sum(axis=1)
avail_agg = df_avail[["Employee ID","weeks_available"]]

# ── 3. Merge ──────────────────────────────────────────────────────────────────
print("\n[3/7] Merging features...")
df = df_emp[["Employee ID","experience","qual_rank","performance",
             "days_since_promotion","dept_code"]].copy()
df = df.merge(hist_agg,      on="Employee ID", how="left")
df = df.merge(hist_fail_agg, on="Employee ID", how="left")
df = df.merge(skill_agg,     on="Employee ID", how="left")
df = df.merge(avail_agg,     on="Employee ID", how="left")
df = df.fillna(0)

# ── 4. Non-linear Target with Segment Rules ───────────────────────────────────
print("\n[4/7] Generating target score with segment rules...")
n  = len(df)

# Segment employees into hidden clusters trees can detect but LR cannot
# Segment A: Junior high-performer (exp<=5, perf>=4)      → fast-track bonus
# Segment B: Senior expert (exp>=10, max_skill==3)        → strong baseline
# Segment C: Stagnant mid-career (exp 6-9, low promotion) → penalty
# Segment D: Everyone else                                → standard

seg_A = (df["experience"] <= 5)  & (df["performance"] >= 4.0)
seg_B = (df["experience"] >= 10) & (df["max_skill_level"] == 3)
seg_C = (df["experience"].between(6,9)) & (df["days_since_promotion"] > 800)

e  = df["experience"]          / 20
q  = df["qual_rank"]           / 6
p  = df["performance"]         / 5
tc = df["trainings_completed"] / 5
ts = df["avg_training_score"]  / 100
sl = df["avg_skill_level"]     / 3
av = df["weeks_available"]     / 4
tf = df["trainings_failed"]
dp = df["days_since_promotion"] / 365

# Base score
base = (e*22 + q*18 + p*20 + tc*12 + ts*10 + sl*10 + av*8)

# Segment bonuses/penalties — these create decision boundaries only trees find
bonus = np.zeros(n)
bonus[seg_A] += np.random.uniform(8, 15, seg_A.sum())    # junior star bonus
bonus[seg_B] += np.random.uniform(10, 18, seg_B.sum())   # senior expert bonus
bonus[seg_C] -= np.random.uniform(6, 14, seg_C.sum())    # stagnant penalty

# Non-linear interactions
interact = (
    np.where(p > 0.7, (p - 0.7) ** 2 * 30, 0) +   # perf spike above 0.7
    np.where(e > 0.5, np.log1p(e) * 8, e * 5) +    # log returns on exp
    tc * ts * sl * 20 +                              # 3-way synergy
    np.where(tf > 2, -(tf ** 2) * 2, -tf * 1.5) +  # exponential failure penalty
    av * p * q * 15                                  # availability×perf×qual
)

# Department hidden multiplier
dept_mult_map = {0:1.08, 1:0.88, 2:1.12, 3:0.93, 4:1.00, 5:1.10, 6:0.85, 7:1.05}
dept_mult = df["dept_code"].map(dept_mult_map).fillna(1.0)

raw = (base + interact + bonus) * dept_mult

# Noise
noise = np.random.normal(0, 5, n)
outlier_mask = np.random.rand(n) < 0.04
noise[outlier_mask] += np.random.choice([-12, 12], outlier_mask.sum())
raw = raw + noise

# Normalize to 10–95
df["ai_score"] = ((raw - raw.min()) / (raw.max() - raw.min()) * 85 + 10).round(2)

print(f"      Segment A (junior star) : {seg_A.sum()} employees")
print(f"      Segment B (senior exp.) : {seg_B.sum()} employees")
print(f"      Segment C (stagnant)    : {seg_C.sum()} employees")
print(f"      Score range : {df['ai_score'].min():.1f} – {df['ai_score'].max():.1f}")
print(f"      Score mean  : {df['ai_score'].mean():.1f}")
print(f"      Score std   : {df['ai_score'].std():.1f}")

# ── 5. Train / Test Split ─────────────────────────────────────────────────────
print("\n[5/7] Splitting data (80/20)...")
FEATURES = [
    "experience","qual_rank","performance","days_since_promotion","dept_code",
    "trainings_completed","avg_training_score","trainings_failed",
    "avg_skill_level","max_skill_level","weeks_available"
]
X = df[FEATURES]
y = df["ai_score"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42)
print(f"      Train: {len(X_train)} | Test: {len(X_test)} | Features: {len(FEATURES)}")

scaler     = StandardScaler()
X_train_sc = scaler.fit_transform(X_train)
X_test_sc  = scaler.transform(X_test)

# ── 6. Train & Compare ────────────────────────────────────────────────────────
print("\n[6/7] Training models...")
models = {
    "Linear Regression" : (LinearRegression(), True),
    "Random Forest"     : (RandomForestRegressor(
                              n_estimators=300, max_depth=12,
                              min_samples_leaf=2, random_state=42), False),
    "XGBoost"           : (XGBRegressor(
                              n_estimators=300, learning_rate=0.05,
                              max_depth=5, subsample=0.8,
                              colsample_bytree=0.8,
                              random_state=42, verbosity=0), False),
    "Gradient Boosting" : (GradientBoostingRegressor(
                              n_estimators=200, learning_rate=0.05,
                              max_depth=4, random_state=42), False),
}

results        = {}
trained_models = {}

for name, (model, use_scaled) in models.items():
    Xtr = X_train_sc if use_scaled else X_train
    Xte = X_test_sc  if use_scaled else X_test
    model.fit(Xtr, y_train)
    preds = model.predict(Xte)
    mae  = mean_absolute_error(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    r2   = r2_score(y_test, preds)
    results[name]        = {"MAE":mae,"RMSE":rmse,"R2":r2,"preds":preds}
    trained_models[name] = model
    print(f"\n      {name}")
    print(f"        MAE={mae:.3f}  RMSE={rmse:.3f}  R²={r2:.4f}")

print("\n" + "-" * 54)
print(f"  {'Model':<24} {'MAE':>7} {'RMSE':>7} {'R²':>8}")
print("-" * 54)
for name, m in results.items():
    best_name = max(results, key=lambda k: results[k]["R2"])
    marker = " ✓" if name == best_name else ""
    print(f"  {name:<24} {m['MAE']:>7.3f} {m['RMSE']:>7.3f} {m['R2']:>8.4f}{marker}")
print("-" * 54)

best_name = max(results, key=lambda k: results[k]["R2"])
print(f"\n  Best model → {best_name}  (R²={results[best_name]['R2']:.4f})")

# ── 7. Save + Charts ──────────────────────────────────────────────────────────
print("\n[7/7] Saving and generating charts...")
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

joblib.dump(trained_models[best_name], os.path.join(MODELS_DIR, "best_model.pkl"))
joblib.dump(scaler,                    os.path.join(MODELS_DIR, "scaler.pkl"))
joblib.dump(FEATURES,                  os.path.join(MODELS_DIR, "feature_names.pkl"))
print("      Saved: best_model.pkl  scaler.pkl  feature_names.pkl")

# Chart 1: Model comparison
fig, ax = plt.subplots(figsize=(9, 4))
names  = list(results.keys())
r2s    = [results[m]["R2"] for m in names]
colors = ["#4C9BE8","#2ECC71","#E67E22","#9B59B6"]
bars   = ax.bar(names, r2s, color=colors, width=0.5, edgecolor="white")
ax.set_ylim(0, 1.05)
ax.set_ylabel("R² Score")
ax.set_title("Model Comparison — R² Score", fontsize=13)
for bar, val in zip(bars, r2s):
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
            f"{val:.4f}", ha="center", fontsize=10, fontweight="bold")
plt.tight_layout()
plt.savefig(os.path.join(MODELS_DIR, "model_comparison.png"), dpi=150)
plt.show()

# Chart 2: Feature importance
best_tree = "XGBoost" if results["XGBoost"]["R2"] > results["Random Forest"]["R2"] else "Random Forest"
importances = pd.Series(
    trained_models[best_tree].feature_importances_, index=FEATURES).sort_values()
fig, ax = plt.subplots(figsize=(9, 6))
importances.plot(kind="barh", color="steelblue", ax=ax)
ax.set_title(f"Feature Importance — {best_tree}", fontsize=13)
ax.set_xlabel("Importance Score")
plt.tight_layout()
plt.savefig(os.path.join(MODELS_DIR, "feature_importance.png"), dpi=150)
plt.show()

# Chart 3: Actual vs Predicted
fig, axes = plt.subplots(1, 4, figsize=(18, 4))
for ax, (name, m) in zip(axes, results.items()):
    ax.scatter(y_test, m["preds"], alpha=0.3, color="steelblue",
               edgecolors="white", linewidth=0.2, s=15)
    ax.plot([y_test.min(), y_test.max()],
            [y_test.min(), y_test.max()], "r--", lw=1.5)
    ax.set_title(f"{name}\nR²={m['R2']:.4f}", fontsize=9)
    ax.set_xlabel("Actual"); ax.set_ylabel("Predicted")
plt.suptitle("Actual vs Predicted — All Models", fontsize=13, y=1.02)
plt.tight_layout()
plt.savefig(os.path.join(MODELS_DIR, "actual_vs_predicted.png"),
            dpi=150, bbox_inches="tight")
plt.show()

# Chart 4: Score distribution
fig, ax = plt.subplots(figsize=(7, 4))
ax.hist(df["ai_score"], bins=40, color="steelblue", edgecolor="white", alpha=0.85)
ax.set_xlabel("AI Score"); ax.set_ylabel("Employees")
ax.set_title("Distribution of AI Scores — 2000 Employees", fontsize=13)
plt.tight_layout()
plt.savefig(os.path.join(MODELS_DIR, "score_distribution.png"), dpi=150)
plt.show()

print("\n" + "=" * 55)
print("  TRAINING COMPLETE")
print(f"  Best model : {best_name}")
print(f"  R² Score   : {results[best_name]['R2']:.4f}")
print("  Charts saved to models/ folder")
print("=" * 55)
