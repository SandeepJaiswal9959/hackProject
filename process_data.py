"""
IndiaMART Churn Early-Warning System — POC Data Pipeline
========================================================
Architecture: CSV → Real API (concurrent) → Feature Engineering → Hybrid Scoring → JSON Output

Hybrid Model:
  - Rule-based component (0-60 pts): encodes domain expertise, fully explainable
  - ML ensemble (0-40 pts):         LR + Random Forest + XGBoost, trained on rule-derived labels
  - Final score = rule * 0.60 + ML * 0.40  →  mapped to 0-100

Risk Buckets: Critical (75-100) | High (55-74) | Medium (30-54) | Low (0-29)
"""

import pandas as pd
import json
import numpy as np
import requests
import warnings
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings('ignore')

# ─── CONFIG ────────────────────────────────────────────────────────────────────
API_URL     = "https://imdwh.intermesh.net/api/go/cust_scorecard_api"
API_TIMEOUT = 15          # seconds per request
MAX_WORKERS = 10          # concurrent API threads

MONTH_LABELS = {
    1:"May", 2:"Apr", 3:"Mar", 4:"Feb", 5:"Jan",
    6:"Dec", 7:"Nov", 8:"Oct", 9:"Sep", 10:"Aug", 11:"Jul", 12:"Jun"
}

# ─── API LAYER ─────────────────────────────────────────────────────────────────
def fetch_scorecard(glid: str) -> dict | None:
    """
    Fetch 12-month engagement scorecard from real IndiaMART API.

    API envelope: {"err_txt": "", "response": "<JSON string>"}
    The actual summary data is inside data["response"] as a stringified JSON.
    """
    try:
        resp = requests.post(
            API_URL,
            json={"in_glusr_usr_id": str(glid), "in_rpt_type": "1"},
            timeout=API_TIMEOUT,
            headers={"Content-Type": "application/json"}
        )
        resp.raise_for_status()
        envelope = resp.json()

        # Unwrap envelope: real payload is a JSON string inside envelope["response"]
        if isinstance(envelope, dict) and "response" in envelope:
            inner = envelope["response"]
            if isinstance(inner, str):
                return json.loads(inner)
            return inner  # already parsed

        # Fallback: top-level is already the data dict
        if isinstance(envelope, str):
            return json.loads(envelope)
        return envelope

    except Exception as e:
        print(f"  [WARN] API failed for GLID {glid}: {type(e).__name__}: {e}")
        return None


def extract_sorted_series(api_data: dict) -> list:
    """
    Extract monthly records from API response, sorted so index 0 = most recent month.
    The API returns month_number=1 as the most recent month.
    """
    if not api_data:
        return []
    summary = api_data.get("summary", [])
    return sorted(summary, key=lambda x: x.get("month_number", 99))


# ─── FEATURE ENGINEERING ───────────────────────────────────────────────────────
def safe_avg(series: list, field: str, indices: list) -> float:
    """Average of `field` over specified list indices, safely handling None/missing."""
    vals = [float(series[i].get(field) or 0) for i in indices if i < len(series)]
    return float(np.mean(vals)) if vals else 0.0


def compute_decline(recent: float, historical: float) -> float:
    """Decline ratio: 1.0 = 100% drop, 0.0 = stable or improving."""
    if historical <= 0:
        return 0.0
    return float(np.clip((historical - recent) / historical, 0.0, 1.0))


def count_consecutive_zeros(series: list, field: str, n: int = 3) -> int:
    """
    Count leading consecutive months (starting from most recent) with zero value.
    Used as the strongest churn signal: sustained zero activity.
    """
    count = 0
    for i in range(min(n, len(series))):
        if (series[i].get(field) or 0) == 0:
            count += 1
        else:
            break
    return count


