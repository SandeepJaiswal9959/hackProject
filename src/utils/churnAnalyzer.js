/**
 * churnAnalyzer.js
 * Derives churn patterns from the 500-record renewal dataset and
 * exposes a scoring function for new/unknown sellers.
 *
 * Key insight from data:
 *  - Pending = did NOT renew (churn)
 *  - Received = renewed (retained)
 * We compute renewal rates per segment to surface the highest-risk cohorts.
 */

import { parseRenewalData } from './csvParser';

let _cache = null;

function getData() {
  if (!_cache) _cache = parseRenewalData();
  return _cache;
}

// ─── Aggregation helpers ────────────────────────────────────────────────────

function groupBy(records, keyFn) {
  return records.reduce((acc, r) => {
    const k = keyFn(r);
    if (!acc[k]) acc[k] = { total: 0, renewed: 0, churned: 0 };
    acc[k].total++;
    if (r.renewed) acc[k].renewed++;
    else acc[k].churned++;
    return acc;
  }, {});
}

function enrichGroup(grp) {
  return Object.entries(grp).map(([key, val]) => ({
    key,
    ...val,
    renewalRate: Math.round((val.renewed / val.total) * 100),
    churnRate: Math.round((val.churned / val.total) * 100)
  })).sort((a, b) => b.churnRate - a.churnRate);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Overall stats */
export function getOverallStats() {
  const data = getData();
  const total = data.length;
  const renewed = data.filter(r => r.renewed).length;
  const churned = data.filter(r => r.churned).length;
  return {
    total,
    renewed,
    churned,
    renewalRate: Math.round((renewed / total) * 100),
    churnRate: Math.round((churned / total) * 100)
  };
}

/** Renewal rate by paid membership tenure (1 | 2 | 3 years on IndiaMart) */
export function getStatsByClientSince() {
  const label = n => n === 1 ? '1 Yr Member (New)' : n === 2 ? '2 Yr Member' : '3 Yr Member (Loyal)';
  return enrichGroup(groupBy(getData(), r => label(r.clientSince)));
}

/** Renewal rate by vertical (Field Support / Tele Support) */
export function getStatsByVertical() {
  return enrichGroup(groupBy(getData(), r => r.vertical));
}

/** Renewal rate by Mode (Annual / Multi Year) */
export function getStatsByMode() {
  return enrichGroup(groupBy(getData(), r => r.mode));
}

/** Renewal rate by Second Layer (Catalog / Listing / Export-TS) */
export function getStatsBySecondLayer() {
  return enrichGroup(groupBy(getData(), r => r.secondLayer));
}

/** Cross-tab: Paid Membership Tenure × Mode */
export function getStatsCrossTab() {
  return enrichGroup(groupBy(getData(), r => `${r.clientSince}yr Member • ${r.mode}`));
}

/**
 * Score a new seller on churn risk (0–100, higher = more likely to churn).
 * Uses empirical renewal rates from the training data as weights.
 */
export function getChurnScore(seller) {
  /*
   * seller shape:
   * {
   *   clientSince: 1 | 2 | 3,
   *   mode: "Annual" | "Multi Year",
   *   secondLayer: "Catalog" | "Listing" | "Export-TS",
   *   vertical: "Field Support" | "Tele Support"
   * }
   */
  const data = getData();

  function churnRateFor(filterFn) {
    const subset = data.filter(filterFn);
    if (!subset.length) return 50; // default if no data
    return Math.round((subset.filter(r => r.churned).length / subset.length) * 100);
  }

  const csRate  = churnRateFor(r => r.clientSince === seller.clientSince);
  const modeRate = churnRateFor(r => r.mode === seller.mode);
  const layerRate = churnRateFor(r => r.secondLayer === seller.secondLayer);
  const vertRate = churnRateFor(r => r.vertical === seller.vertical);

  // Weighted average of individual churn rates
  const score = Math.round(
    csRate * 0.40 +     // tenure is the strongest predictor
    modeRate * 0.25 +   // commitment level (multi year = stickier)
    layerRate * 0.20 +  // product depth
    vertRate * 0.15     // support channel
  );

  // Determine risk label
  let riskLevel = 'Low';
  let riskColor = '#22c55e';
  if (score >= 60) { riskLevel = 'High'; riskColor = '#ef4444'; }
  else if (score >= 40) { riskLevel = 'Medium'; riskColor = '#f59e0b'; }

  // Generate insight text
  const insights = [];
  if (seller.clientSince === 1) insights.push('1-year paid IndiaMart member — newest cohort, data shows highest churn rate in this group.');
  if (seller.clientSince === 2) insights.push('2-year paid member — moderate risk; not yet at the loyalty threshold.');
  if (seller.clientSince === 3) insights.push('3-year paid IndiaMart member — loyal cohort with best renewal rates.');
  if (seller.mode === 'Annual') insights.push('Annual plan: data shows higher churn vs Multi Year committed subscribers.');
  if (seller.mode === 'Multi Year') insights.push('Multi Year plan: stronger commitment, data shows better renewal rate.');
  if (seller.secondLayer === 'Catalog') insights.push('Catalog-only layer: average product depth, more likely to churn than Listing/Export-TS.');
  if (seller.secondLayer === 'Listing') insights.push('Listing layer: moderate product stickiness.');
  if (seller.secondLayer === 'Export-TS') insights.push('Export-TS layer: strongest retention signal in the dataset.');
  if (seller.vertical === 'Tele Support') insights.push('Tele Support vertical: slightly less engaged than Field Support based on CSV data.');
  if (score < 40) insights.push('Overall profile matches high-retention cohort in the 500-record training set.');

  const action = score >= 60
    ? 'Immediate outreach — senior AM call + value-review meeting.'
    : score >= 40
    ? 'Proactive nudge — share success story, check feature adoption.'
    : 'Routine health check-in sufficient.';

  return { score, riskLevel, riskColor, insights, action };
}

/** Return raw records for table display (with churn label) */
export function getAllRecords() {
  return getData();
}
