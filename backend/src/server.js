import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { rotaNaoEncontrada, tratarErros } from './middlewares/erros.js';

const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));

// Rotas da API
// (Pessoas 2 e 3: registrar aqui as rotas protegidas, ex.:
//   app.use('/api/categorias', autenticar, categoriasRoutes);)

app.use('/api', rotaNaoEncontrada);
app.use(tratarErros);

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}/api`);
});
