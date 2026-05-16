import React, { useState, useEffect } from 'react';
import { generateSubscribers, getEngagementTrend } from './utils/dataGenerator';
import { processSubscribers } from './utils/riskEngine';
import { getAllRecords } from './utils/churnAnalyzer';
import AIEvaluator from './components/EvaluationPanel';
import ChurnAnalysis from './components/ChurnAnalysis';
import { 
  Users, AlertTriangle, TrendingDown, Clock, 
  Search, Filter, Bell, LayoutDashboard,
  ChevronRight, ArrowDownRight, ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [subscribers, setSubscribers] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Priority: Real CSV Data (Pending users first)
    const realData = getAllRecords();
    const processed = processSubscribers(realData);
    
    // We'll show the top 50 at-risk sellers by default
    setSubscribers(processed.slice(0, 50));
    setSelectedSub(processed[0]);
    setLoading(false);
  }, []);

  const stats = {
    total: subscribers.length,
    highRisk: subscribers.filter(s => s.riskLevel === 'High').length,
    mediumRisk: subscribers.filter(s => s.riskLevel === 'Medium').length,
    renewalsSoon: subscribers.filter(s => s.daysToRenewal < 30).length
  };

  if (loading) return <div className="loading">Loading IndiaMART Insights...</div>;

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-dot"></div>
          ChurnWatch <span>PRO</span>
        </div>
        
        <nav>
          <a href="#" className={`nav-item${activeTab === 'dashboard' ? ' active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={20} /> Dashboard
          </a>
          <a href="#" className={`nav-item${activeTab === 'churn' ? ' active' : ''}`} onClick={() => setActiveTab('churn')}>
            <TrendingDown size={20} /> Churn Analysis
          </a>
          <a href="#" className="nav-item">
            <Users size={20} /> Subscribers
          </a>
          <a href="#" className="nav-item">
            <AlertTriangle size={20} /> Risk Alerts
          </a>
        </nav>

        <div style={{ marginTop: 'auto' }}>
            <div className="nav-item">
                <Bell size={20} /> Notifications
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div>
            <h1>Churn Early-Warning System</h1>
            <p>Identifying at-risk premium subscribers 90 days before renewal.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="badge badge-low" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="logo-dot" style={{ background: 'var(--risk-low)' }}></div>
                System Active
            </div>
          </div>
        </header>

        {activeTab === 'churn' && <ChurnAnalysis />}

        {activeTab === 'dashboard' && <>
        {/* Stats Grid */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Total At-Risk (90d)</div>
            <div className="kpi-value">{stats.total}</div>
            <div className="kpi-trend">
                <Users size={12} /> Premium Accounts
            </div>
          </div>
          <div className="kpi-card" style={{ borderLeft: '4px solid var(--risk-high)' }}>
            <div className="kpi-label">High Risk</div>
            <div className="kpi-value" style={{ color: 'var(--risk-high)' }}>{stats.highRisk}</div>
            <div className="kpi-trend" style={{ color: 'var(--risk-high)' }}>
                <ArrowUpRight size={12} /> Urgent Intervention
            </div>
          </div>
          <div className="kpi-card" style={{ borderLeft: '4px solid var(--risk-medium)' }}>
            <div className="kpi-label">Medium Risk</div>
            <div className="kpi-value" style={{ color: 'var(--risk-medium)' }}>{stats.mediumRisk}</div>
            <div className="kpi-trend" style={{ color: 'var(--risk-medium)' }}>
                <Clock size={12} /> Monitor Closely
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Renewals (Next 30d)</div>
            <div className="kpi-value">{stats.renewalsSoon}</div>
            <div className="kpi-trend" style={{ color: 'var(--primary)' }}>
                <AlertTriangle size={12} /> Critical Window
            </div>
          </div>
        </div>

        <div className="grid-2-col">
          {/* Subscriber Table */}
          <section>
            <div className="table-container fade-in">
                <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>At-Risk Subscribers</h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Search size={18} color="var(--text-muted)" />
                        <Filter size={18} color="var(--text-muted)" />
                    </div>
                </div>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Subscriber</th>
                    <th>Risk</th>
                    <th>Renewal</th>
                    <th>Risk Reason</th>
                    <th>Decline</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map(sub => (
                    <tr 
                        key={sub.id} 
                        onClick={() => setSelectedSub(sub)}
                        style={{ cursor: 'pointer', background: selectedSub?.id === sub.id ? '#f8fafc' : 'transparent' }}
                    >
                      <td>
                        <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>{sub.gluser || sub.id}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub.vertical} • {sub.clientSince}yr Member</div>
                      </td>
                      <td>
                        <span className={`badge badge-${sub.riskLevel.toLowerCase()}`}>
                          {sub.riskLevel} ({sub.riskScore}%)
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.875rem' }}>{sub.renewalDate}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>In {sub.daysToRenewal} days</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '200px', lineHeight: '1.2' }}>
                          {sub.aiInsights && sub.aiInsights.length > 0 ? sub.aiInsights[0] : 'Stable performance'}
                        </div>
                      </td>
                      <td style={{ color: sub.avgDecline > 30 ? 'var(--risk-high)' : 'inherit' }}>
                        {sub.avgDecline}%
                      </td>
                      <td><ChevronRight size={16} color="var(--text-muted)" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Details & Trends */}
          <aside>
            {selectedSub && (
              <div className="fade-in">
                <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Engagement Trend</h3>
                  <div style={{ height: '200px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getEngagementTrend(selectedSub.id, selectedSub.churned)}>
                        <defs>
                          <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                        <YAxis hide />
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area type="monotone" dataKey="engagement" stroke="var(--primary)" fillOpacity={1} fill="url(#colorEng)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="chart-card">
                  <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Key Indicators</h3>
                  {selectedSub.indicators.map(ind => (
                    <div key={ind.label} className="indicator-row">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span>{ind.label}</span>
                        <span style={{ fontWeight: 600, color: ind.decline > 30 ? 'var(--risk-high)' : 'var(--text-secondary)' }}>
                            {ind.decline}% Decline
                        </span>
                      </div>
                      <div className="indicator-bar-bg">
                        <div 
                          className={`indicator-bar-fill ${ind.decline > 30 ? 'risk' : ''}`} 
                          style={{ width: `${100 - ind.decline}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                  
                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>AI Reasoning</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {selectedSub.aiInsights.map((insight, idx) => (
                        <div key={idx} style={{ fontSize: '0.8rem', padding: '0.5rem', background: '#fef2f2', borderLeft: '3px solid #ef4444', color: '#991b1b', borderRadius: '4px' }}>
                          • {insight}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--primary-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Sparkles size={14} /> AI Recommended Strategy
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '1rem', fontWeight: 500 }}>
                        {selectedSub.recommendedStrategy}
                    </div>
                    <button 
                        onClick={() => alert(`Strategic intervention initiated for ${selectedSub.name}`)}
                        style={{ 
                            width: '100%', 
                            padding: '0.75rem', 
                            background: 'var(--primary)', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        Execute Strategy
                    </button>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* AI-Powered Solution Evaluator */}
        <AIEvaluator />
        </>}
      </main>
    </div>
  );
}

export default App;
