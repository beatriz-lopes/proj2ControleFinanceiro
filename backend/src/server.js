import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { rotaNaoEncontrada, tratarErros } from './middlewares/erros.js';
import authRoutes from './routes/auth.routes.js';

const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));

// Rotas públicas: cadastro e login. /api/auth/me já usa autenticar internamente.
app.use('/api/auth', authRoutes);

// Rotas protegidas (Pessoas 2 e 3): registrar com o middleware autenticar, ex.:
//   import { autenticar } from './middlewares/autenticar.js';
//   app.use('/api/categorias', autenticar, categoriasRoutes);

app.use('/api', rotaNaoEncontrada);
app.use(tratarErros);

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}/api`);
});
