import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../contexts/AuthContext.jsx';

const LINKS = [
  ['/', 'Resumo'],
  ['/lancamentos', 'Lançamentos'],
  ['/categorias', 'Categorias'],
  ['/fontes-destinos', 'Fontes/Destinos'],
  ['/relatorios', 'Relatórios'],
  ['/faturas', 'Faturas'],
  ['/saude-financeira', 'Saúde financeira'],
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  return (
    <div className="app">
      <header className="topo">
        <strong>Controle Financeiro</strong>
        <nav>
          {LINKS.map(([para, texto]) => (
            <NavLink key={para} to={para} end={para === '/'}>
              {texto}
            </NavLink>
          ))}
        </nav>
        <div className="usuario">
          <span>{usuario.nome}</span>
          <button type="button" className="secundario" onClick={logout}>
            Sair
          </button>
        </div>
      </header>
      <main className="conteudo">
        <Outlet />
      </main>
    </div>
  );
}
