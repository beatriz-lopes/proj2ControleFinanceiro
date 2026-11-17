if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Copy backend/.env.example to backend/.env.');
}

export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
export const BCRYPT_ROUNDS = 10;
