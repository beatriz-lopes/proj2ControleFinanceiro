// Dados de exemplo: 2 usuários com 3 meses de lançamentos (mês atual e os 2 anteriores).
// Datas são relativas à data de hoje, para o "mês corrente" sempre ter dados.
// Senha dos dois usuários de teste: Senha1234
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { transacao } from '../src/config/db.js';
import { BCRYPT_ROUNDS } from '../src/config/auth.js';
import { criar, criarDadosPadrao } from '../src/models/usuarios.model.js';

const SENHA_TESTE = 'Senha1234';

// 'YYYY-MM-DD' do dia `dia` do mês (atual + deslocamento)
function data(deslocamentoMes, dia) {
  const hoje = new Date();
  const d = new Date(hoje.getFullYear(), hoje.getMonth() + deslocamentoMes, dia);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Divide em centavos; a diferença vai para a 1ª parcela (100,00 em 3x = 33,34 + 33,33 + 33,33)
function parcelas(valor, n) {
  const totalCentavos = Math.round(valor * 100);
  const base = Math.floor(totalCentavos / n);
  const resto = totalCentavos - base * n;
  return Array.from({ length: n }, (_, i) => (i === 0 ? base + resto : base) / 100);
}

async function criarUsuario(client, { nome, email, cpf }) {
  const senhaHash = await bcrypt.hash(SENHA_TESTE, BCRYPT_ROUNDS);
  const usuario = await criar({ nome, email, cpf, senhaHash }, client);
  await criarDadosPadrao(usuario.id, client);
  return usuario;
}

async function criarFonte(client, usuarioId, f) {
  const { rows } = await client.query(
    `INSERT INTO fontes_destinos (usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite, reserva)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [usuarioId, f.nome, f.tipo, f.diaFechamento ?? null, f.diaVencimento ?? null, f.limite ?? null, f.reserva ?? false],
  );
  return rows[0].id;
}

async function mapas(client, usuarioId) {
  const cats = await client.query('SELECT id, nome, tipo FROM categorias WHERE usuario_id = $1', [usuarioId]);
  const fontes = await client.query('SELECT id, nome FROM fontes_destinos WHERE usuario_id = $1', [usuarioId]);
  return {
    cat: Object.fromEntries(cats.rows.map((c) => [`${c.tipo}:${c.nome}`, c.id])),
    fonte: Object.fromEntries(fontes.rows.map((f) => [f.nome, f.id])),
  };
}

async function lancar(client, usuarioId, m, l) {
  const valores = parcelas(l.valor, l.parcelas ?? 1);
  const grupo = valores.length > 1 ? randomUUID() : null;
  for (let i = 0; i < valores.length; i++) {
    await client.query(
      `INSERT INTO lancamentos
         (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id,
          parcela_atual, total_parcelas, grupo_parcelamento)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        usuarioId, l.tipo, l.descricao, valores[i], l.data,
        m.cat[`${l.tipo}:${l.categoria}`], m.fonte[l.fonte],
        i + 1, valores.length, grupo,
      ],
    );
  }
}

