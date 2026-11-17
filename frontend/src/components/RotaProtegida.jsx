import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext.jsx';

// Envolve as rotas que exigem login. Sem usuário -> /login (guardando a página de origem).
export default function RotaProtegida() {
  const { usuario, carregando } = useAuth();
  const location = useLocation();

  if (carregando) return <p className="estado">Carregando...</p>;
  if (!usuario) return <Navigate to="/login" replace state={{ de: location.pathname }} />;
  return <Outlet />;
}
