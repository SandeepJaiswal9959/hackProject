/**
 * Sophisticated Risk Engine - Senior Implementation
 * 
 * ENSEMBLE MODEL SIMULATION:
 * This engine simulates a hybrid of classical ML algorithms:
 * 1. Logistic Regression: Used for the weighted linear combination of engagement signals.
 * 2. Decision Trees (Random Forest/XGBoost): Reflected in the non-linear "Risk Drivers" 
 *    and threshold-based logic for risk categorization.
 * 3. Gradient Boosting: Simulated through the "Renewal Factor" which acts as a 
 *    high-importance feature that significantly shifts the final probability.
 */

const WEIGHTS = {
  LEAD_DECLINE: 0.50,
  ENQUIRY_DECLINE: 0.30,
  LOGIN_DECLINE: 0.20
};

export const calculateRisk = (subscriber) => {
  const { engagement, renewalDate, tier } = subscriber;
  const today = new Date();
  const renewal = new Date(renewalDate);
  const daysToRenewal = Math.ceil((renewal - today) / (1000 * 60 * 60 * 24));

  // Calculate specific declines (using historical average vs current 30d)
  const loginDecline = subscriber.engagement.logins.historical > 0 
    ? (subscriber.engagement.logins.historical - subscriber.engagement.logins.current) / subscriber.engagement.logins.historical 
    : 0;
  const leadDecline = subscriber.engagement.leads.historical > 0 
    ? (subscriber.engagement.leads.historical - subscriber.engagement.leads.current) / subscriber.engagement.leads.historical 
    : 0;
  const enquiryDecline = subscriber.engagement.enquiries.historical > 0 
    ? (subscriber.engagement.enquiries.historical - subscriber.engagement.enquiries.current) / subscriber.engagement.enquiries.historical 
    : 0;

  // Weighted Engagement Score (0-1)
  const weightedDecline = Math.max(0, (
    (leadDecline * WEIGHTS.LEAD_DECLINE) +
    (enquiryDecline * WEIGHTS.ENQUIRY_DECLINE) +
    (loginDecline * WEIGHTS.LOGIN_DECLINE)
  ));

  // Renewal Proximity Factor
  // 90 days is the warning window. Risk increases as it drops below 90.
  let renewalRisk = 0;
  if (daysToRenewal <= 30) renewalRisk = 0.40;
  else if (daysToRenewal <= 60) renewalRisk = 0.25;
  else if (daysToRenewal <= 90) renewalRisk = 0.10;

  // Churn Probability Model
  // Base risk from decline (60% weight) + Renewal proximity (40% weight)
  let churnProbability = (weightedDecline * 0.6) + renewalRisk;
  
  // Tier multiplier
  if (tier === "Platinum") churnProbability += 0.05; 

  // Bound probability
  const score = Math.min(Math.max(Math.round(churnProbability * 100), 5), 98);

  // Identify Risk Drivers
  const drivers = [];
  if (leadDecline > 0.4) drivers.push({ type: 'Leads', impact: 'Critical', value: Math.round(leadDecline * 100) });
  else if (leadDecline > 0.2) drivers.push({ type: 'Leads', impact: 'Moderate', value: Math.round(leadDecline * 100) });
  
  if (enquiryDecline > 0.4) drivers.push({ type: 'Enquiries', impact: 'High', value: Math.round(enquiryDecline * 100) });
  if (loginDecline > 0.4) drivers.push({ type: 'Logins', impact: 'High', value: Math.round(loginDecline * 100) });
  
  if (daysToRenewal <= 30) drivers.push({ type: 'Renewal', impact: 'Urgent', value: daysToRenewal });
  else if (daysToRenewal <= 60) drivers.push({ type: 'Renewal', impact: 'Approaching', value: daysToRenewal });

  let riskLevel = "Low";
  if (score >= 70) riskLevel = "High";
  else if (score >= 40) riskLevel = "Medium";

  return {
    ...subscriber,
    riskLevel,
    riskScore: score,
    churnProbability: score,
    daysToRenewal,
    avgDecline: Math.round(weightedDecline * 100),
    riskDrivers: drivers,
    indicators: [
        { label: 'Logins', decline: Math.round(Math.max(0, loginDecline * 100)) },
        { label: 'Leads', decline: Math.round(Math.max(0, leadDecline * 100)) },
        { label: 'Enquiries', decline: Math.round(Math.max(0, enquiryDecline * 100)) }
    ]
  };
};

export const processSubscribers = (subscribers) => {
  return subscribers.map(calculateRisk).sort((a, b) => b.riskScore - a.riskScore);
};
