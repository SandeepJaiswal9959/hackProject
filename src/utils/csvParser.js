/**
 * csvParser.js
 * Parses the embedded renewal CSV data and returns structured records.
 * Status "Pending" → churned (did not renew)
 * Status "Received" → renewed successfully
 */

import rawCsv from '../assets/data/Renewal Data to Use - 500 Records - Sheet1.csv?raw';

/**
 * Parse a date string like "14-Dec-25" into a JS Date.
 */
function parseDate(str) {
  if (!str) return null;
  const [day, mon, yr] = str.trim().split('-');
  return new Date(`${mon} ${day} 20${yr}`);
}

/**
 * Parse the CSV and return an array of record objects.
 */
export function parseRenewalData() {
  const lines = rawCsv.split('\n').map(l => l.trim()).filter(Boolean);
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 9) continue;

    const [month, product, gluser, status, vertical, endDate, clientSince, mode, secondLayer] = cols.map(c => c.trim());

    const numericGluser = parseInt(gluser, 10);
    const numericClientSince = parseInt(clientSince, 10);

    records.push({
      month,
      product,
      gluser: numericGluser,
      status,                          // "Pending" | "Received"
      churned: status === 'Pending',   // true = did NOT renew (churn)
      renewed: status === 'Received',  // true = renewed
      vertical: vertical?.trim(),      // "Field Support" | "Tele Support"
      serviceEndDate: parseDate(endDate),
      clientSince: numericClientSince, // 1 | 2 | 3
      mode: mode?.trim(),              // "Annual" | "Multi Year"
      secondLayer: secondLayer?.trim() // "Catalog" | "Listing" | "Export-TS"
    });
  }

  return records;
}
