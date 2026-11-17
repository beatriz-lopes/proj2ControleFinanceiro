import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext.jsx';

// Wraps the routes that require login. No user -> /login (remembering where they came from).
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="status">Carregando...</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
