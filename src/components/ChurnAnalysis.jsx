import React, { useState, useMemo } from 'react';
import {
  getOverallStats,
  getStatsByClientSince,
  getStatsByVertical,
  getStatsByMode,
  getStatsBySecondLayer,
  getStatsCrossTab,
  getChurnScore,
  getAllRecords
} from '../utils/churnAnalyzer';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingDown, CheckCircle, AlertTriangle, Zap, Search, ChevronUp, ChevronDown } from 'lucide-react';

// ── pending GLID detail table ─────────────────────────────────────────────────
function PendingGlidTable() {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('score');
  const [sortDir, setSortDir] = useState('desc');
  const [filterVertical, setFilterVertical] = useState('All');
  const [filterMode, setFilterMode] = useState('All');
  const [filterLayer, setFilterLayer] = useState('All');

  const rows = useMemo(() => {
    return getAllRecords()
      .filter(r => r.churned)
      .map(r => {
        const { score, riskLevel, riskColor } = getChurnScore({
          clientSince: r.clientSince,
          mode: r.mode,
          secondLayer: r.secondLayer,
          vertical: r.vertical
        });
        return { ...r, score, riskLevel, riskColor };
      });
  }, []);

  const filtered = useMemo(() => {
    let res = rows;
    if (query) res = res.filter(r => String(r.gluser).includes(query.trim()));
    if (filterVertical !== 'All') res = res.filter(r => r.vertical === filterVertical);
    if (filterMode !== 'All') res = res.filter(r => r.mode === filterMode);
    if (filterLayer !== 'All') res = res.filter(r => r.secondLayer === filterLayer);
    return [...res].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string') av = av.toLowerCase(), bv = bv.toLowerCase();
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [rows, query, sortKey, sortDir, filterVertical, filterMode, filterLayer]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ k }) => sortKey === k
    ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
    : <ChevronDown size={12} color="#cbd5e1" />;

  const th = (label, key) => (
    <th onClick={() => toggleSort(key)} style={{ padding: '0.65rem 0.75rem', textAlign: key === 'score' || key === 'clientSince' ? 'center' : 'left', cursor: 'pointer', whiteSpace: 'nowrap', color: sortKey === key ? '#6366f1' : 'var(--text-muted,#64748b)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', userSelect: 'none' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>{label}<SortIcon k={key} /></span>
    </th>
  );

  const sel = (val, set, opts) => (
    <select value={val} onChange={e => set(e.target.value)} style={{ padding: '0.4rem 0.7rem', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fff', cursor: 'pointer' }}>
      {opts.map(o => <option key={o}>{o}</option>)}
    </select>
  );

  const memberLabel = n => n === 1 ? 'New (1 yr)' : n === 2 ? '2 yrs' : 'Loyal (3 yrs)';
  const memberColor = n => n === 1 ? { bg: '#fee2e2', fg: '#b91c1c' } : n === 2 ? { bg: '#fef3c7', fg: '#92400e' } : { bg: '#dcfce7', fg: '#15803d' };

  const highRisk = filtered.filter(r => r.riskLevel === 'High').length;
  const medRisk  = filtered.filter(r => r.riskLevel === 'Medium').length;

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingDown size={16} color="#ef4444" /> Pending Sellers — GLID Detail
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
            {filtered.length} sellers · <span style={{ color: '#ef4444', fontWeight: 700 }}>{highRisk} High</span> · <span style={{ color: '#f59e0b', fontWeight: 700 }}>{medRisk} Medium</span>
          </div>
        </div>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem 0.8rem' }}>
          <Search size={14} color="#94a3b8" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search GLID…" style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', width: '130px' }} />
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Filter:</span>
        {sel(filterVertical, setFilterVertical, ['All', 'Field Support', 'Tele Support'])}
        {sel(filterMode, setFilterMode, ['All', 'Annual', 'Multi Year'])}
        {sel(filterLayer, setFilterLayer, ['All', 'Catalog', 'Listing', 'Export-TS'])}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', maxHeight: '520px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2 }}>
            <tr>
              <th style={{ padding: '0.65rem 0.75rem 0.65rem 1.5rem', textAlign: 'left', fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>#</th>
              {th('GLID', 'gluser')}
              {th('Vertical', 'vertical')}
              {th('Service End', 'serviceEndDate')}
              {th('Member Since', 'clientSince')}
              {th('Plan', 'mode')}
              {th('Product Layer', 'secondLayer')}
              {th('Churn Score', 'score')}
              <th style={{ padding: '0.65rem 1.5rem 0.65rem 0.75rem', textAlign: 'center', fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Risk</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.gluser} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                <td style={{ padding: '0.6rem 0.75rem 0.6rem 1.5rem', color: '#94a3b8', fontSize: '0.75rem' }}>{i + 1}</td>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.9rem', color: '#1e293b' }}>{r.gluser}</td>
                <td style={{ padding: '0.6rem 0.75rem', color: '#475569' }}>{r.vertical}</td>
                <td style={{ padding: '0.6rem 0.75rem', color: '#475569', whiteSpace: 'nowrap' }}>
                  {r.serviceEndDate ? r.serviceEndDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                </td>
                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                  <span title={`${r.clientSince} paid year(s) on IndiaMart`} style={{ background: memberColor(r.clientSince).bg, color: memberColor(r.clientSince).fg, padding: '0.15rem 0.55rem', borderRadius: '999px', fontWeight: 700, fontSize: '0.78rem', cursor: 'help' }}>
                    {memberLabel(r.clientSince)}
                  </span>
                </td>
                <td style={{ padding: '0.6rem 0.75rem', color: r.mode === 'Multi Year' ? '#15803d' : '#475569', fontWeight: r.mode === 'Multi Year' ? 700 : 400 }}>{r.mode}</td>
                <td style={{ padding: '0.6rem 0.75rem', color: '#475569' }}>{r.secondLayer}</td>
                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                    <div style={{ width: '48px', height: '6px', borderRadius: '3px', background: '#f1f5f9', overflow: 'hidden' }}>
                      <div style={{ width: `${r.score}%`, height: '100%', background: r.riskColor, borderRadius: '3px' }} />
                    </div>
                    <span style={{ fontWeight: 700, color: r.riskColor, fontSize: '0.85rem' }}>{r.score}</span>
                  </div>
                </td>
                <td style={{ padding: '0.6rem 1.5rem 0.6rem 0.75rem', textAlign: 'center' }}>
                  <span style={{ background: r.riskColor + '22', color: r.riskColor, padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{r.riskLevel}</span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No records match the current filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const RISK_COLORS = { High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e' };
const BAR_CHURN = '#ef4444';
const BAR_RENEW = '#6366f1';

// ── tiny stat card ──────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div style={{
      background: 'var(--card-bg, #fff)',
      border: '1px solid var(--border, #e2e8f0)',
      borderLeft: `4px solid ${color}`,
      borderRadius: '12px',
      padding: '1.25rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted, #64748b)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
        {Icon && <Icon size={14} />} {label}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>{sub}</div>
    </div>
  );
}

// ── segment table ────────────────────────────────────────────────────────────
function SegmentTable({ rows, title }) {
  return (
    <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.5rem', fontWeight: 700, fontSize: '0.95rem', borderBottom: '1px solid var(--border, #e2e8f0)' }}>{title}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            <th style={{ padding: '0.6rem 1.5rem', textAlign: 'left', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Segment</th>
            <th style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>Total</th>
            <th style={{ padding: '0.6rem 1rem', textAlign: 'center', color: '#6366f1' }}>Renewed</th>
            <th style={{ padding: '0.6rem 1rem', textAlign: 'center', color: '#ef4444' }}>Pending</th>
            <th style={{ padding: '0.6rem 1.5rem', textAlign: 'center' }}>Churn Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.key} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
              <td style={{ padding: '0.7rem 1.5rem', fontWeight: 600 }}>{r.key}</td>
              <td style={{ padding: '0.7rem 1rem', textAlign: 'center' }}>{r.total}</td>
              <td style={{ padding: '0.7rem 1rem', textAlign: 'center', color: '#6366f1', fontWeight: 600 }}>{r.renewed}</td>
              <td style={{ padding: '0.7rem 1rem', textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>{r.churned}</td>
              <td style={{ padding: '0.7rem 1.5rem', textAlign: 'center' }}>
                <span style={{
                  background: r.churnRate >= 55 ? '#fee2e2' : r.churnRate >= 45 ? '#fef3c7' : '#dcfce7',
                  color: r.churnRate >= 55 ? '#b91c1c' : r.churnRate >= 45 ? '#92400e' : '#15803d',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '999px',
                  fontWeight: 700,
                  fontSize: '0.82rem'
                }}>{r.churnRate}%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── new seller scorer ────────────────────────────────────────────────────────
const FORM_DEFAULTS = { clientSince: 1, mode: 'Annual', secondLayer: 'Catalog', vertical: 'Field Support' };

function SellerScorer() {
  const [form, setForm] = useState(FORM_DEFAULTS);
  const [result, setResult] = useState(null);
  const [bulkText, setBulkText] = useState('');
  const [bulkResults, setBulkResults] = useState([]);
  const [tab, setTab] = useState('single');

  const score = () => setResult(getChurnScore(form));

  const scoreBulk = () => {
    const lines = bulkText.split('\n').filter(l => l.trim());
    const results = lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 4) return null;
      const [cs, mode, layer, vert] = parts;
      const seller = {
        clientSince: parseInt(cs, 10),
        mode, secondLayer: layer, vertical: vert
      };
      return { raw: line, seller, ...getChurnScore(seller) };
    }).filter(Boolean);
    setBulkResults(results.sort((a, b) => b.score - a.score));
  };

  const inputStyle = {
    width: '100%', padding: '0.6rem 0.9rem', borderRadius: '8px',
    border: '1px solid var(--border, #e2e8f0)', fontSize: '0.875rem',
    background: '#fff', color: 'var(--text-primary, #1e293b)', boxSizing: 'border-box'
  };
  const labelStyle = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted, #64748b)', marginBottom: '0.35rem', textTransform: 'uppercase' };
  const tabBtn = (t) => ({
    padding: '0.5rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
    fontSize: '0.85rem', border: 'none',
    background: tab === t ? '#6366f1' : '#f1f5f9',
    color: tab === t ? '#fff' : 'var(--text-muted, #64748b)'
  });

  return (
    <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '12px', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <Zap size={18} color="#6366f1" />
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>Score New / Unknown Sellers</span>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button style={tabBtn('single')} onClick={() => setTab('single')}>Single Seller</button>
        <button style={tabBtn('bulk')} onClick={() => setTab('bulk')}>Bulk CSV</button>
      </div>

      {tab === 'single' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>Member Since (Paid Years on IndiaMart)</label>
              <select style={inputStyle} value={form.clientSince} onChange={e => setForm(f => ({ ...f, clientSince: parseInt(e.target.value, 10) }))}>
                <option value={1}>1 Year</option>
                <option value={2}>2 Years</option>
                <option value={3}>3 Years</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Contract Plan</label>
              <select style={inputStyle} value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}>
                <option>Annual</option>
                <option>Multi Year</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Product Layer (Second Layer)</label>
              <select style={inputStyle} value={form.secondLayer} onChange={e => setForm(f => ({ ...f, secondLayer: e.target.value }))}>
                <option>Catalog</option>
                <option>Listing</option>
                <option>Export-TS</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Support Vertical</label>
              <select style={inputStyle} value={form.vertical} onChange={e => setForm(f => ({ ...f, vertical: e.target.value }))}>
                <option>Field Support</option>
                <option>Tele Support</option>
              </select>
            </div>
          </div>
          <button onClick={score} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.7rem 1.5rem', fontWeight: 700, cursor: 'pointer', width: '100%' }}>
            Calculate Churn Risk
          </button>

          {result && (
            <div style={{ marginTop: '1.25rem', padding: '1.25rem', borderRadius: '10px', border: `2px solid ${result.riskColor}`, background: `${result.riskColor}11` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: result.riskColor }}>{result.score}</div>
                <div>
                  <span style={{ background: result.riskColor, color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: 700, fontSize: '0.85rem' }}>{result.riskLevel} Risk</span>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', marginTop: '0.3rem' }}>Churn Probability Score (0–100)</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                {result.insights.map((ins, i) => (
                  <div key={i} style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem', background: '#fff', borderLeft: `3px solid ${result.riskColor}`, borderRadius: '4px' }}>• {ins}</div>
                ))}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0.7rem', background: '#fff', borderRadius: '8px', border: '1px solid var(--border, #e2e8f0)' }}>
                <span style={{ color: '#6366f1', marginRight: '0.5rem' }}>→ Recommended:</span>{result.action}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'bulk' && (
        <>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', marginBottom: '0.75rem' }}>
            One seller per line: <code>clientSince,Mode,SecondLayer,Vertical</code><br />
            Example: <code>1,Annual,Catalog,Tele Support</code>
          </p>
          <textarea
            style={{ ...inputStyle, height: '140px', resize: 'vertical', fontFamily: 'monospace' }}
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            placeholder={"1,Annual,Catalog,Field Support\n2,Multi Year,Listing,Tele Support\n3,Annual,Export-TS,Field Support"}
          />
          <button onClick={scoreBulk} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.7rem 1.5rem', fontWeight: 700, cursor: 'pointer', width: '100%', marginTop: '0.75rem' }}>
            Score All Sellers
          </button>
          {bulkResults.length > 0 && (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '320px', overflowY: 'auto' }}>
              {bulkResults.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.65rem 1rem', borderRadius: '8px', border: `1px solid ${r.riskColor}30`, background: `${r.riskColor}0d` }}>
                  <div style={{ fontWeight: 800, fontSize: '1.25rem', color: r.riskColor, minWidth: '3rem' }}>{r.score}</div>
                  <div style={{ flex: 1, fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-muted, #64748b)' }}>{r.raw}</div>
                  <span style={{ background: r.riskColor, color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{r.riskLevel}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function ChurnAnalysis() {
  const stats = useMemo(getOverallStats, []);
  const byClient = useMemo(getStatsByClientSince, []);
  const byVertical = useMemo(getStatsByVertical, []);
  const byMode = useMemo(getStatsByMode, []);
  const byLayer = useMemo(getStatsBySecondLayer, []);
  const crossTab = useMemo(getStatsCrossTab, []);

  // Chart data shapes
  const clientChart = byClient.map(r => ({ name: r.key, 'Churn %': r.churnRate, 'Renew %': r.renewalRate }));
  const verticalChart = byVertical.map(r => ({ name: r.key, 'Churn %': r.churnRate, 'Renew %': r.renewalRate }));
  const modeChart = byMode.map(r => ({ name: r.key, 'Churn %': r.churnRate, 'Renew %': r.renewalRate }));
  const layerChart = byLayer.map(r => ({ name: r.key, 'Churn %': r.churnRate, 'Renew %': r.renewalRate }));

  const sectionTitle = (txt) => (
    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary, #1e293b)' }}>{txt}</h3>
  );

  const chartCard = (title, data) => (
    <div style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--border,#e2e8f0)', borderRadius: '12px', padding: '1.25rem' }}>
      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem' }}>{title}</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
          <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px #0001' }} />
          <Legend iconSize={10} />
          <Bar dataKey="Churn %" fill={BAR_CHURN} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Renew %" fill={BAR_RENEW} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.25rem' }}>Churn Pattern Analysis</h2>
        <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem' }}>
          Based on <strong>500 real renewal records (Dec'25)</strong> — Mini Dynamic Catalog product.<br />
          <strong>Pending</strong> = subscriber did <em>not</em> renew (churned) &nbsp;·&nbsp; <strong>Received</strong> = renewed successfully.<br />
          <strong>Member Since</strong> = number of years as a paid IndiaMart subscriber.
        </p>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <StatCard label="Total Records" value={stats.total} sub="Dec'25 dataset" color="#6366f1" icon={Search} />
        <StatCard label="Renewed" value={stats.renewed} sub={`${stats.renewalRate}% renewal rate`} color="#22c55e" icon={CheckCircle} />
        <StatCard label="Pending (Churn)" value={stats.churned} sub={`${stats.churnRate}% churn rate`} color="#ef4444" icon={TrendingDown} />
        <StatCard label="Overall Risk" value={`${stats.churnRate}%`} sub="Baseline churn probability" color="#f59e0b" icon={AlertTriangle} />
      </div>

      {/* Charts row 1 */}
      <div>
        {sectionTitle('📊 Churn & Renewal Rates by Dimension')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
          {chartCard('By Paid Membership Tenure (Member Since)', clientChart)}
          {chartCard('By Support Vertical', verticalChart)}
          {chartCard('By Contract Mode', modeChart)}
          {chartCard('By Second Layer (Product)', layerChart)}
        </div>
      </div>

      {/* Segment tables */}
      <div>
        {sectionTitle('🔍 Segment Breakdown Tables')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
          <SegmentTable rows={byClient} title="By Member Since (Paid IndiaMart Years)" />
          <SegmentTable rows={byMode} title="By Contract Mode" />
          <SegmentTable rows={byVertical} title="By Support Vertical" />
          <SegmentTable rows={byLayer} title="By Second Layer" />
        </div>
      </div>

      {/* Cross-tab */}
      <div>
        {sectionTitle('🧩 Cross-Segment: Paid Membership Tenure × Contract Plan')}
        <SegmentTable rows={crossTab} title="Member Since × Plan — from real CSV data" />
      </div>

      {/* Pending GLID table */}
      <div>
        {sectionTitle('🔴 Pending Sellers — Full GLID List with Churn Risk')}
        <PendingGlidTable />
      </div>

      {/* New seller scorer */}
      <div>
        {sectionTitle('⚡ Score New Sellers — Predict Churn Risk')}
        <SellerScorer />
      </div>
    </div>
  );
}
