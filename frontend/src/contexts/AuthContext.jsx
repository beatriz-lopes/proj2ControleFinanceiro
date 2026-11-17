import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { definirAoNaoAutorizado, get, post, tokenStorage } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => tokenStorage.get());
  const [usuario, setUsuario] = useState(null);
  // Se já existe token salvo, confirma com /auth/me antes de liberar as rotas protegidas
  const [carregando, setCarregando] = useState(() => Boolean(tokenStorage.get()));

  const logout = useCallback(() => {
    tokenStorage.remove();
    setToken(null);
    setUsuario(null);
  }, []);

  // Qualquer 401 vindo da API (token expirado) faz logout -> RotaProtegida manda para /login
  useEffect(() => definirAoNaoAutorizado(logout), [logout]);

  useEffect(() => {
    if (!tokenStorage.get()) return;
    get('/auth/me')
      .then((dados) => setUsuario(dados.usuario))
      .catch(() => logout())
      .finally(() => setCarregando(false));
  }, [logout]);

  function entrar({ token, usuario }) {
    tokenStorage.set(token);
    setToken(token);
    setUsuario(usuario);
  }

  const login = async (email, senha) => entrar(await post('/auth/login', { email, senha }));
  const cadastrar = async (dados) => entrar(await post('/auth/cadastro', dados));

  return (
    <AuthContext.Provider value={{ usuario, token, carregando, login, logout, cadastrar }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
