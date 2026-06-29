import pandas as pd
import numpy as np
import joblib
import os
import sqlite3
from datetime import datetime

BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH  = os.path.join(BASE_DIR, "data", "nomination_synthetic_dataset_v3.xlsx")
MODELS_DIR = os.path.join(BASE_DIR, "models")
DB_PATH    = os.path.join(BASE_DIR, "nominations.db")

model    = joblib.load(os.path.join(MODELS_DIR, "best_model.pkl"))
features = joblib.load(os.path.join(MODELS_DIR, "feature_names.pkl"))

# ── Setup SQLite DB ───────────────────────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c    = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS programs (
            program_id   INTEGER PRIMARY KEY AUTOINCREMENT,
            program_name TEXT,
            min_qual     TEXT,
            min_exp      INTEGER,
            training_week TEXT,
            batch_size   INTEGER,
            waitlist_size INTEGER,
            run_at       TEXT
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS nominations (
            nomination_id  INTEGER PRIMARY KEY AUTOINCREMENT,
            program_id     INTEGER,
            employee_id    TEXT,
            employee_name  TEXT,
            department     TEXT,
            qualification  TEXT,
            experience     INTEGER,
            ai_score       REAL,
            fuzzy_match    REAL,
            status         TEXT,
            rank           INTEGER,
            FOREIGN KEY (program_id) REFERENCES programs(program_id)
        )
    """)
    conn.commit()
    conn.close()

def save_to_db(prog_meta, selected, waitlist):
    conn = sqlite3.connect(DB_PATH)
    c    = conn.cursor()

    # Save program
    c.execute("""
        INSERT INTO programs
        (program_name, min_qual, min_exp, training_week, batch_size, waitlist_size, run_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        prog_meta["name"], prog_meta["min_qual_name"], prog_meta["min_exp"],
        prog_meta["week_name"], prog_meta["batch_size"], prog_meta["waitlist_n"],
        datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ))
    program_id = c.lastrowid

    # Save selected
    for rank, (_, r) in enumerate(selected.iterrows(), start=1):
        c.execute("""
            INSERT INTO nominations
            (program_id, employee_id, employee_name, department, qualification,
             experience, ai_score, fuzzy_match, status, rank)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (program_id, r["Employee ID"], r["Name"], r["Department"],
              r["Qualification"], int(r["experience"]),
              float(r["ai_score"]), float(r["fuzzy_match"]), "Selected", rank))

    # Save waitlist
    for rank, (_, r) in enumerate(waitlist.iterrows(), start=1):
        c.execute("""
            INSERT INTO nominations
            (program_id, employee_id, employee_name, department, qualification,
             experience, ai_score, fuzzy_match, status, rank)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (program_id, r["Employee ID"], r["Name"], r["Department"],
              r["Qualification"], int(r["experience"]),
              float(r["ai_score"]), float(r["fuzzy_match"]), "Waitlist", rank))

    conn.commit()
    conn.close()
    return program_id

def show_history():
    conn = sqlite3.connect(DB_PATH)
    c    = conn.cursor()
    c.execute("SELECT * FROM programs ORDER BY run_at DESC")
    rows = c.fetchall()
    conn.close()
    if not rows:
        print("\n  No saved programs yet.")
        return
    print(f"\n  {'ID':<5} {'Program Name':<35} {'Week':<20} {'Batch':<7} {'Saved At'}")
    print("  " + "-" * 80)
    for row in rows:
        print(f"  {row[0]:<5} {row[1]:<35} {row[3]:<20} {row[5]:<7} {row[7]}")

# ── Init DB ───────────────────────────────────────────────────────────────────
init_db()

print("=" * 65)
print("  NOMINATION FILTERING SYSTEM — SHORTLIST GENERATOR")
print("=" * 65)

# ── Show past history option ──────────────────────────────────────────────────
show = input("\n  View past saved shortlists first? (y/n): ").strip().lower()
if show == "y":
    show_history()
    print()

# ── Load sheets ───────────────────────────────────────────────────────────────
df_emp    = pd.read_excel(DATA_PATH, sheet_name="Employees")
df_skills = pd.read_excel(DATA_PATH, sheet_name="Skills")
df_hist   = pd.read_excel(DATA_PATH, sheet_name="Training History")
df_avail  = pd.read_excel(DATA_PATH, sheet_name="Availability")

