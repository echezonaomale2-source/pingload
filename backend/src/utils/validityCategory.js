const VALIDITY_CATEGORIES = ['daily', 'weekly', 'monthly', 'yearly', 'other'];

const VALIDITY_ORDER = {
  daily: 1,
  weekly: 2,
  monthly: 3,
  yearly: 4,
  other: 5,
};

const inferValidityCategory = (validityText = '') => {
  const text = String(validityText).toLowerCase();
  if (!text) return 'other';
  if (/\b(day|daily|24\s*h|24hr|24\s*hour)\b/.test(text)) return 'daily';
  if (/\b(week|weekly|7\s*day)\b/.test(text)) return 'weekly';
  if (/\b(year|yearly|365|12\s*month|annual)\b/.test(text)) return 'yearly';
  if (/\b(month|monthly|30\s*day|90\s*day)\b/.test(text)) return 'monthly';
  return 'other';
};

const groupByValidityCategory = (plans, getValidity = (p) => p.validity) => {
  const groups = {};
  for (const plan of plans) {
    const category = plan.validityCategory || inferValidityCategory(getValidity(plan));
    if (!groups[category]) groups[category] = [];
    groups[category].push({ ...plan, validityCategory: category });
  }

  return VALIDITY_CATEGORIES
    .filter((cat) => groups[cat]?.length)
    .map((category) => ({
      category,
      label: category.charAt(0).toUpperCase() + category.slice(1),
      order: VALIDITY_ORDER[category],
      plans: groups[category].sort((a, b) => (a.order || 0) - (b.order || 0) || (a.amount || 0) - (b.amount || 0)),
    }));
};

module.exports = {
  VALIDITY_CATEGORIES,
  VALIDITY_ORDER,
  inferValidityCategory,
  groupByValidityCategory,
};
