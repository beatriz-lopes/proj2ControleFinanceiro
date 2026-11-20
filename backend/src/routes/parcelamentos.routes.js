import { Router } from 'express';
import { pool } from '../config/db.js';
import { authenticate } from '../middlewares/authenticate.js';
import { HttpError } from '../middlewares/errors.js';

const router = Router();

function calcularParcelas(valorTotal, quantidade) {
  const centavos = Math.round(valorTotal * 100);

  const valorBase = Math.floor(
    centavos / quantidade
  );

  const resto = centavos % quantidade;

  return Array.from(
    { length: quantidade },
    (_, index) => (
      valorBase + (index < resto ? 1 : 0)
    )
  );
}

function adicionarMes(data, quantidade) {
  const ano = data.getUTCFullYear();
  const mes = data.getUTCMonth() + quantidade;
  const dia = data.getUTCDate();

  const primeiroDia = new Date(
    Date.UTC(ano, mes, 1)
  );

  const ultimoDia = new Date(
    Date.UTC(ano, mes + 1, 0)
  ).getUTCDate();

  return new Date(
    Date.UTC(
      primeiroDia.getUTCFullYear(),
      primeiroDia.getUTCMonth(),
      Math.min(dia, ultimoDia)
    )
  );
}

//Listar parcelas futuras
router.get("/futuros", async (req, res) => {
  try{
    const resultado = await pool.query(
      `
      SELECT
        p.id,
        p.numero_parcela,
        p.valor,
        p.data_vencimento,
        p.status,
        pa.id AS parcelamento_id,
        l.descricao

       FROM parcelas p

       INNER JOIN parcelamentos pa
         ON pa.id = p.parcelamento_id

       INNER JOIN lancamentos l
         ON l.id = pa.lancamento_id

       WHERE pa.usuario_id = $1
       AND p.status = 'pendente'
       AND p.data_vencimento >= CURRENT_DATE

       ORDER BY p.data_vencimento ASC
       `,
      [req.userId]
    );
    return res.json(resultado.rows);

  } catch (erro) {
    console.error(erro);

    return res.status(500).json({
      erro: "Erro ao consultar parcelas futuras"
    });
  }
});

module.exports = router;

// Cadastrar/ Criar parcelamento
router.post("/", async (req, res) => {
  const client = await pool.connect();

  try{
    const usuarioId = req.userId;
    const { descricao, valor_total, quantidade_parcelas, data_primeira_parcela, categoria_id, fonte_destino_id} = req.body;

    if (!descricao?.trim()) {
      return res.status(400).json({
        erro: "O campo descrição é obrigatório"
      });
    }

    if (typeof valor_total !== "number" || !Number.isFinite(valor_total) || valor_total <= 0 || Math.round(valor_total * 100) !== valor_total * 100) {
      return res.status(400).json({
        erro: "Valor total inválido"
      });
    }

    if (!Number.isInteger(quantidade_parcelas) || quantidade_parcelas < 2 || quantidade_parcelas > 120) {
      return res.status(400).json({
        erro: "Quantidade de parcelas inválida"
      });
    }

    if (typeof data_primeira_parcela !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data_primeira_parcela)) {
      return res.status(400).json({
        erro: "Data da primeira parcela inválida"
      });
    }

    const dataInicial = new Date(`${data_primeira_parcela}T00:00:00Z`);

    if (Number.isNaN(dataInicial.getTime()) || dataInicial.toISOString().slice(0, 10) !== data_primeira_parcela) {
      return res.status(400).json({
        erro: "Data inexistente"
      });
    }

    await client.query("BEGIN");

    const verificacao = await client.query(
      `
      SELECT
        EXISTS (
          SELECT 1 FROM categorias
          WHERE id = $1
          AND usuario_id = $3
          AND tipo = 'despesa'
        ) AS categoria_valida,
        EXISTS (
          SELECT 1 FROM fontes_destinos
          WHERE id = $2
          AND usuario_id = $3
          AND tipo = 'destino'
        ) AS destino_valido
         `,
      [categoria_id, fonte_destino_id, usuarioId]
    );

    if (!verificacao.rows[0].categoria_valida || !verificacao.rows[0].destino_valido) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        erro: "Categoria ou destino inválido"
      });
    }

    const lancamento = await client.query(
      `
      INSERT INTO lancamentos
      (usuario_id, categoria_id, fonte_destino_id, descricao, tipo, valor, data)
      VALUES ($1,$2,$3,$4,'despesa',$5,$6)
      RETURNING id
      `,
      [usuarioId, categoria_id, fonte_destino_id, descricao.trim(), valor_total, data_primeira_parcela]
    );

    const parcelamento = await client.query(
      `
      INSERT INTO parcelamentos
      (usuario_id, lancamento_id, quantidade_parcelas, valor_total)
      VALUES ($1,$2,$3,$4)
      RETURNING *
      `,
      [usuarioId, lancamento.rows[0].id, quantidade_parcelas, valor_total]
    );

    const valores = calcularParcelas(valor_total, quantidade_parcelas);
    const parcelasCriadas = [];

    for (let i = 0; i < quantidade_parcelas; i++) {
      const vencimento = adicionarMes(
        dataInicial,
        i
      );

      const dataFormatada = vencimento
        .toISOString()
        .slice(0, 10);

      const parcela = await client.query(
        `
        INSERT INTO parcelas
        (parcelamento_id, numero_parcela, valor, data_vencimento, status)
        VALUES ($1,$2,$3,$4,'pendente')
        RETURNING *`,
        [parcelamento.rows[0].id, i + 1, (valores[i] / 100).toFixed(2), dataFormatada]
      );

      parcelasCriadas.push(parcela.rows[0]);
    }

    await client.query("COMMIT");

    return res.status(201).json({
      mensagem: "Parcelamento criado com sucesso",
      parcelamento: parcelamento.rows[0],
      parcelas: parcelasCriadas
    });
  } catch (erro) {
    await client.query("ROLLBACK");

    console.error(erro);

    return res.status(500).json({
      erro: "Erro ao criar parcelamento"
    });
  } finally {
    client.release();
  }
});
