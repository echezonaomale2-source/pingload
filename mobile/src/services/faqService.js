import api from './api';

export const faqService = {
  getFaqs: () => api.get('/faq'),
};