def engineer_features(series: list, days_to_renewal: int, client_since: int) -> dict:
    """
    Extract 20 churn-predictive features from monthly time-series.

    Time windows (index 0 = most recent month):
      Recent    (R): indices 0-1  → last 2 months
      Historical(H): indices 3-5  → months 4-6 (baseline)

    Key insight: decline = (H_avg - R_avg) / H_avg
    """
    if not series:
        return _neutral_features(days_to_renewal, client_since)

    R, H = [0, 1], [3, 4, 5]

    def decline(field):
        return compute_decline(safe_avg(series, field, R), safe_avg(series, field, H))

    bl_recent       = safe_avg(series, "bl_cons", R)
    bl_hist         = safe_avg(series, "bl_cons", H)
    enq_recent      = safe_avg(series, "total_enq", R)
    enq_hist        = safe_avg(series, "total_enq", H)
    reply_recent    = safe_avg(series, "replies", R)
    reply_hist      = safe_avg(series, "replies", H)
    lms_recent      = safe_avg(series, "lms_active_days", R)

    # Credit health: lapsed credits signal paid-but-not-using
    bl_credits_alctd = float(series[0].get("bl_credits_alctd") or 1) if series else 1
    bl_credit_lapsed = float(series[0].get("bl_credit_lapsed") or 0) if series else 0
    lapsed_ratio     = float(np.clip(bl_credit_lapsed / max(bl_credits_alctd, 1), 0, 1))

    current_balance  = float(series[0].get("current_balance") or 0) if series else 0
    cqs_raw          = float(series[0].get("cqs") or 0) if series else 50
    catalog_score_raw= float(series[0].get("catalog_score") or 0) if series else 0

    consec_zero_bl   = count_consecutive_zeros(series, "bl_cons", 3)
    consec_zero_lms  = count_consecutive_zeros(series, "lms_active_days", 3)

    prd_added_3m = sum(float(series[i].get("prd_added") or 0) for i in range(min(3, len(series))))

    dtr_norm = float(np.clip((90 - days_to_renewal) / 90, 0, 1))

    return {
        # Normalised features for ML
        "bl_decline":             decline("bl_cons"),
        "lms_decline":            decline("lms_active_days"),
        "enq_decline":            decline("total_enq"),
        "reply_decline":          decline("replies"),
        "callback_decline":       decline("callbacks"),
        "call_decline":           decline("outgoing_call_answered"),
        "email_decline":          decline("emails_opened"),
        "pns_decline":            decline("pns_calls_ans"),
        "current_balance_norm":   float(np.clip(current_balance / 100.0, 0, 1)),
        "lapsed_ratio":           lapsed_ratio,
        "cqs":                    float(np.clip(cqs_raw / 100.0, 0, 1)),
        "catalog_score":          float(np.clip(catalog_score_raw / 100.0, 0, 1)),
        "consec_zero_bl":         consec_zero_bl / 3.0,
        "consec_zero_lms":        consec_zero_lms / 3.0,
        "prd_added_3m_norm":      float(np.clip(prd_added_3m / 10.0, 0, 1)),
        "days_to_renewal_norm":   dtr_norm,
        "client_since_norm":      float(np.clip(client_since / 5.0, 0, 1)),
        # Raw values for rule scoring & explanation
        "_bl_recent":       bl_recent,
        "_bl_hist":         bl_hist,
        "_lms_recent":      lms_recent,
        "_enq_recent":      enq_recent,
        "_enq_hist":        enq_hist,
        "_reply_recent":    reply_recent,
        "_reply_hist":      reply_hist,
        "_consec_zero_bl":  consec_zero_bl,
        "_consec_zero_lms": consec_zero_lms,
        "_cqs_raw":         cqs_raw,
        "_catalog_score_raw": catalog_score_raw,
        "_current_balance": current_balance,
        "_lapsed_ratio":    lapsed_ratio,
    }


def _neutral_features(days_to_renewal: int, client_since: int) -> dict:
    """Return conservative neutral features when API data is unavailable."""
    dtr_norm = float(np.clip((90 - days_to_renewal) / 90, 0, 1))
    return {
        "bl_decline": 0.3, "lms_decline": 0.3, "enq_decline": 0.3,
        "reply_decline": 0.3, "callback_decline": 0.3, "call_decline": 0.3,
        "email_decline": 0.3, "pns_decline": 0.3,
        "current_balance_norm": 0.3, "lapsed_ratio": 0.3,
        "cqs": 0.5, "catalog_score": 0.3,
        "consec_zero_bl": 0.0, "consec_zero_lms": 0.0,
        "prd_added_3m_norm": 0.3,
        "days_to_renewal_norm": dtr_norm,
        "client_since_norm": float(np.clip(client_since / 5.0, 0, 1)),
        "_bl_recent": 0, "_bl_hist": 0, "_lms_recent": 0,
        "_enq_recent": 0, "_enq_hist": 0, "_reply_recent": 0, "_reply_hist": 0,
        "_consec_zero_bl": 0, "_consec_zero_lms": 0, "_cqs_raw": 50,
        "_catalog_score_raw": 0, "_current_balance": 0, "_lapsed_ratio": 0.3,
    }


