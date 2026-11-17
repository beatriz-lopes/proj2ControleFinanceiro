import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../contexts/AuthContext.jsx';

const LINKS = [
  ['/', 'Resumo'],
  ['/transactions', 'Lançamentos'],
  ['/categories', 'Categorias'],
  ['/accounts', 'Fontes/Destinos'],
  ['/reports', 'Relatórios'],
  ['/invoices', 'Faturas'],
  ['/financial-health', 'Saúde financeira'],
];

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="app">
      <header className="topbar">
        <strong>Controle Financeiro</strong>
        <nav>
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="user">
          <span>{user.name}</span>
          <button type="button" className="secondary" onClick={logout}>
            Sair
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
