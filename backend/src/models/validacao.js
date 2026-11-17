// Funções puras de validação/normalização (sem acesso ao banco).
// Cópia equivalente no front-end: frontend/src/services/validacao.js

export const normalizarEmail = (email) => String(email ?? '').trim().toLowerCase();
export const normalizarCpf = (cpf) => String(cpf ?? '').replace(/\D/g, '');

export function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 160;
}

// Confere os dois dígitos verificadores. Aceita com ou sem pontuação.
// cpfValido('529.982.247-25') === true ; cpfValido('529.982.247-24') === false
export function cpfValido(cpf) {
  const d = normalizarCpf(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false; // rejeita 000.000.000-00, 111..., etc.
  const digito = (n) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

// Mínimo 8 caracteres, com pelo menos uma letra e um número.
export function senhaValida(senha) {
  return typeof senha === 'string' && senha.length >= 8 && /[A-Za-z]/.test(senha) && /\d/.test(senha);
}
