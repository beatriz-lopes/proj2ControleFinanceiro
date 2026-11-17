import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { transacao } from '../config/db.js';
import { BCRYPT_ROUNDS, JWT_EXPIRES_IN, JWT_SECRET } from '../config/auth.js';
import { autenticar } from '../middlewares/autenticar.js';
import { HttpError } from '../middlewares/erros.js';
import * as Usuarios from '../models/usuarios.model.js';
import { cpfValido, emailValido, normalizarCpf, normalizarEmail, senhaValida } from '../models/validacao.js';

const router = Router();

const gerarToken = (usuario) =>
  jwt.sign({ sub: String(usuario.id) }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

// Nome da constraint UNIQUE (schema.sql) -> campo e mensagem para o front-end
const DUPLICADOS = {
  usuarios_email_unico: ['email', 'E-mail já cadastrado.'],
  usuarios_cpf_unico: ['cpf', 'CPF já cadastrado.'],
};

// Login: no máximo 10 tentativas por IP a cada 15 minutos
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({ erro: 'Muitas tentativas de login. Tente novamente em alguns minutos.', campos: {} }),
});

// POST /api/auth/cadastro  -> 201 | 400 | 409
router.post('/cadastro', async (req, res) => {
  const nome = String(req.body?.nome ?? '').trim();
  const email = normalizarEmail(req.body?.email);
  const cpf = normalizarCpf(req.body?.cpf);
  const { senha, confirmacaoSenha } = req.body ?? {};

  const campos = {};
  if (!nome) campos.nome = 'Informe o nome.';
  else if (nome.length > 120) campos.nome = 'Nome deve ter no máximo 120 caracteres.';
  if (!email) campos.email = 'Informe o e-mail.';
  else if (!emailValido(email)) campos.email = 'E-mail inválido.';
  if (!cpf) campos.cpf = 'Informe o CPF.';
  else if (!cpfValido(cpf)) campos.cpf = 'CPF inválido.';
  if (!senha) campos.senha = 'Informe a senha.';
  else if (!senhaValida(senha)) campos.senha = 'A senha deve ter ao menos 8 caracteres, com letras e números.';
  if (senha !== confirmacaoSenha) campos.confirmacaoSenha = 'As senhas não conferem.';
  if (Object.keys(campos).length) throw new HttpError(400, 'Dados inválidos.', campos);

  const senhaHash = await bcrypt.hash(senha, BCRYPT_ROUNDS);
  try {
    // Usuário + categorias/fonte padrão: tudo ou nada
    const usuario = await transacao(async (client) => {
      const novo = await Usuarios.criar({ nome, email, cpf, senhaHash }, client);
      await Usuarios.criarDadosPadrao(novo.id, client);
      return novo;
    });
    res.status(201).json({ token: gerarToken(usuario), usuario });
  } catch (err) {
    // 23505 = unique_violation no PostgreSQL. O banco é quem garante a unicidade.
    const duplicado = err.code === '23505' && DUPLICADOS[err.constraint];
    if (duplicado) {
      const [campo, mensagem] = duplicado;
      throw new HttpError(409, mensagem, { [campo]: mensagem });
    }
    throw err;
  }
});

// Hash fixo usado quando o e-mail não existe, para o tempo de resposta não revelar isso
const HASH_FALSO = bcrypt.hashSync('senha-que-nao-existe-123', BCRYPT_ROUNDS);

// POST /api/auth/login  -> 200 | 400 | 401 | 429
router.post('/login', limiteLogin, async (req, res) => {
  const email = normalizarEmail(req.body?.email);
  const senha = req.body?.senha;

  const campos = {};
  if (!email) campos.email = 'Informe o e-mail.';
  if (!senha) campos.senha = 'Informe a senha.';
  if (Object.keys(campos).length) throw new HttpError(400, 'Dados inválidos.', campos);

  const usuario = await Usuarios.buscarPorEmailComSenha(email);
  const senhaConfere = await bcrypt.compare(String(senha), usuario?.senha_hash ?? HASH_FALSO);
  if (!usuario || !senhaConfere) {
    throw new HttpError(401, 'E-mail ou senha inválidos.'); // mensagem genérica de propósito
  }

  const { senha_hash, ...publico } = usuario; // nunca devolver senha_hash
  res.json({ token: gerarToken(publico), usuario: publico });
});

// GET /api/auth/me  -> 200 | 401
router.get('/me', autenticar, async (req, res) => {
  const usuario = await Usuarios.buscarPorId(req.usuarioId);
  if (!usuario) throw new HttpError(401, 'Usuário não encontrado.');
  res.json({ usuario });
});

export default router;
