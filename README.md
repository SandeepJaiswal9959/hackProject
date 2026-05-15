# IndiaMART Churn Early-Warning System

A premium dashboard designed to identify at-risk subscribers 90 days before renewal, enabling proactive retention interventions.

## 🚀 Key Features (Mapped to BRD)

- **BR-1 (Renewal Proximity)**: Automatically filters and flags subscribers within the 90-day renewal window.
- **BR-2 & BR-3 (Engagement Tracking)**: Monitors login activity, lead consumption, and enquiry interaction. Detects historical vs. current month declines.
- **BR-4 (Risk Categorization)**: Proprietary risk engine categorizes subscribers into **High**, **Medium**, and **Low** risk based on engagement delta and renewal urgency.
- **BR-5 (Insights Dashboard)**: High-fidelity visualization of at-risk accounts, renewal timelines, and churn indicators.
- **BR-6 (Proactive Alerts)**: Integrated "Notify Account Manager" feature to trigger immediate retention workflows.
- **BR-7 (Business Context)**: Provides specific reasons for risk (e.g., "50% drop in lead responses") and suggested actions.

## 🛠️ Technical Stack

- **Frontend**: React (Vite)
- **Styling**: Premium Vanilla CSS (Glassmorphism, IndiaMART Branding)
- **Visualization**: Recharts for engagement trends
- **Icons**: Lucide-React
- **Logic**: Custom lightweight Business Rule Engine

## 📈 Risk Engine Rules

1. **Urgency**: Points assigned based on days to renewal (<30, <60, <90).
2. **Engagement**: Points assigned based on % decline in platform usage.
3. **Priority**: Additional weighting for Platinum tier subscribers.

## 🚦 Getting Started

1. `npm install`
2. `npm run dev`
3. Open `http://localhost:5173`
