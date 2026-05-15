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

export const getEngagementTrend = (id) => {
  // Mock data for a 6-month trend
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return months.map((month, index) => ({
    name: month,
    engagement: 60 + Math.random() * 40 - (index > 3 ? Math.random() * 30 : 0) // Simulating decline
  }));
};
