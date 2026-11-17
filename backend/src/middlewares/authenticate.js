import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/auth.js';
import { HttpError } from './errors.js';

// Reads "Authorization: Bearer <token>", verifies the JWT and stores the user id in req.userId.
// Every query in protected routes must filter by req.userId (RF3) —
// never use a user id coming from the body or the URL.
export function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'Token de autenticação ausente.');
  }
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET); // checks signature and expiration
  } catch {
    throw new HttpError(401, 'Token inválido ou expirado.');
  }
  req.userId = Number(payload.sub);
  next();
}
