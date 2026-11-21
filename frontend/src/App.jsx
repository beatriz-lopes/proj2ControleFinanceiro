
import { Navigate, Route, Routes } from 'react-router';

import Layout from './components/Layout.jsx';
import LoginPage from './components/LoginPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RegisterPage from './components/RegisterPage.jsx';
import UnderConstruction from './components/UnderConstruction.jsx';

import CategoriesPage from './components/CategoriesPage.jsx';
import TransactionsPage from './components/TransactionsPage.jsx';
import AccountsPage from './components/AccountsPage.jsx';

import ReportsPage from './components/ReportsPage.jsx';
import InvoicesPage from './components/InvoicesPage.jsx';
import FinancialHealthPage from './components/FinancialHealthPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>

          <Route index element={<UnderConstruction title="Resumo do mês" />}/>
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="categories" element={<CategoriesPage />}/>
          <Route path="accounts" element={<AccountsPage />}/>

          <Route path="reports" element={<ReportsPage />}/>

          <Route path="invoices" element={<InvoicesPage />} />

          <Route path="financial-health" element={<FinancialHealthPage />}/>

        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />}/>
    </Routes>
  );
}
