import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Loader, AlertTriangle, CheckCircle, TrendingDown,
  Zap, Target, Activity, ChevronDown, ChevronUp, X
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

const RISK_COLORS = {
  Critical: { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626', badge: '#dc2626' },
  High:     { bg: '#fff7ed', border: '#fdba74', text: '#ea580c', badge: '#ea580c' },
  Medium:   { bg: '#fefce8', border: '#fde047', text: '#ca8a04', badge: '#ca8a04' },
  Low:      { bg: '#f0fdf4', border: '#86efac', text: '#16a34a', badge: '#16a34a' },
};

function ScoreGauge({ score, riskLevel }) {
  const color = RISK_COLORS[riskLevel] || RISK_COLORS.Low;
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="54" fill="none" stroke="#e2e8f0" strokeWidth="12" />
        <circle
          cx="70" cy="70" r="54"
          fill="none"
          stroke={color.badge}
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="70" y="65" textAnchor="middle" fontSize="26" fontWeight="800" fill={color.badge}>{score}</text>
        <text x="70" y="85" textAnchor="middle" fontSize="11" fill="#64748b">/100</text>
      </svg>
      <span style={{
        padding: '4px 16px', borderRadius: '999px', fontWeight: 700,
        fontSize: '0.85rem', background: color.bg, color: color.badge,
        border: `1.5px solid ${color.border}`
      }}>
        {riskLevel} Risk
      </span>
    </div>
  );
}

