const MAX_SEARCH_LENGTH = 80;
const MAX_PAGE_LIMIT = 100;

const escapeRegex = (value) =>
  String(value || '')
    .trim()
    .slice(0, MAX_SEARCH_LENGTH)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildSafeRegex = (value) => {
  const escaped = escapeRegex(value);
  return escaped ? new RegExp(escaped, 'i') : null;
};

const parsePagination = ({ page = 1, limit = 20 } = {}) => {
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), MAX_PAGE_LIMIT);

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit,
  };
};

module.exports = { buildSafeRegex, parsePagination };
