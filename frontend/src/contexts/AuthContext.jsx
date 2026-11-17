import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { get, post, setOnUnauthorized, tokenStorage } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => tokenStorage.get());
  const [user, setUser] = useState(null);
  // If a token is already saved, confirm it with /auth/me before allowing protected routes
  const [loading, setLoading] = useState(() => Boolean(tokenStorage.get()));

  const logout = useCallback(() => {
    tokenStorage.remove();
    setToken(null);
    setUser(null);
  }, []);

  // Any 401 from the API (expired token) logs out -> ProtectedRoute redirects to /login
  useEffect(() => setOnUnauthorized(logout), [logout]);

  useEffect(() => {
    if (!tokenStorage.get()) return;
    get('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [logout]);

  function signIn({ token, user }) {
    tokenStorage.set(token);
    setToken(token);
    setUser(user);
  }

  const login = async (email, password) => signIn(await post('/auth/login', { email, password }));
  const register = async (data) => signIn(await post('/auth/register', data));

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