export async function seed() {
  await transacao(async (client) => {
    // ---------- Ana ----------
    const ana = await criarUsuario(client, { nome: 'Ana Souza', email: 'ana@email.com', cpf: '52998224725' });
    await criarFonte(client, ana.id, { nome: 'Nubank', tipo: 'cartao_credito', diaFechamento: 3, diaVencimento: 10, limite: 5000 });
    await criarFonte(client, ana.id, { nome: 'Visa crédito', tipo: 'cartao_credito', diaFechamento: 25, diaVencimento: 5, limite: 3000 });
    await criarFonte(client, ana.id, { nome: 'Poupança', tipo: 'conta', reserva: true });
    const a = await mapas(client, ana.id);

    for (const mes of [-2, -1, 0]) {
      const extra = (mes + 3) * 37; // varia um pouco os gastos entre os meses
      const lancs = [
        { tipo: 'entrada', descricao: 'Salário', valor: 6500, data: data(mes, 5), categoria: 'Salário', fonte: 'Conta corrente' },
        { tipo: 'saida', descricao: 'Aluguel', valor: 1800, data: data(mes, 6), categoria: 'Moradia', fonte: 'Conta corrente' },
        { tipo: 'saida', descricao: 'Conta de luz', valor: 180 + extra / 3, data: data(mes, 12), categoria: 'Moradia', fonte: 'Conta corrente' },
        { tipo: 'saida', descricao: 'Supermercado', valor: 750 + extra, data: data(mes, 9), categoria: 'Alimentação', fonte: 'Nubank' },
        { tipo: 'saida', descricao: 'Restaurante', valor: 140 + extra / 2, data: data(mes, 18), categoria: 'Alimentação', fonte: 'Visa crédito' },
        { tipo: 'saida', descricao: 'Uber', valor: 95 + extra / 4, data: data(mes, 15), categoria: 'Mobilidade', fonte: 'Nubank' },
        { tipo: 'saida', descricao: 'Farmácia', valor: 85, data: data(mes, 20), categoria: 'Saúde', fonte: 'Conta corrente' },
        { tipo: 'saida', descricao: 'Cinema', valor: 60, data: data(mes, 22), categoria: 'Lazer', fonte: 'Nubank' },
        { tipo: 'saida', descricao: 'Curso de inglês', valor: 320, data: data(mes, 8), categoria: 'Educação', fonte: 'Conta corrente' },
        { tipo: 'saida', descricao: 'Transferência para poupança', valor: 500, data: data(mes, 7), categoria: 'Outros', fonte: 'Conta corrente' },
        { tipo: 'entrada', descricao: 'Depósito na poupança', valor: 500, data: data(mes, 7), categoria: 'Outros', fonte: 'Poupança' },
      ];
      for (const l of lancs) await lancar(client, ana.id, a, l);
    }
    // Compras parceladas (data da compra igual em todas as parcelas)
    await lancar(client, ana.id, a, { tipo: 'saida', descricao: 'Notebook', valor: 3600, parcelas: 10, data: data(-2, 12), categoria: 'Educação', fonte: 'Nubank' });
    await lancar(client, ana.id, a, { tipo: 'saida', descricao: 'Fone de ouvido', valor: 100, parcelas: 3, data: data(-1, 3), categoria: 'Lazer', fonte: 'Nubank' });
    await lancar(client, ana.id, a, { tipo: 'saida', descricao: 'Passagem aérea', valor: 1250, parcelas: 5, data: data(0, 26), categoria: 'Lazer', fonte: 'Visa crédito' });

    // ---------- Bruno ----------
    const bruno = await criarUsuario(client, { nome: 'Bruno Lima', email: 'bruno@email.com', cpf: '11144477735' });
    await criarFonte(client, bruno.id, { nome: 'Inter', tipo: 'cartao_credito', diaFechamento: 28, diaVencimento: 7, limite: 2500 });
    await criarFonte(client, bruno.id, { nome: 'Freelance', tipo: 'renda' });
    const b = await mapas(client, bruno.id);

    for (const mes of [-2, -1, 0]) {
      const lancs = [
        { tipo: 'entrada', descricao: 'Salário', valor: 3800, data: data(mes, 1), categoria: 'Salário', fonte: 'Conta corrente' },
        { tipo: 'entrada', descricao: 'Projeto freelance', valor: 900 + mes * 150, data: data(mes, 20), categoria: 'Outros', fonte: 'Freelance' },
        { tipo: 'saida', descricao: 'Aluguel', valor: 1400, data: data(mes, 5), categoria: 'Moradia', fonte: 'Conta corrente' },
        { tipo: 'saida', descricao: 'Mercado', valor: 620 - mes * 40, data: data(mes, 10), categoria: 'Alimentação', fonte: 'Inter' },
        { tipo: 'saida', descricao: 'Ônibus', valor: 180, data: data(mes, 2), categoria: 'Mobilidade', fonte: 'Conta corrente' },
        { tipo: 'saida', descricao: 'Academia', valor: 110, data: data(mes, 4), categoria: 'Saúde', fonte: 'Inter' },
        { tipo: 'saida', descricao: 'Show', valor: 250, data: data(mes, 16), categoria: 'Lazer', fonte: 'Inter' },
      ];
      for (const l of lancs) await lancar(client, bruno.id, b, l);
    }
    await lancar(client, bruno.id, b, { tipo: 'saida', descricao: 'Celular', valor: 2400, parcelas: 12, data: data(-1, 14), categoria: 'Outros', fonte: 'Inter' });
  });
}
