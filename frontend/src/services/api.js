// Único ponto de acesso à API. Todas as telas devem usar get/post/put/del daqui.
// - adiciona "Authorization: Bearer <token>" automaticamente
// - converte erros para ApiError { status, message (erro), campos }
// - ao receber 401 com token enviado, faz logout (o AuthContext registra o callback)

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const CHAVE_TOKEN = 'financas.token';

export const tokenStorage = {
  get: () => localStorage.getItem(CHAVE_TOKEN),
  set: (token) => localStorage.setItem(CHAVE_TOKEN, token),
  remove: () => localStorage.removeItem(CHAVE_TOKEN),
};

let aoNaoAutorizado = () => {};
export function definirAoNaoAutorizado(fn) {
  aoNaoAutorizado = fn;
}

export class ApiError extends Error {
  constructor(status, erro, campos = {}) {
    super(erro);
    this.status = status;
    this.campos = campos;
  }
}

async function requisicao(caminho, { method = 'GET', body, params } = {}) {
  const url = new URL(BASE_URL + caminho);
  for (const [chave, valor] of Object.entries(params ?? {})) {
    if (valor !== undefined && valor !== null && valor !== '') url.searchParams.set(chave, valor);
  }

  const token = tokenStorage.get();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let resposta;
  try {
    resposta = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor.');
  }

  if (resposta.status === 204) return null;
  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    // Token expirado/inválido: volta para o login sem mostrar erro.
    // (401 sem token, como senha errada no login, só vira mensagem na tela.)
    if (resposta.status === 401 && token) aoNaoAutorizado();
    throw new ApiError(resposta.status, dados?.erro ?? 'Erro inesperado.', dados?.campos ?? {});
  }
  return dados;
}

export const get = (caminho, params) => requisicao(caminho, { params });
export const post = (caminho, body) => requisicao(caminho, { method: 'POST', body });
export const put = (caminho, body) => requisicao(caminho, { method: 'PUT', body });
export const patch = (caminho, body) => requisicao(caminho, { method: 'PATCH', body });
export const del = (caminho, params) => requisicao(caminho, { method: 'DELETE', params });
