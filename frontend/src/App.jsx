import { Navigate, Route, Routes } from 'react-router';
import CadastroPage from './components/CadastroPage.jsx';
import EmConstrucao from './components/EmConstrucao.jsx';
import Layout from './components/Layout.jsx';
import LoginPage from './components/LoginPage.jsx';
import RotaProtegida from './components/RotaProtegida.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<CadastroPage />} />

      <Route element={<RotaProtegida />}>
        <Route element={<Layout />}>
          <Route index element={<EmConstrucao titulo="Resumo do mês" />} />
          <Route path="lancamentos" element={<EmConstrucao titulo="Lançamentos" />} />
          <Route path="categorias" element={<EmConstrucao titulo="Categorias" />} />
          <Route path="fontes-destinos" element={<EmConstrucao titulo="Fontes e destinos" />} />
          <Route path="relatorios" element={<EmConstrucao titulo="Relatórios" />} />
          <Route path="faturas" element={<EmConstrucao titulo="Faturas" />} />
          <Route path="saude-financeira" element={<EmConstrucao titulo="Saúde financeira" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
