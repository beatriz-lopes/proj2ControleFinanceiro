import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/auth.js';
import { HttpError } from './erros.js';

// Lê "Authorization: Bearer <token>", valida o JWT e grava o id do usuário em req.usuarioId.
// Todas as consultas das rotas protegidas devem filtrar por req.usuarioId (RF3) —
// nunca usar id de usuário vindo do corpo ou da URL.
export function autenticar(req, res, next) {
  const [esquema, token] = (req.headers.authorization ?? '').split(' ');
  if (esquema !== 'Bearer' || !token) {
    throw new HttpError(401, 'Token de autenticação ausente.');
  }
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET); // confere assinatura e expiração
  } catch {
    throw new HttpError(401, 'Token inválido ou expirado.');
  }
  req.usuarioId = Number(payload.sub);
  next();
}
