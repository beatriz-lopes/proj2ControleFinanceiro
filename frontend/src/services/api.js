// Single access point to the API. Every page must use get/post/put/patch/del from here.
// - adds "Authorization: Bearer <token>" automatically
// - turns error responses into ApiError { status, message, fields }
// - on a 401 for a request that carried a token, logs out (callback registered by AuthContext)

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const TOKEN_KEY = 'finance.token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  remove: () => localStorage.removeItem(TOKEN_KEY),
};

let onUnauthorized = () => {};
export function setOnUnauthorized(fn) {
  onUnauthorized = fn;
}

export class ApiError extends Error {
  constructor(status, message, fields = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function request(path, { method = 'GET', body, params } = {}) {
  const url = new URL(BASE_URL + path);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }

  const token = tokenStorage.get();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor.');
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // Expired/invalid token: go back to login without showing an error.
    // (A 401 without a token, like a wrong password on login, is just shown as a message.)
    if (response.status === 401 && token) onUnauthorized();
    throw new ApiError(response.status, data?.error ?? 'Erro inesperado.', data?.fields ?? {});
  }
  return data;
}

export const get = (path, params) => request(path, { params });
export const post = (path, body) => request(path, { method: 'POST', body });
export const put = (path, body) => request(path, { method: 'PUT', body });
export const patch = (path, body) => request(path, { method: 'PATCH', body });
export const del = (path, params) => request(path, { method: 'DELETE', params });
