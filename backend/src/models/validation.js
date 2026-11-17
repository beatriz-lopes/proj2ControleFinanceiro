// Pure validation/normalization functions (no database access).
// Equivalent copy in the front-end: frontend/src/services/validation.js

export const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();
export const normalizeCpf = (cpf) => String(cpf ?? '').replace(/\D/g, '');

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 160;
}

// Checks both CPF check digits. Accepts input with or without punctuation.
// isValidCpf('529.982.247-25') === true ; isValidCpf('529.982.247-24') === false
export function isValidCpf(cpf) {
  const d = normalizeCpf(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false; // rejects 000.000.000-00, 111..., etc.
  const checkDigit = (n) => {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += Number(d[i]) * (n + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return checkDigit(9) === Number(d[9]) && checkDigit(10) === Number(d[10]);
}

// At least 8 characters, with at least one letter and one number.
export function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}
