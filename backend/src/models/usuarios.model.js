import { query } from '../config/db.js';

// Colunas públicas: senha_hash NUNCA sai daqui, exceto em buscarPorEmailComSenha (uso interno do login).
const COLUNAS = 'id, nome, email, cpf, criado_em';

const CATEGORIAS_PADRAO = [
  ['Salário', 'entrada'],
  ['Outros', 'entrada'],
  ['Alimentação', 'saida'],
  ['Moradia', 'saida'],
  ['Saúde', 'saida'],
  ['Mobilidade', 'saida'],
  ['Lazer', 'saida'],
  ['Educação', 'saida'],
  ['Outros', 'saida'],
];

// db = pool (padrão) ou client de uma transação
export async function criar({ nome, email, cpf, senhaHash }, db = { query }) {
  const { rows } = await db.query(
    `INSERT INTO usuarios (nome, email, cpf, senha_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING ${COLUNAS}`,
    [nome, email, cpf, senhaHash],
  );
  return rows[0];
}

// Categorias e fonte/destino iniciais de todo usuário novo.
export async function criarDadosPadrao(usuarioId, db = { query }) {
  for (const [nome, tipo] of CATEGORIAS_PADRAO) {
    await db.query('INSERT INTO categorias (usuario_id, nome, tipo) VALUES ($1, $2, $3)', [usuarioId, nome, tipo]);
  }
  await db.query(
    "INSERT INTO fontes_destinos (usuario_id, nome, tipo) VALUES ($1, 'Conta corrente', 'conta')",
    [usuarioId],
  );
}

export async function buscarPorId(id) {
  const { rows } = await query(`SELECT ${COLUNAS} FROM usuarios WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function buscarPorEmailComSenha(email) {
  const { rows } = await query(`SELECT ${COLUNAS}, senha_hash FROM usuarios WHERE email = $1`, [email]);
  return rows[0] ?? null;
}
