# NomineX — Nomination Filtering System
# Author: Shubh Sharma | June 2026
import pandas as pd
import numpy as np
import joblib
import os

BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH  = os.path.join(BASE_DIR, "data", "nomination_synthetic_dataset_v3.xlsx")
MODELS_DIR = os.path.join(BASE_DIR, "models")

model    = joblib.load(os.path.join(MODELS_DIR, "best_model.pkl"))
features = joblib.load(os.path.join(MODELS_DIR, "feature_names.pkl"))

print("=" * 60)
print("  NOMINATION SYSTEM — TRAINING PROGRAM RECOMMENDER")
print("  (Cold Start — Enter Employee Details Manually)")
print("=" * 60)

# ── Load training programs from Excel ─────────────────────────────────────────
df_prog = pd.read_excel(DATA_PATH, sheet_name="Training Programs")

# ── User enters employee details ──────────────────────────────────────────────
print("\n  Enter employee details:")
print("  " + "-" * 45)

name       = input("  Employee name                       : ").strip()
experience = int(input("  Years of experience                 : ").strip())

print("  Qualification: 1=High School  2=Diploma  3=Bachelor's  4=Master's  5=MBA  6=PhD")
qual_input = int(input("  Enter number                        : ").strip())

print("  Skill proficiency level: 1=Beginner  2=Intermediate  3=Advanced")
skill_1_name  = input("  Skill 1 name                        : ").strip()
skill_1_level = int(input("  Skill 1 level (1/2/3)               : ").strip())
skill_2_name  = input("  Skill 2 name                        : ").strip()
skill_2_level = int(input("  Skill 2 level (1/2/3)               : ").strip())
skill_3_name  = input("  Skill 3 name (or press Enter to skip): ").strip()
skill_3_level = int(input("  Skill 3 level (1/2/3) or 0 to skip : ").strip() or "0")

print("  Availability this month:")
print("  (1=Week1 Jun9-13  2=Week2 Jun16-20  3=Week3 Jun23-27  4=Week4 Jun30-Jul4)")
avail_input   = input("  Enter week numbers you are free (e.g. 1 3 4): ").strip()
free_weeks    = [int(w) for w in avail_input.split()]
weeks_available = len(free_weeks)

perf_rating   = float(input("  Self-rated performance (1.0 - 5.0)  : ").strip())
last_training  = input("  Months since last training (0 if never trained): ").strip()
months_since   = int(last_training) if last_training else 24

QUAL_RANK  = {1:"High School",2:"Diploma",3:"Bachelor's",4:"Master's",5:"MBA",6:"PhD"}
QUAL_NUM   = {"High School":1,"Diploma":2,"Bachelor's":3,"Master's":4,"MBA":5,"PhD":6}

print(f"\n  ── Employee Profile ─────────────────────────────")
print(f"  Name         : {name}")
print(f"  Experience   : {experience} years")
print(f"  Qualification: {QUAL_RANK[qual_input]}")
print(f"  Skills       : {skill_1_name} ({skill_1_level}), {skill_2_name} ({skill_2_level})" +
      (f", {skill_3_name} ({skill_3_level})" if skill_3_name and skill_3_level > 0 else ""))
print(f"  Free weeks   : {free_weeks}")
print(f"  Performance  : {perf_rating}/5.0")

# ── Build feature vector for AI score ─────────────────────────────────────────
all_levels     = [skill_1_level, skill_2_level] + ([skill_3_level] if skill_3_level > 0 else [])
avg_skill      = round(np.mean(all_levels), 2)
max_skill      = max(all_levels)
days_since_promo = months_since * 30   # approximate

