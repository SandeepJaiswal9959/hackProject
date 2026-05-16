# Execution Document
## Churn Early-Warning System for Premium Subscribers

---

# Document Details

| Field | Details |
|---|---|
| Project Name | Churn Early-Warning System |
| Organization | IndiaMART |
| Version | 1.0 |
| Date | 15 May 2026 |
| Prepared By | Senior Product Manager |

---

# 1. Objective

The objective of this initiative is to identify premium subscribers who are likely to churn approximately 90 days before their subscription renewal date by detecting significant drops in engagement and platform usage.

The system will help business teams proactively intervene and improve customer retention and renewal rates.

---

# 2. Problem Statement

Premium subscribers often reduce their activity gradually before non-renewal. Currently, such disengagement is identified too late, limiting the ability of sales and customer success teams to take corrective actions.

The proposed solution aims to build an early-warning mechanism that:

- Detects engagement decline
- Predicts churn probability
- Categorizes customers by risk level
- Enables proactive retention efforts

---

# 3. Business Goals

## Primary Goals

- Reduce premium subscriber churn
- Improve renewal conversion rate
- Identify high-risk subscribers 90 days before renewal
- Enable proactive customer engagement

## Secondary Goals

- Improve seller engagement
- Increase retention-driven revenue
- Provide visibility into churn trends
- Prioritize retention efforts efficiently

---

# 4. Proposed Solution Overview

The system will collect customer engagement data, analyze historical usage behavior, and predict churn probability using machine learning models.

The output will be displayed through dashboards and alerts for account managers and business teams.

---

# 5. High-Level Workflow

```text
Premium Subscriber Data
        ↓
Engagement Metrics Collection
        ↓
Feature Engineering
        ↓
ML Model Prediction
(Logistic Regression / Random Forest / XGBoost)
        ↓
Churn Risk Classification
        ↓
Dashboard + Alerts
        ↓
Retention Actions
```

---

# 6. Data Inputs Required

## Subscription Data

- Subscriber ID
- Plan type
- Subscription value
- Renewal date
- Account manager details

## Engagement Data

- Login frequency
- Last active date
- Session duration
- Leads viewed
- Leads responded
- Response rate
- Catalogue updates
- Product uploads
- Search activity

## Communication Data

- WhatsApp engagement
- Email engagement
- CRM interaction history

---

# 7. Feature Engineering

The following features will be derived from raw activity data:

| Feature | Description |
|---|---|
| Login Drop % | Reduction in login activity |
| Lead Response Drop % | Decline in enquiry responses |
| Days Since Last Login | Inactivity duration |
| Session Trend | Engagement duration trend |
| Lead Consumption Trend | Lead activity decline |
| Engagement Consistency | Stability of platform usage |

---

# 8. Machine Learning Models

## 8.1 Logistic Regression

Purpose:
- Baseline churn prediction model
- Probability-based risk scoring
- High explainability

Advantages:
- Easy to interpret
- Fast implementation
- Suitable for MVP

Expected Output:
- Churn probability score
- Risk classification

---

## 8.2 Random Forest

Purpose:
- Improve prediction accuracy
- Capture non-linear behavior patterns

Advantages:
- Robust prediction capability
- Handles multiple engagement signals
- Provides feature importance

Expected Output:
- Churn probability
- Important churn-driving features

---

## 8.3 XGBoost

Purpose:
- Advanced churn prediction
- Higher prediction accuracy

Advantages:
- Strong performance on structured data
- Handles complex engagement patterns
- Scalable for production systems

Expected Output:
- High-confidence churn prediction
- Top contributing churn indicators

---

# 9. Risk Classification Logic

| Churn Probability | Risk Category |
|---|---|
| 0% – 30% | Low Risk |
| 31% – 70% | Medium Risk |
| 71% – 100% | High Risk |

---

# 10. APIs Required

## Subscription APIs

- Get Premium Subscribers API
- Get Upcoming Renewals API
- Subscription Details API

## Engagement APIs

- Login Activity API
- Lead Consumption API
- Lead Response API
- Seller Engagement API

## Churn APIs

- Churn Analyze API
- Bulk Churn Evaluation API

## Dashboard APIs

- Churn Dashboard API
- Risk Detail API

## Notification APIs

- CRM Alert API
- WhatsApp Notification API
- Email Notification API

---

# 11. Dashboard Requirements

The dashboard should display:

- High-risk subscribers
- Renewal timeline
- Churn probability
- Usage trend summary
- Engagement decline indicators
- Retention action status

---

# 12. Alerts & Notifications

The system should notify account managers when:

- A customer enters High Risk category
- Significant engagement drop is detected
- No recent platform activity is observed

Notification channels may include:

- CRM alerts
- Email notifications
- WhatsApp notifications

---

# 13. Execution Phases

## Phase 1 – Data Collection

Activities:
- Identify required data sources
- Integrate engagement APIs
- Validate data quality

Deliverables:
- Unified engagement dataset

---

## Phase 2 – Feature Engineering

Activities:
- Create behavioral metrics
- Generate churn indicators
- Prepare training dataset

Deliverables:
- Model-ready feature dataset

---

## Phase 3 – Model Development

Activities:
- Train Logistic Regression model
- Train Random Forest model
- Train XGBoost model
- Compare model performance

Deliverables:
- Best-performing churn model

---

## Phase 4 – Dashboard & Alerts

Activities:
- Build churn dashboard
- Integrate notification workflows
- Enable business visibility

Deliverables:
- Churn monitoring interface
- Alerting workflows

---

## Phase 5 – Pilot Rollout

Activities:
- Test with limited premium subscribers
- Monitor prediction quality
- Gather business feedback

Deliverables:
- Pilot validation report

---

# 14. Success Metrics

| Metric | Expected Outcome |
|---|---|
| Premium Renewal Rate | Increase |
| Churn Rate | Reduction |
| Retained High-Risk Users | Increase |
| Engagement Recovery | Improvement |
| Business Adoption | High dashboard usage |

---

# 15. Risks

| Risk | Impact |
|---|---|
| Poor data quality | Incorrect churn prediction |
| Excessive alerts | Reduced business adoption |
| Incomplete engagement tracking | Missed churn signals |
| Delayed interventions | Lower retention effectiveness |

---

# 16. Assumptions & Constraints

## Assumptions

- Engagement data is available across systems
- Historical renewal data exists
- Business teams will act on churn alerts

## Constraints

- Initial version should remain lightweight
- Existing workflows should not be heavily modified
- Solution focuses only on premium subscribers initially

---

# 17. Expected Business Impact

The proposed solution is expected to:

- Improve premium customer retention
- Increase renewal revenue
- Enable proactive customer success operations
- Improve visibility into customer health trends
- Reduce preventable subscription churn

---

# 18. Conclusion

The Churn Early-Warning System will enable IndiaMART to proactively identify and retain premium subscribers before disengagement leads to non-renewal.

By combining engagement analytics, machine learning models, dashboards, and business alerts, the organization can shift from reactive churn management to proactive customer retention.

