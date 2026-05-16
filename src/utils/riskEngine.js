/**
 * AI-Driven Churn Prediction Engine
 * Adapted to handle both granular engagement data and CSV-based tenure/mode data.
 */

const FEATURE_WEIGHTS = {
  decline: 0.45,       
  tenure: 0.25,        
  sentiment: 0.15,     
  latency: 0.10,       
  usage: 0.05          
};

export const calculateRisk = (subscriber) => {
  // Extract data (handling both mock and real CSV formats)
  const { 
    engagement, 
    features, 
    clientSince, 
    mode, 
    status,
    gluser,
    vertical
  } = subscriber;

  // 1. Calculate Engagement Score (or use baseline if missing in CSV)
  let declineScore = 0;
  let avgDecline = 0;
  
  if (engagement) {
    const loginDecline = Math.max(0, (engagement.logins.historical - engagement.logins.current) / engagement.logins.historical);
    const leadDecline = Math.max(0, (engagement.leads.historical - engagement.leads.current) / engagement.leads.historical);
    const enquiryDecline = Math.max(0, (engagement.enquiries.historical - engagement.enquiries.current) / engagement.enquiries.historical);
    avgDecline = (loginDecline + leadDecline + enquiryDecline) / 3;
    declineScore = Math.min(100, avgDecline * 150);
  } else {
    // For real CSV records, "Pending" status indicates high risk
    declineScore = status === 'Pending' ? 70 : 10;
  }

  // 2. Calculate Tenure Score (1yr = high risk, 3yr = low)
  const tenureValue = clientSince || 1;
  const tenureScore = tenureValue === 1 ? 90 : (tenureValue === 2 ? 50 : 10);

  // 3. Normalized Risks
  const sentimentRisk = features?.sentimentScore ? (1 - features.sentimentScore) * 100 : 30;
  const latencyRisk = features?.responseTimeTrend === "Increasing" ? 80 : 20;
  const usageRisk = features?.usageDepth ? (100 - features.usageDepth) : 50;

  // 4. Weighted Churn Probability
  const churnProbability = (
    (declineScore * FEATURE_WEIGHTS.decline) +
    (tenureScore * FEATURE_WEIGHTS.tenure) +
    (sentimentRisk * FEATURE_WEIGHTS.sentiment) +
    (latencyRisk * FEATURE_WEIGHTS.latency) +
    (usageRisk * FEATURE_WEIGHTS.usage)
  );

  let riskLevel = "Low";
  if (churnProbability >= 60) riskLevel = "High";
  else if (churnProbability >= 35) riskLevel = "Medium";

  // Insights based on real CSV fields
  const insights = [];
  if (status === 'Pending') insights.push("Payment Pending");
  if (tenureValue === 1) insights.push("1st Yr Member Risk");
  if (mode === 'Annual') insights.push("Low Commitment (Annual)");
  if (vertical === 'Tele Support') insights.push("Tele-Support Segment");

  return {
    ...subscriber,
    id: gluser || subscriber.id,
    name: subscriber.name || `Seller ${gluser}`,
    riskLevel,
    riskScore: Math.round(churnProbability),
    avgDecline: Math.round(avgDecline * 100),
    aiInsights: insights,
    recommendedStrategy: churnProbability > 60 ? "Immediate AM Intervention" : "Standard Nudge",
    indicators: [
      { label: 'Tenure', decline: tenureScore },
      { label: 'Sentiment', score: features?.sentimentScore || 0.5 }
    ]
  };
};

export const processSubscribers = (subscribers) => {
  return subscribers.map(calculateRisk).sort((a, b) => b.riskScore - a.riskScore);
};
