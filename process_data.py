import pandas as pd
import json
import random
from datetime import datetime, timedelta

def process_excel(file_path):
    # Read the excel file
    df = pd.read_excel(file_path)
    
    # Standardize column names
    df.columns = [c.strip() for c in df.columns]
    
    subscribers = []
    
    for _, row in df.iterrows():
        glid = str(row.get('GLUSER', ''))
        company_name = row.get('Company Name', 'Unknown Corp')
        client_since = row.get('Client Since', '0')
        renewal_date_str = str(row.get('Service End-Date', '2026-12-31'))
        tier = "Platinum" if row.get('WS/MDC Main') == 'Mini Dynamic Catalog.' else "Gold"
        
        # Parse renewal date
        try:
            renewal_date = pd.to_datetime(renewal_date_str)
        except:
            renewal_date = datetime.now() + timedelta(days=90)
            
        # Simulate API Data (Scorecard)
        # In a real scenario, this would be a fetch from the API
        scorecard = {
            "pns_calls_recd": random.randint(50, 500),
            "pns_calls_ans": random.randint(30, 450),
            "bl_cons": random.randint(100, 1000),
            "total_enq": random.randint(200, 2000),
            "cqs": random.randint(60, 95),
            "avg_ratings": round(random.uniform(3.5, 5.0), 1)
        }
        
        # Simulate API Data (Summary Trends)
        # Using the logic from the execution plan: 7d vs 30d vs 90d
        summary = {
            "lms_active_days": {"7d": random.randint(1, 7), "30d": random.randint(5, 25), "90d": random.randint(20, 80)},
            "tot_enq": {"7d": random.randint(10, 100), "30d": random.randint(50, 400), "90d": random.randint(200, 1200)},
            "bl_all_cons": {"7d": random.randint(5, 50), "30d": random.randint(30, 200), "90d": random.randint(100, 600)}
        }
        
        # Calculate Drops (Feature Engineering)
        # Normalizing 7d and 30d to 30d equivalents for comparison with 90d avg
        lms_30d_avg_from_90d = summary['lms_active_days']['90d'] / 3
        lms_current = summary['lms_active_days']['30d']
        login_drop = round(max(0, (lms_30d_avg_from_90d - lms_current) / lms_30d_avg_from_90d * 100), 2) if lms_30d_avg_from_90d > 0 else 0
        
        enq_30d_avg_from_90d = summary['tot_enq']['90d'] / 3
        enq_current = summary['tot_enq']['30d']
        enq_drop = round(max(0, (enq_30d_avg_from_90d - enq_current) / enq_30d_avg_from_90d * 100), 2) if enq_30d_avg_from_90d > 0 else 0

        bl_30d_avg_from_90d = summary['bl_all_cons']['90d'] / 3
        bl_current = summary['bl_all_cons']['30d']
        bl_drop = round(max(0, (bl_30d_avg_from_90d - bl_current) / bl_30d_avg_from_90d * 100), 2) if bl_30d_avg_from_90d > 0 else 0

        # Create the subscriber object for the frontend
        subscribers.append({
            "id": glid,
            "name": company_name,
            "tier": tier,
            "renewalDate": renewal_date.strftime('%Y-%m-%d'),
            "accountManager": row.get('Vertical Final', 'Account Manager'),
            "engagement": {
                "logins": {"historical": round(lms_30d_avg_from_90d, 1), "current": lms_current},
                "leads": {"historical": round(bl_30d_avg_from_90d, 1), "current": bl_current},
                "enquiries": {"historical": round(enq_30d_avg_from_90d, 1), "current": enq_current}
            },
            "scorecard": scorecard,
            "trends": summary
        })
        
    return subscribers

if __name__ == "__main__":
    data = process_excel('Renewal Data to Use - 500 Records.xlsx')
    with open('public/subscribers_data.json', 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Processed {len(data)} subscribers.")