function MetricBar({ label, decline }) {
  const color = decline > 60 ? '#dc2626' : decline > 30 ? '#ea580c' : '#16a34a';
  return (
    <div style={{ marginBottom: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
        <span style={{ color: '#475569', fontWeight: 600 }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{decline}% decline</span>
      </div>
      <div style={{ background: '#f1f5f9', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
        <div style={{
          width: `${Math.max(4, 100 - decline)}%`,
          height: '100%',
          background: decline > 60 ? 'linear-gradient(90deg,#dc2626,#f87171)' :
                      decline > 30 ? 'linear-gradient(90deg,#ea580c,#fb923c)' :
                                     'linear-gradient(90deg,#16a34a,#4ade80)',
          borderRadius: '99px',
          transition: 'width 0.8s ease',
        }} />
      </div>
    </div>
  );
}

function EngagementCard({ label, historical, current }) {
  const delta = historical > 0 ? Math.round(((current - historical) / historical) * 100) : 0;
  const isDown = delta < 0;
  return (
    <div style={{
      background: '#f8fafc', borderRadius: '10px', padding: '0.75rem',
      border: '1px solid #e2e8f0', textAlign: 'center'
    }}>
      <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '6px' }}>
        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>{current}</span>
        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>/ {historical} avg</span>
      </div>
      {historical > 0 && (
        <div style={{ fontSize: '0.72rem', marginTop: '4px', color: isDown ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
          {isDown ? '▼' : '▲'} {Math.abs(delta)}%
        </div>
      )}
    </div>
  );
}

export default function GlidAnalyzer() {
  const [glid, setGlid]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');
  const [showRaw, setShowRaw]   = useState(false);
  const [showNarrative, setShowNarrative] = useState(true);

  const analyze = async () => {
    if (!glid.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const resp = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ glid: glid.trim() }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      setResult(data);
    } catch (e) {
      setError(e.message || 'Analysis failed. Check if API server is running.');
    } finally {
      setLoading(false);
    }
  };

  const colors = result ? (RISK_COLORS[result.riskLevel] || RISK_COLORS.Low) : {};

  return (
    <section style={{ marginTop: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '10px',
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={18} color="white" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
            Live GLID Analyser
          </h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
            Enter any supplier GLID — get instant AI churn analysis
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', maxWidth: 480 }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: '0.6rem',
          background: 'white', border: '2px solid #e2e8f0',
          borderRadius: '12px', padding: '0 1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          transition: 'border-color 0.2s',
        }}
          onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
          onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
        >
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Enter GLID (e.g. 121500)"
            value={glid}
            onChange={e => setGlid(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && analyze()}
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: '0.95rem', padding: '0.75rem 0',
              fontWeight: 600, color: '#1e293b', background: 'transparent',
            }}
          />
          {glid && (
            <button onClick={() => { setGlid(''); setResult(null); setError(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}>
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={analyze}
          disabled={loading || !glid.trim()}
          style={{
            padding: '0 1.5rem', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: loading || !glid.trim()
              ? '#e2e8f0'
              : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: loading || !glid.trim() ? '#94a3b8' : 'white',
            fontWeight: 700, fontSize: '0.9rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            transition: 'all 0.2s', boxShadow: loading ? 'none' : '0 4px 12px rgba(99,102,241,0.35)',
          }}
        >
          {loading ? <Loader size={16} className="spin" /> : <Target size={16} />}
          {loading ? 'Analysing...' : 'Analyse'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px',
            padding: '0.75rem 1rem', color: '#dc2626', fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem',
          }}
        >
          <AlertTriangle size={15} /> {error}
        </motion.div>
      )}

      {/* Loading shimmer */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            background: 'white', borderRadius: '16px', padding: '2rem',
            border: '1px solid #e2e8f0', textAlign: 'center',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          <div className="ai-spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: '#64748b', fontWeight: 600 }}>
            Fetching 12-month engagement history · Running hybrid AI model...
          </p>
        </motion.div>
      )}

      {/* Results */}
      <AnimatePresence>
      {result && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={{
            background: 'white', borderRadius: '16px',
            border: `2px solid ${colors.border}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}
        >
          {/* Result header bar */}
          <div style={{
            background: colors.bg, padding: '1rem 1.5rem',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Analysis for GLID {result.glid}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>{result.name}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{
                padding: '3px 12px', borderRadius: '999px', fontSize: '0.78rem',
                fontWeight: 700, background: colors.badge, color: 'white'
              }}>
                {result.engagementTrend || result.engagement_trend || 'Analysed'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {result.daysToRenewal >= 0
                  ? `Renewal in ${result.daysToRenewal}d`
                  : `Renewal ${Math.abs(result.daysToRenewal)}d ago`}
              </span>
            </div>
          </div>

          <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '160px 1fr', gap: '1.5rem' }}>
            {/* Score gauge */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <ScoreGauge score={result.riskScore} riskLevel={result.riskLevel} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Score Breakdown</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  AI Score: <strong style={{ color: '#1e293b' }}>{result.riskScore}/100</strong>
                </div>
              </div>
            </div>

            {/* Right panel */}
            <div>
              {/* Engagement numbers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {Object.entries(result.engagement).map(([k, v]) => (
                  <EngagementCard key={k} label={k} historical={v.historical} current={v.current} />
                ))}
              </div>

              {/* Indicator bars */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                  Decline vs 3-Month Baseline
                </div>
                {result.indicators.map(ind => (
                  <MetricBar key={ind.label} label={ind.label} decline={ind.decline} />
                ))}
              </div>
            </div>
          </div>

          {/* Trend chart */}
          {result.trendData?.length > 0 && (
            <div style={{ padding: '0 1.5rem 1.25rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                <Activity size={12} style={{ display: 'inline', marginRight: 4 }} />
                6-Month Engagement Velocity
              </div>
              <div style={{ height: 130 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={result.trendData}>
                    <defs>
                      <linearGradient id="glid-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={colors.badge} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={colors.badge} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="engagement" stroke={colors.badge} strokeWidth={2.5}
                      fillOpacity={1} fill="url(#glid-grad)" dot={{ r: 3, fill: colors.badge }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top reasons */}
          <div style={{ padding: '0 1.5rem 1.25rem' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              <AlertTriangle size={12} style={{ display: 'inline', marginRight: 4 }} />
              Primary Churn Signals
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(result.topReasons || result.top_reasons || []).map((r, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
                  background: colors.bg, padding: '0.6rem 0.8rem',
                  borderRadius: '8px', borderLeft: `3px solid ${colors.badge}`,
                }}>
                  <span style={{ color: colors.badge, fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>{i+1}</span>
                  <span style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.5 }}>{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Narrative */}
          {result.ai_narrative && (
            <div style={{ padding: '0 1.5rem 1.25rem' }}>
              <button
                onClick={() => setShowNarrative(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  width: '100%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  border: 'none', borderRadius: '10px', padding: '0.7rem 1rem',
                  color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Zap size={15} /> AI Retention Analysis
                </span>
                {showNarrative ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              <AnimatePresence>
              {showNarrative && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{
                    background: '#f8f7ff', border: '1px solid #c7d2fe',
                    borderRadius: '0 0 10px 10px', padding: '1rem',
                    fontSize: '0.83rem', color: '#374151', lineHeight: 1.75,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {result.ai_narrative}
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>
          )}

          {/* Recommended action */}
          <div style={{
            margin: '0 1.5rem 1.5rem', padding: '0.9rem 1rem',
            background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px',
            display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
          }}>
            <CheckCircle size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px' }}>
                Recommended Action
              </div>
              <div style={{ fontSize: '0.83rem', color: '#15803d', fontWeight: 600 }}>
                {result.recommendedAction || result.recommended_action}
              </div>
            </div>
          </div>

          {/* Latest month raw metrics toggle */}
          <div style={{ padding: '0 1.5rem 1.5rem' }}>
            <button
              onClick={() => setShowRaw(v => !v)}
              style={{
                background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px',
                padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: '#64748b',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600,
              }}
            >
              <TrendingDown size={13} />
              {showRaw ? 'Hide' : 'Show'} Latest Month Raw Metrics
              {showRaw ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            <AnimatePresence>
            {showRaw && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '0.5rem',
                  marginTop: '0.75rem',
                }}>
                  {Object.entries(result.latestMonth)
                    .filter(([k]) => k !== 'month')
                    .map(([k, v]) => (
                    <div key={k} style={{
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: '8px', padding: '0.5rem', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px' }}>
                        {k.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: v === 0 ? '#dc2626' : '#1e293b' }}>
                        {typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(1)) : v}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.4rem' }}>
                  Latest month: {result.latestMonth.month}  · Red = zero value (warning signal)
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </section>
  );
}
