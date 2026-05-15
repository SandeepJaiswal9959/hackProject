export const calculateRisk = (subscriber) => {
  const { engagement, renewalDate } = subscriber;
  const today = new Date();
  const renewal = new Date(renewalDate);
  const daysToRenewal = Math.ceil((renewal - today) / (1000 * 60 * 60 * 24));

  // Calculate average decline across indicators
  const loginDecline = (engagement.logins.historical - engagement.logins.current) / engagement.logins.historical;
  const leadDecline = (engagement.leads.historical - engagement.leads.current) / engagement.leads.historical;
  const enquiryDecline = (engagement.enquiries.historical - engagement.enquiries.current) / engagement.enquiries.historical;

  const avgDecline = (loginDecline + leadDecline + enquiryDecline) / 3;

  let riskLevel = "Low";
  let score = 0;

  // Rule 1: Renewal Proximity
  if (daysToRenewal < 30) score += 40;
  else if (daysToRenewal < 60) score += 25;
  else if (daysToRenewal <= 90) score += 10;

  // Rule 2: Engagement Decline
  if (avgDecline > 0.5) score += 50;
  else if (avgDecline > 0.3) score += 30;
  else if (avgDecline > 0.1) score += 10;

  // Rule 3: Tier weight (Platinum users are higher priority/risk value)
  if (subscriber.tier === "Platinum") score += 10;

  // Categorization
  if (score >= 70) riskLevel = "High";
  else if (score >= 40) riskLevel = "Medium";
  else riskLevel = "Low";

  return {
    ...subscriber,
    riskLevel,
    riskScore: score,
    daysToRenewal,
    avgDecline: Math.round(avgDecline * 100),
    indicators: [
        { label: 'Logins', decline: Math.round(loginDecline * 100) },
        { label: 'Leads', decline: Math.round(leadDecline * 100) },
        { label: 'Enquiries', decline: Math.round(enquiryDecline * 100) }
    ]
  };
};

export const processSubscribers = (subscribers) => {
  return subscribers.map(calculateRisk).sort((a, b) => b.riskScore - a.riskScore);
};