# ── User enters program details ───────────────────────────────────────────────
print("\n  Enter your training program details:")
print("  " + "-" * 45)
prog_name   = input("  Program name                        : ").strip()
print("  Min qualification: 1=High School  2=Diploma  3=Bachelor's  4=Master's  5=MBA  6=PhD")
min_qual    = int(input("  Enter number                        : ").strip())
min_exp     = int(input("  Minimum experience (years)          : ").strip())
print("  Training week: 1=Week1(Jun9-13)  2=Week2(Jun16-20)  3=Week3(Jun23-27)  4=Week4(Jun30-Jul4)")
week_choice = int(input("  Enter number                        : ").strip())
batch_size  = int(input("  Batch size                          : ").strip())
waitlist_n  = int(input("  Waitlist size (default 5)           : ").strip() or "5")

QUAL_NAMES = {1:"High School",2:"Diploma",3:"Bachelor's",4:"Master's",5:"MBA",6:"PhD"}
WEEK_NAMES = {1:"Week 1 (Jun 9-13)",2:"Week 2 (Jun 16-20)",
              3:"Week 3 (Jun 23-27)",4:"Week 4 (Jun 30-Jul 4)"}

# ── Feature Engineering ───────────────────────────────────────────────────────
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
df_skills["avg_skill_level"] = df_skills[
    ["Skill 1 Level","Skill 2 Level","Skill 3 Level"]].mean(axis=1)
df_skills["max_skill_level"] = df_skills[
    ["Skill 1 Level","Skill 2 Level","Skill 3 Level"]].max(axis=1)
skill_agg = df_skills[["Employee ID","avg_skill_level","max_skill_level"]]

avail_cols  = [c for c in df_avail.columns if c != "Employee ID"]
week_col    = avail_cols[week_choice - 1]
for col in avail_cols:
    df_avail[col] = df_avail[col].map({"Yes":1,"No":0}).fillna(0)
df_avail["weeks_available"] = df_avail[avail_cols].sum(axis=1)
avail_agg = df_avail[["Employee ID","weeks_available", week_col]].copy()
avail_agg = avail_agg.rename(columns={week_col: "free_this_week"})

df = df_emp[["Employee ID","Name","Department","Qualification",
             "experience","qual_rank","performance",
             "days_since_promotion","dept_code"]].copy()
df = df.merge(hist_agg,      on="Employee ID", how="left")
df = df.merge(hist_fail_agg, on="Employee ID", how="left")
df = df.merge(skill_agg,     on="Employee ID", how="left")
df = df.merge(avail_agg,     on="Employee ID", how="left")
df = df.fillna(0)

# ── Stage 1: Hard Filters ─────────────────────────────────────────────────────
total       = len(df)
df_eligible = df[
    (df["free_this_week"] == 1) &
    (df["qual_rank"]      >= min_qual) &
    (df["experience"]     >= min_exp)
].copy()

print(f"\n  ── Stage 1: Hard Filtering ──────────────────────")
print(f"  Total employees   : {total}")
print(f"  Filtered out      : {total - len(df_eligible)}")
print(f"  Eligible pool     : {len(df_eligible)}")

if len(df_eligible) == 0:
    print("\n  ⚠️  No eligible employees found.")
    exit()

if len(df_eligible) < batch_size:
    print(f"\n  ⚠️  Only {len(df_eligible)} eligible — selecting all.")
    batch_size = len(df_eligible)
    waitlist_n = 0

# ── Stage 2: AI Score ─────────────────────────────────────────────────────────
X = df_eligible[features]
df_eligible = df_eligible.copy()
df_eligible["ai_score"] = np.clip(model.predict(X), 10, 95).round(2)

# ── Stage 3: Fuzzy Match ──────────────────────────────────────────────────────
def fuzzy_qual(q, mq):
    gap = q - mq
    return 100.0 if gap >= 0 else (60.0 if gap==-1 else (30.0 if gap==-2 else 10.0))

def fuzzy_exp(e, me):
    if e >= me or me == 0: return 100.0
    return round(max(10.0, (e/me)**1.5*100), 1)

def fuzzy_avail(free, weeks):
    return 100.0 if free==1 else (30.0 if weeks>0 else 0.0)

