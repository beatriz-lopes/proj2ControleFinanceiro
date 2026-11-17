import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { withTransaction } from '../config/db.js';
import { BCRYPT_ROUNDS, JWT_EXPIRES_IN, JWT_SECRET } from '../config/auth.js';
import { authenticate } from '../middlewares/authenticate.js';
import { HttpError } from '../middlewares/errors.js';
import * as Users from '../models/users.model.js';
import { isValidCpf, isValidEmail, isValidPassword, normalizeCpf, normalizeEmail } from '../models/validation.js';

const router = Router();

const signToken = (user) => jwt.sign({ sub: String(user.id) }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

// UNIQUE constraint name (schema.sql) -> field and message for the front-end
const DUPLICATES = {
  users_email_unique: ['email', 'E-mail já cadastrado.'],
  users_cpf_unique: ['cpf', 'CPF já cadastrado.'],
};

// Login: at most 10 attempts per IP every 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({ error: 'Muitas tentativas de login. Tente novamente em alguns minutos.', fields: {} }),
});

// POST /api/auth/register  -> 201 | 400 | 409
router.post('/register', async (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const email = normalizeEmail(req.body?.email);
  const cpf = normalizeCpf(req.body?.cpf);
  const { password, passwordConfirmation } = req.body ?? {};

  const fields = {};
  if (!name) fields.name = 'Informe o nome.';
  else if (name.length > 120) fields.name = 'Nome deve ter no máximo 120 caracteres.';
  if (!email) fields.email = 'Informe o e-mail.';
  else if (!isValidEmail(email)) fields.email = 'E-mail inválido.';
  if (!cpf) fields.cpf = 'Informe o CPF.';
  else if (!isValidCpf(cpf)) fields.cpf = 'CPF inválido.';
  if (!password) fields.password = 'Informe a senha.';
  else if (!isValidPassword(password)) fields.password = 'A senha deve ter ao menos 8 caracteres, com letras e números.';
  if (password !== passwordConfirmation) fields.passwordConfirmation = 'As senhas não conferem.';
  if (Object.keys(fields).length) throw new HttpError(400, 'Dados inválidos.', fields);

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    // User + default categories/account: all or nothing
    const user = await withTransaction(async (client) => {
      const created = await Users.create({ name, email, cpf, passwordHash }, client);
      await Users.createDefaults(created.id, client);
      return created;
    });
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    // 23505 = unique_violation in PostgreSQL. The database is what guarantees uniqueness.
    const duplicate = err.code === '23505' && DUPLICATES[err.constraint];
    if (duplicate) {
      const [field, message] = duplicate;
      throw new HttpError(409, message, { [field]: message });
    }
    throw err;
  }
});

// Fixed hash used when the e-mail does not exist, so response time does not reveal it
const DUMMY_HASH = bcrypt.hashSync('password-that-does-not-exist-123', BCRYPT_ROUNDS);

// POST /api/auth/login  -> 200 | 400 | 401 | 429
router.post('/login', loginLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  const fields = {};
  if (!email) fields.email = 'Informe o e-mail.';
  if (!password) fields.password = 'Informe a senha.';
  if (Object.keys(fields).length) throw new HttpError(400, 'Dados inválidos.', fields);

  const user = await Users.findByEmailWithPassword(email);
  const passwordMatches = await bcrypt.compare(String(password), user?.password_hash ?? DUMMY_HASH);
  if (!user || !passwordMatches) {
    throw new HttpError(401, 'E-mail ou senha inválidos.'); // generic message on purpose
  }

  const { password_hash, ...publicUser } = user; // never return password_hash
  res.json({ token: signToken(publicUser), user: publicUser });
});

// GET /api/auth/me  -> 200 | 401
router.get('/me', authenticate, async (req, res) => {
  const user = await Users.findById(req.userId);
  if (!user) throw new HttpError(401, 'Usuário não encontrado.');
  res.json({ user });
});

export default router;
