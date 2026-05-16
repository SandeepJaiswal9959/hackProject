import { useState, useEffect } from 'react';
import { getEngagementTrend } from './utils/dataGenerator';
import AIEvaluator from './components/EvaluationPanel';
import GlidAnalyzer from './components/GlidAnalyzer';
import {
  Users, AlertTriangle, TrendingDown, Clock,
  Search, Bell, LayoutDashboard,
  ChevronRight, ArrowUpRight,
  RefreshCw, Sparkles
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [subscribers, setSubscribers] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/subscribers_data.json');
        const rawData = await response.json();
        // The data is already processed by the ML script, so we just set it
        setSubscribers(rawData);
        setSelectedSub(rawData[0]);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredSubscribers = subscribers.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(searchTerm.toLowerCase()) || sub.id.includes(searchTerm);
    const matchesFilter = filterRisk === 'All' || sub.riskLevel === filterRisk;
    return matchesSearch && matchesFilter;
  });

  const generateAIStrategy = async (subscriber) => {
    if (!apiKey) {
      alert("Please enter a Gemini API Key in the Evaluation Panel first!");
      return;
    }
    setInsightLoading(true);
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `
        As a senior retention strategist at IndiaMART, analyze this premium subscriber's risk:
        Name: ${subscriber.name}
        Tier: ${subscriber.tier}
        Risk Score: ${subscriber.riskScore}%
        Days to Renewal: ${subscriber.daysToRenewal}
        
        Engagement Decline:
        - Logins: ${subscriber.indicators[0].decline}%
        - Leads: ${subscriber.indicators[1].decline}%
        - Enquiries: ${subscriber.indicators[2].decline}%
        
        Provide:
        1. A 1-sentence behavioral summary.
        2. A 2-step actionable retention strategy for their Account Manager.
        Keep it professional and data-driven.
      `;

      const result = await model.generateContent(prompt);
      setAiInsights(result.response.text());
    } catch (error) {
      console.error("AI Insight error:", error);
      setAiInsights("Failed to generate AI insights. Check API key.");
    } finally {
      setInsightLoading(false);
    }
  };

  useEffect(() => {
    setAiInsights(null); // Reset insights when subscriber changes
  }, [selectedSub]);

  const stats = {
    total: subscribers.length,
    highRisk: subscribers.filter(s => s.riskLevel === 'High').length,
    mediumRisk: subscribers.filter(s => s.riskLevel === 'Medium').length,
    avgChurnProb: Math.round(subscribers.reduce((acc, s) => acc + s.churnProbability, 0) / (subscribers.length || 1))
  };

  if (loading) return (
    <div className="loading-screen">
        <div className="ai-spinner"></div>
        <p>Analyzing IndiaMART Engagement Data...</p>
    </div>
  );

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-dot"></div>
          ChurnWatch <span>PRO</span>
        </div>
        
        <nav>
          <a href="#" className="nav-item active">
            <LayoutDashboard size={20} /> Dashboard
          </a>
          <a href="#" className="nav-item">
            <Users size={20} /> Subscribers
          </a>
          <a href="#" className="nav-item">
            <AlertTriangle size={20} /> Risk Alerts
          </a>
          <a href="#" className="nav-item">
            <TrendingDown size={20} /> Trends
          </a>
        </nav>

        <div style={{ marginTop: 'auto', padding: '1rem', background: 'var(--primary-light)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>System Status</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <div className="logo-dot" style={{ background: 'var(--risk-low)', width: 6, height: 6 }}></div>
                Real-time Sync Active
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
          <div className="user-profile">
            <div className="notification-bell">
                <Bell size={20} />
                <span className="bell-dot"></span>
            </div>
            <div className="avatar">AD</div>
          </div>
        </header>

        {/* Stats Grid */}
        <motion.div 
          className="kpi-grid"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, staggerChildren: 0.1 }}
        >
          <motion.div className="kpi-card" whileHover={{ y: -5 }}>
            <div className="kpi-label">Total Premium Accounts</div>
            <div className="kpi-value">{stats.total}</div>
            <div className="kpi-trend">
                <Users size={12} /> Active Subscriptions
            </div>
          </motion.div>
          <motion.div className="kpi-card risk-high-border" whileHover={{ y: -5 }}>
            <div className="kpi-label">High Risk (Critical)</div>
            <div className="kpi-value text-high">{stats.highRisk}</div>
            <div className="kpi-trend text-high">
                <ArrowUpRight size={12} /> Needs Immediate Action
            </div>
          </motion.div>
          <motion.div className="kpi-card risk-medium-border" whileHover={{ y: -5 }}>
            <div className="kpi-label">Medium Risk (Warning)</div>
            <div className="kpi-value text-medium">{stats.mediumRisk}</div>
            <div className="kpi-trend text-medium">
                <Clock size={12} /> Monitor Activity
            </div>
          </motion.div>
          <motion.div className="kpi-card" whileHover={{ y: -5 }}>
            <div className="kpi-label">Avg. Churn Probability</div>
            <div className="kpi-value">{stats.avgChurnProb}%</div>
            <div className="kpi-trend text-primary">
                <TrendingDown size={12} /> Portfolio Health
            </div>
          </motion.div>
        </motion.div>

        <div className="grid-2-col">
          {/* Subscriber Table */}
          <section>
            <div className="table-container fade-in">
                <div className="table-header">
                    <h3 className="section-title">Risk Priority List</h3>
                    <div className="table-actions">
                        <div className="search-box">
                            <Search size={16} />
                            <input 
                                type="text" 
                                placeholder="Search by name or ID..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select 
                            className="filter-select"
                            value={filterRisk}
                            onChange={(e) => setFilterRisk(e.target.value)}
                        >
                            <option value="All">All Risk Levels</option>
                            <option value="High">High Risk</option>
                            <option value="Medium">Medium Risk</option>
                            <option value="Low">Low Risk</option>
                        </select>
                    </div>
                </div>
              <div className="table-wrapper">
                <table className="custom-table">
                    <thead>
                    <tr>
                        <th>Subscriber</th>
                        <th>Risk Level</th>
                        <th>Churn Prob.</th>
                        <th>Renewal</th>
                        <th></th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredSubscribers.slice(0, 50).map((sub, index) => (
                        <motion.tr 
                            key={sub.id} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: (index % 10) * 0.05 }}
                            onClick={() => setSelectedSub(sub)}
                            className={selectedSub?.id === sub.id ? 'selected-row' : ''}
                        >
                        <td>
                            <div className="sub-name">{sub.name}</div>
                            <div className="sub-meta">{sub.id} • {sub.tier.replace('.', '')}</div>
                        </td>
                        <td>
                            <span className={`badge badge-${sub.riskLevel.toLowerCase()}`}>
                            {sub.riskLevel}
                            </span>
                        </td>
                        <td>
                            <div className={`prob-value ${sub.churnProbability > 70 ? 'text-high' : ''}`}>
                                {sub.churnProbability}%
                            </div>
                        </td>
                        <td>
                            <div className="renewal-date">{sub.renewalDate}</div>
                            <div className="renewal-days">{sub.daysToRenewal}d remaining</div>
                        </td>
                        <td><ChevronRight size={16} color="var(--text-muted)" /></td>
                        </motion.tr>
                    ))}
                    </tbody>
                </table>
              </div>
              {filteredSubscribers.length > 50 && (
                  <div className="table-footer">
                      Showing top 50 of {filteredSubscribers.length} matches
                  </div>
              )}
            </div>
          </section>

          {/* Details & Trends */}
          <aside className="details-panel">
            <AnimatePresence mode="wait">
            {selectedSub && (
              <motion.div 
                key={selectedSub.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="details-container"
              >
                <div className="chart-card glass">
                  <h3 className="card-title">Engagement Velocity</h3>
                  <div style={{ height: '180px', width: '100%', marginTop: '1rem' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getEngagementTrend(selectedSub)}>
                        <defs>
                          <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: 'var(--text-muted)'}} />
                        <YAxis hide />
                        <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area type="monotone" dataKey="engagement" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorEng)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="chart-card glass mt-1">
                  <div className="card-header">
                    <h3 className="card-title">Risk Analysis</h3>
                    <div className="badge badge-low">Explainable AI</div>
                  </div>

                  <div className="risk-drivers-section">
                    <div className="small-label">Primary Risk Factors</div>
                    <div className="drivers-grid">
                      {selectedSub.riskDrivers.map(driver => (
                        <div key={driver.type} className="driver-tag">
                          <span className="driver-type">{driver.type}</span>
                          <span className={`driver-impact ${driver.impact === 'Critical' || driver.impact === 'Urgent' ? 'text-high' : ''}`}>
                            {driver.impact} {driver.type === 'Renewal' ? `(${driver.value}d)` : `(${driver.value}%)`}
                          </span>
                        </div>
                      ))}
                      {selectedSub.riskDrivers.length === 0 && <div className="no-drivers">No significant risk drivers detected.</div>}
                    </div>
                  </div>

                  <h3 className="card-title mt-2">ML Ensemble Confidence</h3>
                  <div className="ml-scores-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '1rem' }}>
                    <div className="ml-score-item" style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Log. Reg</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>{selectedSub.ml_scores?.logistic_regression}%</div>
                    </div>
                    <div className="ml-score-item" style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Random Forest</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>{selectedSub.ml_scores?.random_forest}%</div>
                    </div>
                    <div className="ml-score-item" style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>XGBoost</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>{selectedSub.ml_scores?.xgboost}%</div>
                    </div>
                  </div>

                  <h3 className="card-title mt-2">Activity Signals</h3>
                  <div className="signals-list">
                    {selectedSub.indicators.map(ind => (
                        <div key={ind.label} className="indicator-row">
                        <div className="indicator-info">
                            <span>{ind.label}</span>
                            <span className={ind.decline > 30 ? 'text-high font-bold' : 'text-secondary'}>
                                {ind.decline}% Decline
                            </span>
                        </div>
                        <div className="indicator-bar-bg">
                            <div 
                            className={`indicator-bar-fill ${ind.decline > 30 ? 'risk' : ''}`} 
                            style={{ width: `${Math.max(10, 100 - ind.decline)}%` }}
                            ></div>
                        </div>
                        </div>
                    ))}
                  </div>
                  
                  <div className="retention-box">
                    <div className="retention-label">Retention Action Plan</div>
                    <div className="retention-desc">
                        Current Account Manager: <strong>{selectedSub.accountManager}</strong>
                    </div>
                    
                    <div className="action-buttons">
                        <button 
                            className="ai-action-btn"
                            onClick={() => generateAIStrategy(selectedSub)}
                            disabled={insightLoading}
                        >
                            {insightLoading ? <RefreshCw size={16} className="spin" /> : <Sparkles size={16} />}
                            {insightLoading ? 'Generating Strategy...' : 'AI Retention Strategy'}
                        </button>

                        <button 
                            className="notify-btn"
                            onClick={() => alert(`Critical alert sent to ${selectedSub.accountManager} for ${selectedSub.name}`)}
                        >
                            <Bell size={16} /> Notify Manager
                        </button>
                    </div>

                    {aiInsights && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="ai-insights-result"
                      >
                        <div className="ai-result-header">AI Strategist Recommendation</div>
                        {aiInsights}
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </aside>
        </div>

        {/* AI-Powered Solution Evaluator */}
        <GlidAnalyzer />
        <AIEvaluator onApiKeyChange={setApiKey} />
      </main>
    </div>
  );
}

export default App;
