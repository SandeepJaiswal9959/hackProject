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

    subscribers.push({
      id: `IM-${1000 + i}`,
      name: SUBSCRIBER_NAMES[i % SUBSCRIBER_NAMES.length],
      tier: "Platinum",
      renewalDate: renewalDate.toISOString().split('T')[0],
      engagement: {
        logins: { current: currentLogins, historical: histLogins },
        leads: { current: currentLeads, historical: histLeads },
        enquiries: { current: currentEnquiries, historical: histEnquiries },
      },
      accountManager: ["Rajesh Kumar", "Anjali Singh", "Suresh Iyer", "Priya Sharma"][i % 4]
    });
  }
  return subscribers;
};

// getEngagementTrend is kept for fallback but the dashboard now uses
// real trendData from the subscriber object (populated by process_data.py).
export const getEngagementTrend = (subscriber) => {
  if (subscriber?.trendData && subscriber.trendData.length > 0) {
    return subscriber.trendData;
  }
  // Fallback: flat mock trend when real data unavailable
  const months = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
  return months.map((month) => ({ name: month, engagement: 40 }));
};