# ─── RULE-BASED SCORING ────────────────────────────────────────────────────────
def rule_based_score(feat: dict) -> float:
    """
    Domain-expert rule scoring (0-60 points).
    Designed to be fully transparent and explainable to the retention team.

    Weights reflect empirical importance of each signal:
      BL Consumption  → 20 pts (most critical — direct ROI signal)
      LMS Activity    → 12 pts (platform engagement proxy)
      Credit Lapse    →  8 pts (paying but not using = imminent churn)
      Replies/Enquiry →  8 pts (buyer-seller connection quality)
      Balance Empty   →  5 pts (out of credits)
      Catalog Quality →  5 pts (poor catalog = disengaged seller)
      Call Response   →  2 pts (communication responsiveness)
    """
    score = 0.0

    # 1. BuyLead consumption (max 20 pts)
    bl_d   = feat["bl_decline"]
    czbl   = feat["_consec_zero_bl"]
    if   czbl >= 3:   score += 20   # 3 months zero = almost certain churn
    elif czbl == 2:   score += 15
    elif bl_d > 0.80: score += 18
    elif bl_d > 0.60: score += 12
    elif bl_d > 0.40: score += 7
    elif bl_d > 0.20: score += 3

    # 2. LMS / Platform login (max 12 pts)
    lms_d = feat["lms_decline"]
    czlms = feat["_consec_zero_lms"]
    if   czlms >= 2:   score += 12
    elif lms_d > 0.70: score += 8
    elif lms_d > 0.40: score += 4

    # 3. Credit lapse: paid but unused credits (max 8 pts)
    lapsed = feat["_lapsed_ratio"]
    if   lapsed > 0.80: score += 8
    elif lapsed > 0.50: score += 5
    elif lapsed > 0.30: score += 2

    # 4. Reply / Enquiry engagement (max 8 pts)
    reply_d = feat["reply_decline"]
    enq_d   = feat["enq_decline"]
    if   reply_d > 0.70: score += 5
    elif reply_d > 0.40: score += 3
    if   enq_d   > 0.60: score += 3

    # 5. Balance zero (max 5 pts)
    if feat["_current_balance"] == 0 and feat["_bl_hist"] > 0:
        score += 5   # had activity before, now balance depleted

    # 6. Catalog quality (max 5 pts)
    cqs = feat["_cqs_raw"]
    if   cqs < 15: score += 5
    elif cqs < 30: score += 3
    elif cqs < 50: score += 1

    # 7. Call responsiveness (max 2 pts)
    if feat["call_decline"] > 0.70:
        score += 2

    return min(float(score), 60.0)


# ─── EXPLANATION LAYER ─────────────────────────────────────────────────────────
def generate_top_reasons(feat: dict, days_to_renewal: int) -> list:
    """Generate ordered human-readable churn risk explanations for the AM."""
    reasons = []

    czbl  = feat["_consec_zero_bl"]
    bl_d  = feat["bl_decline"]
    czlms = feat["_consec_zero_lms"]

    if czbl >= 3:
        reasons.append(
            f"Zero BuyLead consumption for {czbl} consecutive months — "
            f"supplier has completely stopped using the platform"
        )
    elif czbl == 2:
        reasons.append("BuyLead consumption dropped to zero for the last 2 months")
    elif bl_d > 0.60:
        reasons.append(
            f"BuyLead consumption declined by {round(bl_d*100)}% vs 3-month baseline"
        )

    if czlms >= 2:
        reasons.append(
            f"No platform login (LMS) for {czlms} consecutive months — zero digital engagement"
        )
    elif feat["lms_decline"] > 0.50:
        reasons.append(f"Platform login activity dropped by {round(feat['lms_decline']*100)}%")

    reply_d = feat["reply_decline"]
    enq_d   = feat["enq_decline"]
    if reply_d > 0.60:
        reasons.append(
            f"Enquiry reply rate declined by {round(reply_d*100)}% — supplier not engaging with buyers"
        )
    elif enq_d > 0.60:
        reasons.append(f"Enquiry volume declined by {round(enq_d*100)}%")

    lapsed = feat["_lapsed_ratio"]
    if lapsed > 0.60:
        reasons.append(
            f"{round(lapsed*100)}% of allocated BL credits lapsed unused — "
            f"supplier is not extracting value from subscription"
        )

    cqs = feat["_cqs_raw"]
    if cqs < 20:
        reasons.append(
            f"Catalog Quality Score critically low at {round(cqs)}/100 — "
            f"poor product visibility reducing inbound enquiries"
        )
    elif cqs < 40:
        reasons.append(f"Catalog Quality Score below average at {round(cqs)}/100")

    if feat["_current_balance"] == 0:
        reasons.append("Current BL credit balance is zero")

    if days_to_renewal <= 14:
        reasons.append(f"Renewal due in {days_to_renewal} days — immediate intervention required")
    elif days_to_renewal <= 30:
        reasons.append(f"Renewal due in {days_to_renewal} days — urgent follow-up needed")
    elif days_to_renewal <= 60:
        reasons.append(f"Renewal approaching in {days_to_renewal} days")

    if feat["call_decline"] > 0.60:
        reasons.append("Outgoing call answer rate dropped significantly — supplier unreachable")

    return reasons[:4]   # cap at top 4 for readability


