import { get } from './api.js';

export function getCategoryReport(start, end) {
  return get('/reports/categories', {
    start,
    end
  });
}

export function getAccountReport(start, end) {
  return get('/reports/accounts', {
    start,
    end
  });
}

export function getInvoiceForecast(months = 3) {
  return get('/reports/invoices', { months });
}