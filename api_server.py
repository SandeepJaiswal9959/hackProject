"""
IndiaMART Churn Early-Warning — GenAI-Powered Analysis Server
=============================================================
Architecture: GLID → Raw Engagement Data → Gemini LLM → Structured Churn Analysis

The LLM is the intelligence engine. It:
  - Reads 12 months of real engagement time-series
  - Identifies declining patterns across 15+ signals
  - Assigns a churn risk score (0-100)
  - Explains the top reasons in plain English
  - Recommends specific retention actions

No hand-coded rules. No sklearn. Pure GenAI.

Run: uvicorn api_server:app --port 8002
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx, json, re
from pathlib import Path
from datetime import datetime

# ── Config ─────────────────────────────────────────────────────────────────────
SCORECARD_API_URL = "https://imdwh.intermesh.net/api/go/cust_scorecard_api"
PRECOMPUTED_PATH  = Path("public/subscribers_data.json")
SERIES_CACHE_PATH = Path("public/series_cache.json")
LLM_URL           = "https://imllm.intermesh.net/v1/chat/completions"
LLM_KEY           = "sk-Bbwms0AvP-Zk43rMVqKPhw"
LLM_MODEL         = "gpt-4o-mini"

app = FastAPI(title="IndiaMART Churn AI", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_precomputed: dict[str, dict] = {}   # glid → pre-processed engagement record
_series_cache: dict[str, list] = {}  # glid → raw monthly series (for LLM)


# ── Startup: load pre-computed data + raw series cache ────────────────────────
@app.on_event("startup")
async def load_precomputed():
    if PRECOMPUTED_PATH.exists():
        records = json.loads(PRECOMPUTED_PATH.read_text(encoding="utf-8"))
        for r in records:
            _precomputed[str(r["id"])] = r
        print(f"[startup] Loaded {len(_precomputed)} pre-computed records")

    if SERIES_CACHE_PATH.exists():
        _series_cache.update(json.loads(SERIES_CACHE_PATH.read_text(encoding="utf-8")))
        print(f"[startup] Loaded series cache for {len(_series_cache)} GLIDs")


# ── Async scorecard fetch ──────────────────────────────────────────────────────
async def fetch_scorecard_async(glid: str) -> list | None:
    """Fetch & unwrap 12-month time-series from IndiaMART scorecard API."""
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            resp = await client.post(
                SCORECARD_API_URL,
                json={"in_glusr_usr_id": str(glid), "in_rpt_type": "1"},
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
            envelope = resp.json()

            # API wraps payload: {"err_txt":"","response":"<JSON string>"}
            if isinstance(envelope, dict) and "response" in envelope:
                inner = envelope["response"]
                data  = json.loads(inner) if isinstance(inner, str) else inner
            elif isinstance(envelope, str):
                data  = json.loads(envelope)
            else:
                data  = envelope

            series = data.get("summary", []) if isinstance(data, dict) else []
            return sorted(series, key=lambda x: x.get("month_number", 99))
    except Exception as e:
        print(f"[fetch] Failed for GLID {glid}: {e}")
        return None


# ── Format engagement data for the LLM ────────────────────────────────────────
def format_series_for_llm(series: list) -> str:
    """
    Convert raw monthly records into a clean markdown table for the LLM prompt.
    Keeps the 15 most signal-rich columns. Newest month first.
    """
    MONTH_MAP = {1:"May",2:"Apr",3:"Mar",4:"Feb",5:"Jan",6:"Dec",
                 7:"Nov",8:"Oct",9:"Sep",10:"Aug",11:"Jul",12:"Jun"}
    FIELDS = [
        ("bl_cons",             "BL Consumed"),
        ("bl_active_days",      "BL Active Days"),
        ("bl_credit_lapsed",    "BL Credits Lapsed"),
        ("current_balance",     "Credit Balance"),
        ("total_enq",           "Enquiries"),
        ("replies",             "Replies"),
        ("callbacks",           "Callbacks"),
        ("success_connect",     "Successful Connects"),
        ("outgoing_call_answered", "Calls Answered"),
        ("lms_active_days",     "Platform Logins"),
        ("emails_opened",       "Emails Opened"),
        ("cqs",                 "Catalog Quality Score"),
        ("catalog_score",       "Catalog Score"),
        ("prd_added",           "Products Added"),
        ("pns_calls_ans",       "Push Calls Answered"),
    ]

    header = "| Month | " + " | ".join(f[1] for f in FIELDS) + " |"
    sep    = "|-------|" + "|".join(["-------"] * len(FIELDS)) + "|"
    rows   = []
    for rec in series[:7]:   # last 7 months is enough context
        mn    = rec.get("month_number", 0)
        label = MONTH_MAP.get(mn, f"M{mn}")
        vals  = " | ".join(str(rec.get(f[0]) or 0) for f in FIELDS)
        rows.append(f"| {label} | {vals} |")

    return "\n".join([header, sep] + rows)


def build_trend_data(series: list) -> list:
    MONTH_MAP = {1:"May",2:"Apr",3:"Mar",4:"Feb",5:"Jan",6:"Dec",
                 7:"Nov",8:"Oct",9:"Sep",10:"Aug",11:"Jul",12:"Jun"}
    trend = []
    for rec in series[:6]:
        mn  = rec.get("month_number", 0)
        bl  = float(rec.get("bl_cons") or 0)
        lms = float(rec.get("lms_active_days") or 0) * 3
        enq = float(rec.get("total_enq") or 0)
        trend.append({"name": MONTH_MAP.get(mn, f"M{mn}"),
                      "engagement": round(min(100, bl + lms + enq), 1)})
    return list(reversed(trend))


# ── Core GenAI Analysis ────────────────────────────────────────────────────────
async def genai_analyze(glid: str, name: str, series: list,
                        days_to_renewal: int) -> dict:
    """
    Send raw engagement data to Gemini. The LLM performs the full churn analysis
    and returns structured JSON. No rule engine. No ML library. Pure GenAI.
    """
    table = format_series_for_llm(series)

    # Latest month raw values for the latestMonth card
    first = series[0] if series else {}

    prompt = (
        f"You are an IndiaMART retention analyst. Analyse this premium supplier's churn risk.\n"
        f"Supplier: {name} (GLID:{glid}), renewal in {days_to_renewal} days.\n\n"
        f"{table}\n\n"
        "CONTEXT: BL Consumed = BuyLeads the supplier used to contact buyers (core ROI). "
        "BL Credits Lapsed = paid credits that expired unused (strongest churn signal). "
        "Platform Logins = days active on IndiaMART. CQS = catalog quality score 0-100. "
        "Compare months 1-2 (recent) vs months 4-6 (baseline) to calculate % decline.\n\n"
        "Output ONLY this compact JSON — use real numbers from the data, be specific:\n"
        '{"s":SCORE,"l":"LEVEL","t":"TREND",'
        '"r":["specific reason with % and metric name","reason2","reason3"],'
        '"a":"1 sentence AM action","ss":"2 sentence situation","rc":"2 sentence root cause",'
        '"p":["AM step 1","AM step 2","AM step 3"],'
        '"m":{"b":BL_DECLINE_PCT,"lg":LMS_DECLINE_PCT,"e":ENQ_DECLINE_PCT,"rp":REPLY_DECLINE_PCT}}\n'
        "LEVEL: Critical=75-100, High=55-74, Medium=30-54, Low=0-29. TREND: Declining/Warning/Stable."
    )

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                LLM_URL,
                headers={"Authorization": f"Bearer {LLM_KEY}",
                         "Content-Type": "application/json"},
                json={
                    "model": LLM_MODEL,
                    "messages": [
                        {"role": "system", "content": "JSON API. Return only valid compact JSON. No markdown. No prose."},
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": 500,
                    "temperature": 0.1,
                },
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"].strip()

            # Strip markdown fences
            content = re.sub(r'^```(?:json)?\s*', '', content)
            content = re.sub(r'\s*```\s*$', '', content).strip()

            # Extract JSON object (handle truncation by finding last valid close)
            json_match = re.search(r'\{[\s\S]*\}', content)
            if not json_match:
                raise ValueError(f"No JSON in response (len={len(content)}): {content[:150]}")
            analysis_raw = json.loads(json_match.group())

            # Remap compact keys → full keys
            score_raw  = int(analysis_raw.get("s", 50))
            level_from_llm = analysis_raw.get("l", "Medium")
            # Reconcile: if score contradicts level, trust the level and adjust score
            level_to_range = {"Critical": (75, 92), "High": (55, 74), "Medium": (30, 54), "Low": (5, 29)}
            lo, hi = level_to_range.get(level_from_llm, (30, 54))
            if not (lo <= score_raw <= hi):
                score_raw = max(lo, min(hi, score_raw)) if score_raw < lo else min(hi, score_raw)
            analysis = {
                "riskScore":       score_raw,
                "riskLevel":       level_from_llm,
                "engagementTrend": analysis_raw.get("t", "Warning"),
                "topReasons":      analysis_raw.get("r", []),
                "recommendedAction": analysis_raw.get("a", ""),
                "situationSummary": analysis_raw.get("ss", ""),
                "rootCause":       analysis_raw.get("rc", ""),
                "retentionPlaybook": analysis_raw.get("p", []),
                "keyMetrics":      analysis_raw.get("m", {}),
            }
            # Remap keyMetrics compact keys
            km_raw = analysis_raw.get("m", {})
            analysis["keyMetrics"] = {
                "bl_decline_pct":    km_raw.get("b", 0),
                "lms_decline_pct":   km_raw.get("lg", 0),
                "enq_decline_pct":   km_raw.get("e", 0),
                "reply_decline_pct": km_raw.get("rp", 0),
            }

    except Exception as e:
        print(f"[LLM] Failed for GLID {glid}: {e}")
        # Fallback to structural analysis if LLM fails
        analysis = _fallback_analysis(series)

    # Build indicator bars from LLM's keyMetrics
    km = analysis.get("keyMetrics", {})
    indicators = [
        {"label": "BuyLeads",  "decline": km.get("bl_decline_pct", 0)},
        {"label": "Platform",  "decline": km.get("lms_decline_pct", 0)},
        {"label": "Enquiries", "decline": km.get("enq_decline_pct", 0)},
        {"label": "Replies",   "decline": km.get("reply_decline_pct", 0)},
    ]

    # Risk driver badges
    drivers = []
    if km.get("bl_decline_pct", 0) > 40:
        impact = "Critical" if km["bl_decline_pct"] > 70 else "Moderate"
        drivers.append({"type": "BuyLeads",       "impact": impact,     "value": km["bl_decline_pct"]})
    if km.get("lms_decline_pct", 0) > 40:
        drivers.append({"type": "Platform Login", "impact": "High",     "value": km["lms_decline_pct"]})
    if km.get("enq_decline_pct", 0) > 40:
        drivers.append({"type": "Enquiries",      "impact": "Moderate", "value": km["enq_decline_pct"]})
    if km.get("reply_decline_pct", 0) > 60:
        drivers.append({"type": "Replies",        "impact": "High",     "value": km["reply_decline_pct"]})

    def safe_avg(field, indices):
        vals = [float(series[i].get(field) or 0) for i in indices if i < len(series)]
        return round(sum(vals)/len(vals), 1) if vals else 0.0

    return {
        "riskScore":          int(analysis.get("riskScore", 50)),
        "riskLevel":          analysis.get("riskLevel", "Medium"),
        "engagementTrend":    analysis.get("engagementTrend", "Warning"),
        "topReasons":         analysis.get("topReasons", []),
        "recommendedAction":  analysis.get("recommendedAction", ""),
        "ai_narrative": (
            f"**1. Situation Summary**\n{analysis.get('situationSummary','')}\n\n"
            f"**2. Root Cause**\n{analysis.get('rootCause','')}\n\n"
            f"**3. Retention Playbook**\n"
            + "\n".join(f"{i+1}. {s}" for i, s in enumerate(analysis.get("retentionPlaybook", [])))
        ),
        "indicators":  indicators,
        "riskDrivers": drivers[:3],
        "trendData":   build_trend_data(series),
        "engagement": {
            "logins":    {"historical": safe_avg("lms_active_days", [3,4,5]), "current": safe_avg("lms_active_days", [0,1])},
            "leads":     {"historical": safe_avg("bl_cons",         [3,4,5]), "current": safe_avg("bl_cons",         [0,1])},
            "enquiries": {"historical": safe_avg("total_enq",       [3,4,5]), "current": safe_avg("total_enq",       [0,1])},
            "replies":   {"historical": safe_avg("replies",         [3,4,5]), "current": safe_avg("replies",         [0,1])},
        },
        "latestMonth": {
            "month":                  first.get("data_month", "Latest"),
            "bl_cons":                first.get("bl_cons", 0) or 0,
            "bl_active_days":         first.get("bl_active_days", 0) or 0,
            "lms_active_days":        first.get("lms_active_days", 0) or 0,
            "total_enq":              first.get("total_enq", 0) or 0,
            "replies":                first.get("replies", 0) or 0,
            "callbacks":              first.get("callbacks", 0) or 0,
            "success_connect":        first.get("success_connect", 0) or 0,
            "cqs":                    first.get("cqs", 0) or 0,
            "catalog_score":          round(float(first.get("catalog_score") or 0), 1),
            "current_balance":        first.get("current_balance", 0) or 0,
            "bl_credit_lapsed":       first.get("bl_credit_lapsed", 0) or 0,
            "outgoing_call_answered": first.get("outgoing_call_answered", 0) or 0,
            "emails_opened":          first.get("emails_opened", 0) or 0,
            "prd_added":              first.get("prd_added", 0) or 0,
        },
    }


def _fallback_analysis(series: list) -> dict:
    """Simple structural fallback if LLM is unavailable."""
    def avg(field, indices):
        vals = [float(series[i].get(field) or 0) for i in indices if i < len(series)]
        return sum(vals)/len(vals) if vals else 0.0

    bl_r, bl_h   = avg("bl_cons", [0,1]),  avg("bl_cons", [3,4,5])
    lms_r,lms_h  = avg("lms_active_days",[0,1]), avg("lms_active_days",[3,4,5])
    bl_d  = round((bl_h - bl_r)  / max(bl_h, 1)  * 100)
    lms_d = round((lms_h - lms_r)/ max(lms_h, 1) * 100)
    score = min(98, max(2, int(bl_d * 0.5 + lms_d * 0.3)))

    return {
        "riskScore": score,
        "riskLevel": "Critical" if score>=75 else "High" if score>=55 else "Medium" if score>=30 else "Low",
        "engagementTrend": "Declining" if bl_d > 40 else "Warning",
        "topReasons": [f"BuyLead consumption declined by {bl_d}%",
                       f"Platform login activity dropped by {lms_d}%"],
        "recommendedAction": "Account Manager follow-up required",
        "situationSummary": "Engagement has declined significantly.",
        "rootCause": "Supplier may not be seeing value from the platform.",
        "retentionPlaybook": ["Schedule a call", "Share ROI report", "Offer catalog help"],
        "keyMetrics": {"bl_decline_pct": bl_d, "lms_decline_pct": lms_d,
                       "enq_decline_pct": 0, "reply_decline_pct": 0},
    }


# ── Endpoints ──────────────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    glid: str


@app.post("/api/analyze")
async def analyze_glid(req: AnalyzeRequest):
    glid = req.glid.strip()
    if not glid.isdigit():
        raise HTTPException(status_code=400, detail="GLID must be numeric")

    precomputed     = _precomputed.get(glid)
    name            = precomputed.get("name", f"Supplier {glid}") if precomputed else f"Supplier {glid}"
    days_to_renewal = precomputed.get("daysToRenewal", 60) if precomputed else 60

    # ── Series resolution: cache → live API ────────────────────────────────────
    # 1. Series cache (saved by process_data.py) — fastest, no network needed
    series = _series_cache.get(glid)

    # 2. Live API fetch (for GLIDs not in cache)
    if not series:
        series = await fetch_scorecard_async(glid)

    if not series:
        raise HTTPException(status_code=502,
            detail=f"No engagement data for GLID {glid}. "
                   f"Run process_data.py first, or check if GLID exists.")

    # ── GenAI Analysis ────────────────────────────────────────────────────────
    result = await genai_analyze(glid, name, series, days_to_renewal)

    return {
        "glid":               glid,
        "name":               name,
        "daysToRenewal":      days_to_renewal,
        "source":             "genai",
        **result,
    }


@app.get("/api/health")
async def health():
    return {"status": "ok", "engine": "GenAI (gemini-2.5-flash)",
            "precomputed_count": len(_precomputed),
            "timestamp": datetime.now().isoformat()}