def get_recommended_action(score: int, days_to_renewal: int) -> str:
    if score >= 75 or days_to_renewal <= 14:
        return "Senior AM escalation — schedule personal visit within 48 hours + executive call"
    elif score >= 55 or days_to_renewal <= 30:
        return "AM to call within 24 hours + offer free catalog optimization + product training"
    elif score >= 35:
        return "Schedule engagement call this week + share ROI report + success stories from vertical"
    else:
        return "Monthly health check — send engagement tips + new feature highlights"


# ─── TREND DATA ────────────────────────────────────────────────────────────────
def build_trend_data(series: list) -> list:
    """
    Build a 6-month composite engagement score for the dashboard trend chart.
    Composite = BL consumption + (LMS active days × 3) + enquiries
    Chart is rendered oldest → newest (left to right).
    """
    trend = []
    for rec in series[:6]:
        mn  = rec.get("month_number", 0)
        bl  = float(rec.get("bl_cons") or 0)
        lms = float(rec.get("lms_active_days") or 0) * 3
        enq = float(rec.get("total_enq") or 0)
        trend.append({
            "name":       MONTH_LABELS.get(mn, f"M{mn}"),
            "engagement": round(min(100, bl + lms + enq), 1)
        })
    return list(reversed(trend))   # reverse so oldest is on the left


# ─── MAIN PIPELINE ─────────────────────────────────────────────────────────────
FEATURE_COLS = [
    "bl_decline", "lms_decline", "enq_decline", "reply_decline", "callback_decline",
    "call_decline", "email_decline", "pns_decline", "current_balance_norm", "lapsed_ratio",
    "cqs", "catalog_score", "consec_zero_bl", "consec_zero_lms", "prd_added_3m_norm",
    "days_to_renewal_norm", "client_since_norm",
]