# Cold start defaults for unknown fields
trainings_completed = max(0, 3 - months_since // 6)   # estimate from last training date
avg_training_score  = 70.0                              # neutral default
trainings_failed    = 0
dept_code           = 4                                 # neutral dept

employee_vector = {
    "experience"          : experience,
    "qual_rank"           : qual_input,
    "performance"         : perf_rating,
    "days_since_promotion": days_since_promo,
    "dept_code"           : dept_code,
    "trainings_completed" : trainings_completed,
    "avg_training_score"  : avg_training_score,
    "trainings_failed"    : trainings_failed,
    "avg_skill_level"     : avg_skill,
    "max_skill_level"     : max_skill,
    "weeks_available"     : weeks_available,
}

X_emp  = pd.DataFrame([employee_vector])[features]
ai_score = float(np.clip(model.predict(X_emp)[0], 10, 95))

# ── Score against each training program ───────────────────────────────────────
employee_skills  = {skill_1_name.lower(): skill_1_level,
                    skill_2_name.lower(): skill_2_level}
if skill_3_name and skill_3_level > 0:
    employee_skills[skill_3_name.lower()] = skill_3_level

QUAL_THRESHOLDS = {"High School":1,"Diploma":2,"Bachelor's":3,"Master's":4,"MBA":5,"PhD":6}
WEEK_MAP        = {1: 0, 2: 1, 3: 2, 4: 3}   # week number → index

program_scores = []

for _, prog in df_prog.iterrows():
    prog_min_qual  = QUAL_THRESHOLDS.get(prog["Min Qualification"], 1)
    prog_min_exp   = prog["Min Experience (Yrs)"]
    prog_week_idx  = WEEK_MAP.get(
        int(prog["Training Week"].split()[-1]) if "Week" in str(prog["Training Week"]) else 1, 0)
    prog_skill     = prog["Skill Required"].lower()

    # ── Compatibility dimensions ──────────────────────────────────────────────

    # 1. Qualification compatibility (fuzzy)
    qual_gap = qual_input - prog_min_qual
    if qual_gap >= 0:      qual_score = 100.0
    elif qual_gap == -1:   qual_score = 60.0
    elif qual_gap == -2:   qual_score = 30.0
    else:                  qual_score = 0.0

    # 2. Experience compatibility (fuzzy)
    if experience >= prog_min_exp or prog_min_exp == 0:
        exp_score = 100.0
    else:
        exp_score = round(max(0.0, (experience / prog_min_exp) ** 1.5 * 100), 1)

    # 3. Availability compatibility
    prog_week_num = int(prog["Training Week"].split()[-1]) if "Week" in str(prog["Training Week"]) else 1
    avail_score   = 100.0 if prog_week_num in free_weeks else 0.0

    # 4. Skill match — does employee have the required skill?
    matched_level = employee_skills.get(prog_skill, 0)
    if matched_level == 3:   skill_score = 100.0
    elif matched_level == 2: skill_score = 70.0
    elif matched_level == 1: skill_score = 40.0
    else:
        # Partial match — check if any skill is somewhat related
        skill_score = 20.0  # has skills but not the specific one

    # 5. Growth potential — how much will this program benefit them?
    #    Low skill in this area = high growth potential
    if matched_level == 0:   growth_score = 100.0   # no skill → maximum benefit
    elif matched_level == 1: growth_score = 80.0    # beginner → high benefit
    elif matched_level == 2: growth_score = 50.0    # intermediate → moderate
    else:                    growth_score = 20.0    # already advanced → low need

    # ── Weighted compatibility score ──────────────────────────────────────────
    compatibility = (
        qual_score   * 0.20 +
        exp_score    * 0.20 +
        avail_score  * 0.25 +
        skill_score  * 0.20 +
        growth_score * 0.15
    )

    # Hard block — if not available that week, cap at 30%
    if avail_score == 0:
        compatibility = min(compatibility, 30.0)

    program_scores.append({
        "program_id"    : prog["Program ID"],
        "program_name"  : prog["Program Name"],
        "skill_required": prog["Skill Required"],
        "min_qual"      : prog["Min Qualification"],
        "min_exp"       : prog["Min Experience (Yrs)"],
        "week"          : prog["Training Week"],
        "batch_size"    : prog["Batch Size"],
        "qual_score"    : qual_score,
        "exp_score"     : exp_score,
        "avail_score"   : avail_score,
        "skill_score"   : skill_score,
        "growth_score"  : growth_score,
        "compatibility" : round(compatibility, 1),
        "available"     : avail_score == 100.0,
        "eligible"      : qual_score > 0 and exp_score >= 50,
    })

df_scores = pd.DataFrame(program_scores).sort_values("compatibility", ascending=False)

# ── Fit label ─────────────────────────────────────────────────────────────────
def fit_label(pct, eligible, available):
    if not eligible:   return "🔴 Not Eligible"
    if not available:  return "🟠 Unavailable"
    if pct >= 75:      return "🟢 Strong Fit"
    elif pct >= 50:    return "🟡 Moderate Fit"
    else:              return "🟠 Weak Fit"

# ── Print Results ─────────────────────────────────────────────────────────────
print(f"\n{'='*75}")
print(f"  TRAINING PROGRAM RECOMMENDATIONS FOR: {name.upper()}")
print(f"  AI Candidate Score: {ai_score:.1f}/100")
print(f"{'='*75}")
print(f"  {'#':<3} {'Program Name':<36} {'Skill Req':<18} {'Week':<8} "
      f"{'Compat%':>8}  Fit")
print(f"  {'-'*85}")

for i, (_, r) in enumerate(df_scores.iterrows()):
    label = fit_label(r["compatibility"], r["eligible"], r["available"])
    print(f"  {i+1:<3} {r['program_name']:<36} {r['skill_required']:<18} "
          f"{r['week']:<8} {r['compatibility']:>7.1f}%  {label}")

# ── Breakdown of top recommendation ──────────────────────────────────────────
top = df_scores.iloc[0]
print(f"\n{'='*75}")
print(f"  TOP RECOMMENDATION: {top['program_name']}")
print(f"{'='*75}")
print(f"  Compatibility breakdown:")
print(f"  {'Qualification match':<28} : {top['qual_score']:.0f}%")
print(f"  {'Experience match':<28} : {top['exp_score']:.0f}%")
print(f"  {'Availability match':<28} : {top['avail_score']:.0f}%")
print(f"  {'Skill match':<28} : {top['skill_score']:.0f}%")
print(f"  {'Growth potential':<28} : {top['growth_score']:.0f}%")
print(f"  {'─'*35}")
print(f"  {'Overall compatibility':<28} : {top['compatibility']:.1f}%")
print(f"\n  Your AI candidate score    : {ai_score:.1f} / 100")
print(f"{'='*75}")
