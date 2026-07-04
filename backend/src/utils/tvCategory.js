const TV_CATEGORY_ORDER = { entry: 1, standard: 2, premium: 3, other: 4 };

const groupTvPlans = (plans) => {
  const groups = {};
  for (const plan of plans) {
    const category = plan.category || 'standard';
    if (!groups[category]) groups[category] = [];
    groups[category].push(plan);
  }
  return Object.keys(groups)
    .sort((a, b) => (TV_CATEGORY_ORDER[a] || 99) - (TV_CATEGORY_ORDER[b] || 99))
    .map((category) => ({
      category,
      label: category.charAt(0).toUpperCase() + category.slice(1),
      plans: groups[category].sort((a, b) => (a.order || 0) - (b.order || 0) || a.amount - b.amount),
    }));
};

module.exports = { groupTvPlans, TV_CATEGORY_ORDER };
