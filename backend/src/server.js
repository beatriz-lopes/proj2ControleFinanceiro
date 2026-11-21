
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { handleErrors, notFound } from './middlewares/errors.js';

// Rotas da aplicação
import authRoutes from './routes/auth.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import accountsRoutes from './routes/accounts.routes.js';
import transactionsRoutes from './routes/transactions.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import financialHealthRoutes from './routes/financialHealth.routes.js';

const app = express();

// Configurações gerais do servidor
app.disable('x-powered-by');
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173'
}));
app.use(express.json({ limit: '100kb' }));

// Autenticação e gerenciamento de usuários
app.use('/api/auth', authRoutes);

// Categorias e movimentações financeiras
app.use('/api/categories', categoriesRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/transactions', transactionsRoutes);

// Relatórios financeiros e previsão de faturas
app.use('/api/reports', reportsRoutes);

// Indicadores, projeções e dicas de saúde financeira
app.use('/api/financial-health', financialHealthRoutes);

// Tratamento de rotas não encontradas e erros da API
app.use('/api', notFound);
app.use(handleErrors);

// Inicialização do servidor
const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}/api`);
});
