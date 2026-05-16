const SUBSCRIBER_NAMES = [
  "Global Exports Ltd", "Precision Engineering", "Royal Textiles", "Apex Logistics", 
  "Sunrise Agro", "Nexus Tech Solutions", "Heritage Crafts", "Blue Chip Metals", 
  "Green Valley Organics", "Infinite Designs", "Vanguard Industries", "Zenith Pharma",
  "Pioneer Tools", "Crystal Glassware", "Sterling Silver", "Modern Furnishings",
  "Alpha Electronics", "Omega Chemical", "Titan Steel", "Nova Software"
];

export const generateSubscribers = (count = 20) => {
  const subscribers = [];
  const today = new Date();

  for (let i = 0; i < count; i++) {
    // Renewal date within next 90 days
    const renewalDate = new Date();
    renewalDate.setDate(today.getDate() + Math.floor(Math.random() * 95));

    // Historical activity (average monthly)
    const histLogins = 20 + Math.floor(Math.random() * 30);
    const histLeads = 50 + Math.floor(Math.random() * 100);
    const histEnquiries = 30 + Math.floor(Math.random() * 50);

    // Current month activity (can be lower to simulate risk)
    const riskFactor = Math.random() > 0.6 ? 0.3 + Math.random() * 0.4 : 0.8 + Math.random() * 0.4;
    
    const currentLogins = Math.floor(histLogins * riskFactor);
    const currentLeads = Math.floor(histLeads * riskFactor);
    const currentEnquiries = Math.floor(histEnquiries * riskFactor);

    // AI-ready features
    const responseTimeTrend = riskFactor < 0.5 ? "Increasing" : (Math.random() > 0.5 ? "Stable" : "Decreasing");
    const lastLoginDaysAgo = riskFactor < 0.4 ? Math.floor(Math.random() * 20) + 10 : Math.floor(Math.random() * 5);
    const sentimentScore = riskFactor < 0.5 ? (Math.random() * 0.4).toFixed(2) : (0.6 + Math.random() * 0.4).toFixed(2);

    subscribers.push({
      id: `IM-${1000 + i}`,
      name: SUBSCRIBER_NAMES[i % SUBSCRIBER_NAMES.length],
      tier: i % 5 === 0 ? "Diamond" : (i % 3 === 0 ? "Platinum" : "Gold"),
      renewalDate: renewalDate.toISOString().split('T')[0],
      engagement: {
        logins: { current: currentLogins, historical: histLogins },
        leads: { current: currentLeads, historical: histLeads },
        enquiries: { current: currentEnquiries, historical: histEnquiries },
      },
      features: {
        responseTimeTrend,
        lastLoginDaysAgo,
        sentimentScore: parseFloat(sentimentScore),
        usageDepth: Math.floor(Math.random() * 100) // % of features used
      },
      accountManager: ["Rajesh Kumar", "Anjali Singh", "Suresh Iyer", "Priya Sharma"][i % 4]
    });
  }
  return subscribers;
};

export const getEngagementTrend = (id, isChurned) => {
  const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let base = isChurned ? 40 : 80;
  
  return months.map((month, index) => {
    // If churned, simulate a steady decline
    const drift = isChurned ? (index * -8) : (Math.random() * 10 - 5);
    return {
      name: month,
      engagement: Math.max(10, Math.min(100, base + drift + (Math.random() * 10)))
    };
  });
};