def process_india_mart_data(csv_path: str) -> list:
    df = pd.read_csv(csv_path)
    df.columns = [c.strip() for c in df.columns]
    print(f"\nProcessing {len(df)} records from: {csv_path}")

    # ── Step 1: Concurrent API Fetch ──────────────────────────────────────────
    glids     = df['GLUSER'].astype(str).tolist()
    api_cache = {}

    print(f"Fetching real-time engagement data for {len(glids)} suppliers...")
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_map = {executor.submit(fetch_scorecard, g): g for g in glids}
        for i, future in enumerate(as_completed(future_map), 1):
            glid             = future_map[future]
            api_cache[glid]  = future.result()
            if i % 5 == 0 or i == len(glids):
                ok = sum(1 for v in api_cache.values() if v)
                print(f"  [{i}/{len(glids)}] Fetched — Success: {ok}")

    ok_count = sum(1 for v in api_cache.values() if v)
    print(f"API complete: {ok_count}/{len(glids)} successful\n")

    # ── Step 2: Feature Engineering ──────────────────────────────────────────
    all_features = []
    raw_records  = []

    for _, row in df.iterrows():
        glid         = str(row['GLUSER'])
        company_name = str(row.get('Company Name', f'Supplier {glid}')).strip()
        tier         = str(row.get('WS/MDC Main', 'Standard')).strip()
        acct_mgr     = str(row.get('Vertical Final', 'General Support')).strip()
        renewal_str  = str(row.get('Service End-Date', '')).strip()
        status       = str(row.get('Status', '')).strip()
        mode         = str(row.get('Mode', 'Annual')).strip()
        cs_raw       = str(row.get('Client Since', '1')).strip()

        # Renewal date parsing
        for fmt in ('%d-%b-%y', '%d-%b-%Y', '%Y-%m-%d', '%d/%m/%Y'):
            try:
                renewal_date = datetime.strptime(renewal_str, fmt)
                break
            except ValueError:
                pass
        else:
            renewal_date = datetime.now() + timedelta(days=60)

        days_to_renewal = (renewal_date - datetime.now()).days

        try:
            client_since = int(cs_raw.replace('Y', '').strip())
        except (ValueError, AttributeError):
            client_since = 1

        series  = extract_sorted_series(api_cache.get(glid))
        features = engineer_features(series, days_to_renewal, client_since)

        all_features.append(features)
        raw_records.append({
            "glid":            glid,
            "company_name":    company_name,
            "tier":            tier,
            "account_manager": acct_mgr,
            "renewal_date":    renewal_date.strftime('%Y-%m-%d'),
            "days_to_renewal": days_to_renewal,
            "client_since":    client_since,
            "mode":            mode,
            "status":          status,
            "series":          series,
            "features":        features,
        })

    # ── Step 3: Rule Scores ───────────────────────────────────────────────────
    rule_scores = [rule_based_score(f) for f in all_features]

    # ── Step 4: ML Ensemble ───────────────────────────────────────────────────
    X_df = pd.DataFrame([{k: f[k] for k in FEATURE_COLS} for f in all_features])

    # Synthetic labels derived from rule scores (~30% churn rate)
    y_prob = np.array(rule_scores) / 60.0
    y      = (y_prob > 0.45).astype(int)
    if len(np.unique(y)) < 2:               # ensure both classes exist
        top_idx     = np.argsort(y_prob)[-max(3, int(len(y) * 0.30)):]
        y[top_idx]  = 1

    scaler   = StandardScaler()
    X_scaled = scaler.fit_transform(X_df)

    stratify = y if y.sum() >= 2 and (len(y) - y.sum()) >= 2 else None
    X_tr, X_te, y_tr, y_te = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=stratify
    )

    print("Training ML ensemble (LR + Random Forest + XGBoost)...")
    lr  = LogisticRegression(max_iter=1000, random_state=42).fit(X_tr, y_tr)
    rf  = RandomForestClassifier(n_estimators=100, random_state=42).fit(X_tr, y_tr)
    xgb = XGBClassifier(eval_metric='logloss', random_state=42, verbosity=0).fit(X_tr, y_tr)

    print(f"  Accuracy — LR: {lr.score(X_te, y_te):.2f}  RF: {rf.score(X_te, y_te):.2f}  XGB: {xgb.score(X_te, y_te):.2f}")

    # ── Step 5: Final Output ──────────────────────────────────────────────────
    final_data = []
    X_all = scaler.transform(X_df)

    for i, rec in enumerate(raw_records):
        feat  = rec["features"]
        x_row = X_all[i:i+1]

        p_lr  = float(lr.predict_proba(x_row)[0][1])
        p_rf  = float(rf.predict_proba(x_row)[0][1])
        p_xgb = float(xgb.predict_proba(x_row)[0][1])
        ml_prob = (p_lr + p_rf + p_xgb) / 3.0

        rule_s      = rule_scores[i]           # 0-60
        hybrid_raw  = (rule_s / 60.0) * 0.60 * 100 + ml_prob * 0.40 * 100
        final_score = int(round(np.clip(hybrid_raw, 2, 98)))

        if   final_score >= 75: risk_level = "Critical"
        elif final_score >= 55: risk_level = "High"
        elif final_score >= 30: risk_level = "Medium"
        else:                   risk_level = "Low"

        top_reasons = generate_top_reasons(feat, rec["days_to_renewal"])
        if not top_reasons:
            top_reasons = ["Engagement levels are stable — low churn risk detected"]

        # Risk driver badges for the UI
        drivers = []
        if feat["bl_decline"] > 0.40 or feat["_consec_zero_bl"] >= 2:
            impact = "Critical" if (feat["bl_decline"] > 0.70 or feat["_consec_zero_bl"] >= 3) else "Moderate"
            drivers.append({"type": "BuyLeads", "impact": impact, "value": round(feat["bl_decline"] * 100)})
        if feat["lms_decline"] > 0.40 or feat["_consec_zero_lms"] >= 2:
            drivers.append({"type": "Platform Login", "impact": "High", "value": round(feat["lms_decline"] * 100)})
        if feat["enq_decline"] > 0.40:
            drivers.append({"type": "Enquiries", "impact": "Moderate", "value": round(feat["enq_decline"] * 100)})
        if rec["days_to_renewal"] <= 45:
            drivers.append({"type": "Renewal", "impact": "Urgent", "value": rec["days_to_renewal"]})
        if feat["_lapsed_ratio"] > 0.60:
            drivers.append({"type": "Credits Lapsed", "impact": "High", "value": round(feat["_lapsed_ratio"] * 100)})

        s = rec["series"]
        final_data.append({
            # Core identity
            "id":             rec["glid"],
            "name":           rec["company_name"],
            "tier":           rec["tier"],
            "renewalDate":    rec["renewal_date"],
            "accountManager": rec["account_manager"],
            "status":         rec["status"],
            "mode":           rec["mode"],
            "clientSince":    rec["client_since"],

            # Risk output
            "riskLevel":        risk_level,
            "riskScore":        final_score,
            "churnProbability": final_score,
            "daysToRenewal":    rec["days_to_renewal"],

            # Explainability
            "riskDrivers":         drivers[:3],
            "top_reasons":         top_reasons,
            "recommended_action":  get_recommended_action(final_score, rec["days_to_renewal"]),
            "engagement_trend":    (
                "Declining" if feat["bl_decline"] > 0.40 else
                "Stable"    if feat["bl_decline"] < 0.15 else "Warning"
            ),

            # Indicator bars (current month vs 3M avg, shown in UI)
            "indicators": [
                {"label": "BuyLeads",  "decline": round(feat["bl_decline"]       * 100)},
                {"label": "Platform",  "decline": round(feat["lms_decline"]      * 100)},
                {"label": "Enquiries", "decline": round(feat["enq_decline"]      * 100)},
                {"label": "Replies",   "decline": round(feat["reply_decline"]    * 100)},
            ],

            # ML ensemble scores
            "ml_scores": {
                "logistic_regression": round(p_lr  * 100),
                "random_forest":       round(p_rf  * 100),
                "xgboost":             round(p_xgb * 100),
            },

            # Engagement comparison (historical baseline vs current)
            "engagement": {
                "logins":    {"historical": round(safe_avg(s, "lms_active_days", [3,4,5]), 1), "current": round(safe_avg(s, "lms_active_days", [0,1]), 1)},
                "leads":     {"historical": round(safe_avg(s, "bl_cons",         [3,4,5]), 1), "current": round(safe_avg(s, "bl_cons",         [0,1]), 1)},
                "enquiries": {"historical": round(safe_avg(s, "total_enq",       [3,4,5]), 1), "current": round(safe_avg(s, "total_enq",       [0,1]), 1)},
                "replies":   {"historical": round(safe_avg(s, "replies",         [3,4,5]), 1), "current": round(safe_avg(s, "replies",         [0,1]), 1)},
            },

            # 6-month trend for the dashboard area chart
            "trendData": build_trend_data(s),

            # Score transparency
            "scoreBreakdown": {
                "rule_score": round(rule_s),
                "ml_score":   round(ml_prob * 100),
                "final":      final_score,
            },
        })

    # Sort by risk score descending (highest risk first)
    final_data.sort(key=lambda x: x["riskScore"], reverse=True)

    # Build series cache: glid → sorted monthly records (for GenAI server)
    series_cache = {rec["glid"]: rec["series"] for rec in raw_records}
    return final_data, series_cache


# ─── ENTRY POINT ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    result, series_cache = process_india_mart_data('data.csv')

    with open('public/subscribers_data.json', 'w') as f:
        json.dump(result, f, indent=2)

    # Save raw monthly series so the API server can feed them to the LLM
    # without re-fetching from the scorecard API at request time.
    with open('public/series_cache.json', 'w') as f:
        json.dump(series_cache, f, indent=2)

    counts = {lvl: sum(1 for r in result if r["riskLevel"] == lvl)
              for lvl in ["Critical", "High", "Medium", "Low"]}

    print(f"\n{'='*55}")
    print(f"  Churn Early-Warning Analysis Complete")
    print(f"  Total suppliers: {len(result)}")
    print(f"  Critical: {counts['Critical']}  |  High: {counts['High']}  "
          f"|  Medium: {counts['Medium']}  |  Low: {counts['Low']}")
    print(f"  Output: public/subscribers_data.json")
    print(f"{'='*55}\n")
