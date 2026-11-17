import { Navigate, Route, Routes } from 'react-router';
import Layout from './components/Layout.jsx';
import LoginPage from './components/LoginPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RegisterPage from './components/RegisterPage.jsx';
import UnderConstruction from './components/UnderConstruction.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<UnderConstruction title="Resumo do mês" />} />
          <Route path="transactions" element={<UnderConstruction title="Lançamentos" />} />
          <Route path="categories" element={<UnderConstruction title="Categorias" />} />
          <Route path="accounts" element={<UnderConstruction title="Fontes e destinos" />} />
          <Route path="reports" element={<UnderConstruction title="Relatórios" />} />
          <Route path="invoices" element={<UnderConstruction title="Faturas" />} />
          <Route path="financial-health" element={<UnderConstruction title="Saúde financeira" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
