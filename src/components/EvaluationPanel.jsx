import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Sparkles, RefreshCw } from 'lucide-react';

// ── Rubric & project context ────────────────────────────────────────────────
const SKILLS_MD = `
# Churn Early-Warning System — skills.md

## What Was Built
An AI-powered Churn Early-Warning System for IndiaMART premium subscribers.
Identifies high-risk churn candidates 90 days before renewal using behavioral analytics and a business rule engine.

## Technical Skills
- React 19, Vite, Recharts, Glassmorphism UI design system
- dataGenerator.js: Synthetic subscriber data with realistic risk simulation
- riskEngine.js: Multi-signal Business Rule Engine:
    * Rule 1: Renewal Proximity (< 30d = +40pts, < 60d = +25pts, ≤ 90d = +10pts)
    * Rule 2: Engagement Decline (> 50% = +50pts, > 30% = +30pts, > 10% = +10pts)
    * Rule 3: Tier Weighting (Platinum = +10pts)
    * Categories: High (≥70), Medium (≥40), Low (<40)
- Tracks 3 engagement signals: Logins, Leads, Enquiries
- KPI dashboard with at-risk counts, engagement trend charts, per-subscriber drill-down
- One-click Account Manager notification for retention action
- Google Gemini API integration for AI-powered autonomous evaluation
- 6-month engagement trend visualization with decline detection

## Problem Domain
B2B marketplace premium subscription churn. Target: IndiaMART premium subscribers 
approaching 90-day renewal window. Goal: proactive retention, not reactive response.
Business Value: Each retained premium subscriber = significant ARR.

## Architecture
Client-side rule engine → no backend dependency. 
Mock data generation → demo-ready without live pipeline.
Component separation: dataGenerator (ETL) → riskEngine (scoring) → App (visualization).
`;

const RUBRIC = `
Evaluation Rubric (score each 1-5):

1. IMPACT — Reach & Scalability:
   1=Hyper-Local (1 person), 2=Niche (10+ people), 3=Community (100+), 
   4=Strategic (500+), 5=Systemic (1000+ people)

2. PINCH_METRICS — Problem Statement Quality:
   1=Poor/Vague/No metrics, 2=Fair (general pain points), 3=Good (generic metrics),
   4=Very Good (saved hours defined), 5=Excellent (high-conviction data)

3. COMPLETENESS — % Scope Problem Statement Addressed:
   1=10%, 2=25%, 3=50%, 4=75%, 5=90%

4. ROBUSTNESS — Logic & Accuracy:
   1=Fundamental Error, 2=Fragile Logic, 3=Standard/Functional, 
   4=High Accuracy (Durable), 5=Deeply Insightful

5. SKILLED — skills.md Quality:
   1=Missing/Keywords only, 2=Basic List Only, 3=Clear Mapping,
   4=Detailed Breakdown, 5=Professional-Grade
`;

const METRIC_META = [
  { id: 'impact',       label: '1. Impact',               icon: '🎯', color: '#00599a' },
  { id: 'pinch',        label: '2. Pinch Metrics',         icon: '📌', color: '#7c3aed' },
  { id: 'completeness', label: '3. Completeness',          icon: '✅', color: '#0891b2' },
  { id: 'robustness',   label: '4. Robustness',            icon: '🛡️', color: '#dc2626' },
  { id: 'skilled',      label: '5. Skilled Solution',      icon: '⚡', color: '#059669' },
];

