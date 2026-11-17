// Same rules as backend/src/models/validation.js (client-side validation is complementary;
// the server-side validation is the one that counts).

export const normalizeCpf = (cpf) => String(cpf ?? '').replace(/\D/g, '');

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

export function isValidCpf(cpf) {
  const d = normalizeCpf(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const checkDigit = (n) => {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += Number(d[i]) * (n + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return checkDigit(9) === Number(d[9]) && checkDigit(10) === Number(d[10]);
}

export function isValidPassword(password) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

// '52998224725' -> '529.982.247-25' (applied while the user types)
export function maskCpf(value) {
  return normalizeCpf(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
