const VALIDITY_CATEGORIES = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'social',
  'night',
  'sme',
  'corporate',
  'broadband',
  'weekend',
  'special',
  'other',
];

const VALIDITY_ORDER = {
  daily: 1,
  weekly: 2,
  monthly: 3,
  yearly: 4,
  social: 5,
  night: 6,
  sme: 7,
  corporate: 8,
  broadband: 9,
  weekend: 10,
  special: 11,
  other: 12,
};

const CATEGORY_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
  social: 'Social',
  night: 'Night',
  sme: 'SME',
  corporate: 'Corporate',
  broadband: 'Broadband',
  weekend: 'Weekend',
  special: 'Special',
  other: 'Other',
};

/**
 * Classify a plan using name + validity text (VTpass metadata).
 * Product-type keywords take priority over duration keywords.
 */
const inferValidityCategory = (validityText = '', planName = '') => {
  const text = `${planName} ${validityText}`.toLowerCase();
  if (!text.trim()) return 'other';

  if (/\b(sme|s\.m\.e|gifting)\b/.test(text)) return 'sme';
  if (/\b(corporate|coop|enterprise|business)\b/.test(text)) return 'corporate';
  if (/\b(social|facebook|whatsapp|instagram|tiktok|youtube|xtra\s*talk|xtratalk)\b/.test(text)) return 'social';
  if (/\b(night|overnight|mid\s*night|midnight)\b/.test(text)) return 'night';
  if (/\b(weekend|sat|sun)\b/.test(text)) return 'weekend';
  if (/\b(broadband|fibre|fiber|hotspot|router)\b/.test(text)) return 'broadband';
  if (/\b(special|promo|bonus|happy\s*hour)\b/.test(text)) return 'special';

  if (/\b(day|daily|24\s*h|24hr|24\s*hour|1\s*day|2\s*day|3\s*day)\b/.test(text)) return 'daily';
  if (/\b(week|weekly|7\s*day|14\s*day)\b/.test(text)) return 'weekly';
  if (/\b(year|yearly|365|12\s*month|annual)\b/.test(text)) return 'yearly';
  if (/\b(month|monthly|30\s*day|60\s*day|90\s*day)\b/.test(text)) return 'monthly';

  return 'other';
};

const groupByValidityCategory = (plans, getValidity = (p) => p.validity) => {
  const groups = {};
  for (const plan of plans) {
    const stored = plan.validityCategory;
    const inferred = inferValidityCategory(getValidity(plan), plan.name || plan.dataSize || '');
    // Prefer stored only when it is a real category (not sticky "other" from sync defaults).
    const category = (stored && stored !== 'other') ? stored : inferred;
    if (!groups[category]) groups[category] = [];
    groups[category].push({ ...plan, validityCategory: category });
  }

  return VALIDITY_CATEGORIES
    .filter((cat) => groups[cat]?.length)
    .map((category) => ({
      category,
      label: CATEGORY_LABELS[category] || (category.charAt(0).toUpperCase() + category.slice(1)),
      order: VALIDITY_ORDER[category],
      plans: groups[category].sort((a, b) => (a.order || 0) - (b.order || 0) || (a.amount || 0) - (b.amount || 0)),
    }));
};

module.exports = {
  VALIDITY_CATEGORIES,
  VALIDITY_ORDER,
  CATEGORY_LABELS,
  inferValidityCategory,
  groupByValidityCategory,
};
