// Mesmas regras de backend/src/models/validacao.js (validação no cliente é complementar;
// a validação que vale é a do servidor).

export const normalizarCpf = (cpf) => String(cpf ?? '').replace(/\D/g, '');

export function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

export function cpfValido(cpf) {
  const d = normalizarCpf(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (n) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

export function senhaValida(senha) {
  return senha.length >= 8 && /[A-Za-z]/.test(senha) && /\d/.test(senha);
}

// '52998224725' -> '529.982.247-25' (aplicada enquanto o usuário digita)
export function mascaraCpf(valor) {
  return normalizarCpf(valor)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