def fuzzy_skill(avg, mx):
    return round((mx/3)*60 + (avg/3)*40, 1)

def fuzzy_train(tc, ts, tf):
    return round(max(0.0, min(tc/4,1.0)*50 + (ts/100)*35 - min(tf*10,30)), 1)

df_eligible["fz_qual"]  = df_eligible.apply(lambda r: fuzzy_qual(r["qual_rank"], min_qual), axis=1)
df_eligible["fz_exp"]   = df_eligible.apply(lambda r: fuzzy_exp(r["experience"], min_exp), axis=1)
df_eligible["fz_avail"] = df_eligible.apply(lambda r: fuzzy_avail(r["free_this_week"], r["weeks_available"]), axis=1)
df_eligible["fz_skill"] = df_eligible.apply(lambda r: fuzzy_skill(r["avg_skill_level"], r["max_skill_level"]), axis=1)
df_eligible["fz_train"] = df_eligible.apply(lambda r: fuzzy_train(
    r["trainings_completed"], r["avg_training_score"], r["trainings_failed"]), axis=1)
df_eligible["fuzzy_match"] = (
    df_eligible["fz_qual"]  * 0.20 +
    df_eligible["fz_exp"]   * 0.25 +
    df_eligible["fz_avail"] * 0.20 +
    df_eligible["fz_skill"] * 0.20 +
    df_eligible["fz_train"] * 0.15
).round(1)

# Sort by AI score (primary)
df_eligible = df_eligible.sort_values("ai_score", ascending=False).reset_index(drop=True)
selected    = df_eligible.iloc[:batch_size].copy()
waitlist    = df_eligible.iloc[batch_size:batch_size+waitlist_n].copy()
rejected    = df_eligible.iloc[batch_size+waitlist_n:].copy()

def fit_label(pct):
    if pct >= 75:   return "🟢 Strong"
    elif pct >= 50: return "🟡 Moderate"
    elif pct >= 30: return "🟠 Weak"
    else:           return "🔴 Poor"

def print_section(title, emoji, subset):
    print(f"\n{'='*75}")
    print(f"  {emoji}  {title}")
    print(f"{'='*75}")
    print(f"  {'#':<4} {'Name':<22} {'Dept':<13} {'AI Score':>9} "
          f"{'Qual%':>6} {'Exp%':>5} {'Avl%':>5} {'Skl%':>5} {'Trn%':>5} "
          f"{'Match%':>7}  Fit")
    print(f"  {'-'*92}")
    for i, (_, r) in enumerate(subset.iterrows()):
        print(f"  {i+1:<4} {r['Name']:<22} {r['Department']:<13} "
              f"{r['ai_score']:>8.2f}  "
              f"{r['fz_qual']:>5.0f}% {r['fz_exp']:>4.0f}% "
              f"{r['fz_avail']:>4.0f}% {r['fz_skill']:>4.0f}% "
              f"{r['fz_train']:>4.0f}%  "
              f"{r['fuzzy_match']:>5.1f}%  {fit_label(r['fuzzy_match'])}")

print_section(f"SELECTED ({len(selected)}) — {prog_name}", "✅", selected)
print_section(f"WAITLIST ({len(waitlist)})", "⏳", waitlist)
print(f"\n  ❌ Not shortlisted : {len(rejected)} employees")

# ── Ask to save ───────────────────────────────────────────────────────────────
print(f"\n{'='*65}")
save = input("  Save this shortlist to storage? (y/n): ").strip().lower()

if save == "y":
    prog_meta = {
        "name"          : prog_name,
        "min_qual_name" : QUAL_NAMES[min_qual],
        "min_exp"       : min_exp,
        "week_name"     : WEEK_NAMES[week_choice],
        "batch_size"    : batch_size,
        "waitlist_n"    : waitlist_n,
    }
    program_id = save_to_db(prog_meta, selected, waitlist)
    print(f"\n  ✅ Saved! Program ID : {program_id}")
    print(f"  📁 Stored in        : nominations.db")
    print(f"  📋 Records saved    : {len(selected)} selected + {len(waitlist)} waitlist")
else:
    print("\n  Shortlist not saved.")

print(f"\n{'='*65}")
print(f"  DONE — Awaiting manager approval")
print(f"{'='*65}")