// ── Gemini call ─────────────────────────────────────────────────────────────
async function evaluateWithGemini(apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
You are an expert hackathon judge for IndiaMART's internal hackathon.
Evaluate the following project against the rubric provided.

PROJECT CONTEXT (skills.md):
${SKILLS_MD}

${RUBRIC}

Respond ONLY with a valid JSON object in this exact format (no markdown, no explanation outside JSON):
{
  "scores": {
    "impact": <number 1-5>,
    "pinch": <number 1-5>,
    "completeness": <number 1-5>,
    "robustness": <number 1-5>,
    "skilled": <number 1-5>
  },
  "labels": {
    "impact": "<level label>",
    "pinch": "<level label>",
    "completeness": "<level label>",
    "robustness": "<level label>",
    "skilled": "<level label>"
  },
  "reasoning": {
    "impact": "<1-2 sentence justification>",
    "pinch": "<1-2 sentence justification>",
    "completeness": "<1-2 sentence justification>",
    "robustness": "<1-2 sentence justification>",
    "skilled": "<1-2 sentence justification>"
  },
  "overall_summary": "<2-3 sentence overall assessment of the solution>",
  "strengths": "<key strength of this solution>",
  "improvement": "<one key area to improve>"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  // Strip markdown code fences if present
  const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  return JSON.parse(clean);
}

// ── Grade helper ─────────────────────────────────────────────────────────────
function getGrade(total, max) {
  const pct = (total / max) * 100;
  if (pct >= 90) return { label: 'Outstanding 🏆', color: '#059669' };
  if (pct >= 75) return { label: 'Excellent ⭐', color: '#0891b2' };
  if (pct >= 60) return { label: 'Good 👍', color: '#00599a' };
  if (pct >= 40) return { label: 'Fair 📈', color: '#f59e0b' };
  return { label: 'Needs Work 🔧', color: '#ef4444' };
}

// ── Component ────────────────────────────────────────────────────────────────
export default function AIEvaluator() {
  const [apiKey, setApiKey] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleEvaluate = async () => {
    if (!apiKey.trim()) { setError('Please enter your Gemini API key.'); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await evaluateWithGemini(apiKey.trim());
      setResult(data);
    } catch (e) {
      setError(`Evaluation failed: ${e.message}. Check your API key and try again.`);
    } finally {
      setLoading(false);
    }
  };

  const totalScore = result
    ? Object.values(result.scores).reduce((a, b) => a + b, 0)
    : null;
  const grade = totalScore ? getGrade(totalScore, 25) : null;

  return (
    <div className="ai-eval-panel fade-in">
      {/* Header */}
      <div className="ai-eval-header">
        <div>
          <div className="ai-eval-title">
            <Sparkles size={18} color="var(--accent)" />
            AI-Powered Solution Evaluator
          </div>
          <div className="ai-eval-subtitle">
            Powered by Google Gemini · Scores against IndiaMART Hackathon Rubric
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            type="password"
            placeholder="Gemini API Key"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEvaluate()}
            style={{
              padding: '0.55rem 0.875rem',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid #e2e8f0',
              fontSize: '0.85rem',
              fontFamily: 'inherit',
              width: '220px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
          <button
            id="ai-evaluate-btn"
            className="ai-eval-btn"
            onClick={handleEvaluate}
            disabled={loading}
          >
            {loading
              ? <><RefreshCw size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Evaluating…</>
              : <><Sparkles size={15} /> Evaluate with AI</>
            }
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="ai-eval-body">
        {/* Loading */}
        {loading && (
          <div className="ai-eval-loading">
            <div className="ai-spinner" />
            <div style={{ fontWeight: 600 }}>Gemini is analysing the solution…</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Reading skills.md · Applying rubric · Generating scores
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ padding: '1rem 1.5rem', background: '#fee2e2', borderRadius: 'var(--radius-md)', color: '#dc2626', fontSize: '0.875rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <>
            {/* Overall banner */}
            <div className="ai-overall-banner">
              <div className="ai-overall-left">
                <span className="ai-overall-label">Overall Score</span>
                <span className="ai-overall-score">{totalScore}<span style={{ fontSize: '1.2rem', fontWeight: 500, opacity: 0.7 }}>/25</span></span>
                <span className="ai-overall-grade">{grade.label}</span>
              </div>
              <div className="ai-overall-summary">{result.overall_summary}</div>
            </div>

            {/* Per-metric score cards */}
            <div className="ai-scores-grid">
              {METRIC_META.map(m => {
                const score = result.scores[m.id];
                const label = result.labels[m.id];
                return (
                  <div key={m.id} className="ai-score-card" style={{ borderTop: `3px solid ${m.color}` }}>
                    <div className="ai-score-icon">{m.icon}</div>
                    <div className="ai-score-metric">{m.label}</div>
                    <div className="ai-score-value" style={{ color: m.color }}>{score}</div>
                    <div className="ai-score-label">{label}</div>
                    <div className="ai-score-bar-bg">
                      <div
                        className="ai-score-bar-fill"
                        style={{ width: `${(score / 5) * 100}%`, background: m.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reasoning cards */}
            <div className="ai-reasoning-grid">
              {METRIC_META.map(m => (
                <div key={m.id} className="ai-reasoning-card" style={{ borderLeftColor: m.color }}>
                  <div className="ai-reasoning-title" style={{ color: m.color }}>
                    {m.icon} {m.label}
                  </div>
                  <div className="ai-reasoning-text">{result.reasoning[m.id]}</div>
                </div>
              ))}

              {/* Strengths & Improvements */}
              <div className="ai-reasoning-card" style={{ borderLeftColor: '#059669', background: '#f0fdf4' }}>
                <div className="ai-reasoning-title" style={{ color: '#059669' }}>💪 Key Strength</div>
                <div className="ai-reasoning-text">{result.strengths}</div>
              </div>
              <div className="ai-reasoning-card" style={{ borderLeftColor: '#f59e0b', background: '#fffbeb' }}>
                <div className="ai-reasoning-title" style={{ color: '#f59e0b' }}>🎯 Improve Next</div>
                <div className="ai-reasoning-text">{result.improvement}</div>
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <div className="ai-eval-empty">
            <div className="ai-eval-empty-icon">🤖</div>
            <div className="ai-eval-empty-title">AI Evaluation Ready</div>
            <div className="ai-eval-empty-desc">
              Enter your Gemini API key above and click <strong>Evaluate with AI</strong> to get
              an instant score of your Churn Early-Warning System against the IndiaMART hackathon rubric.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
