import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { handleErrors, notFound } from './middlewares/errors.js';
import authRoutes from './routes/auth.routes.js';
import categoriaRoutes from './routes/categorias.routes.js'

const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));

// Public routes: register and login. /api/auth/me uses authenticate internally.
app.use('/api/auth', authRoutes);
app.use('/api/categorias', categoriaRoutes);

// Protected routes (Persons 2 and 3): register them with the authenticate middleware, e.g.:
//   import { authenticate } from './middlewares/authenticate.js';
//   app.use('/api/categories', authenticate, categoriesRoutes);

app.use('/api', notFound);
app.use(handleErrors);

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}/api`);
});
