import pg from 'pg';

// NUMERIC (1700) chega como string por padrão; convertemos para número na resposta JSON.
// Cálculos de dinheiro devem ser feitos no banco (SUM) ou em centavos inteiros.
pg.types.setTypeParser(1700, (v) => parseFloat(v));
// DATE (1082) fica como 'YYYY-MM-DD' (string) para não sofrer deslocamento de fuso horário.
pg.types.setTypeParser(1082, (v) => v);

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

// Consulta parametrizada simples: query('SELECT ... WHERE id = $1', [id])
export function query(text, params) {
  return pool.query(text, params);
}

// Executa fn(client) dentro de uma transação. Qualquer erro faz ROLLBACK.
export async function transacao(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
