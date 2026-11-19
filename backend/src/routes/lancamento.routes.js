const express = require('express');
const router = express.Router();

const pool = require('../config/db');

// Listar lançamentos
router.get("/", async (req, res) => {
  try{
    const usuarioId = req.user.id;
    const resultado = await pool.query(
      `
      SELECT
        l.*,
        c.nome AS categoria,
        fd.nome AS fonte_destino

       FROM lancamentos l

       INNER JOIN categorias c
         ON c.id = l.categoria_id

       INNER JOIN fontes_destinos fd
         ON fd.id = l.fonte_destino_id

       WHERE l.usuario_id = $1

       ORDER BY l.data DESC, l.id DESC
       `,
      [usuarioId]
    );
    return res.status(200).json(resultado.rows);

  } catch (erro) {
    console.error(erro);

    return res.status(500).json({
      erro: "Erro ao listar lançamentos"
    });
  }
});

// Cadastrar/ Criar lançamentos
router.post("/", async (req, res) => {
  try{
    const usuarioId = req.user.id;
    const { descricao, tipo, valor, data, categoria_id, fonte_destino_id, observacao } = req.body;

    if (!descricao || !descricao.trim()) {
      return res.status(400).json({
        erro: "O campo descrição é obrigatório"
      });
    }

    if (!["receita", "despesa"].includes(tipo)) {
      return res.status(400).json({
        erro: "Tipo deve ser receita ou despesa"
      });
    }

    if (typeof valor !== "number" || !Number.isFinite(valor) || valor <= 0 || Math.round(valor * 100) !== valor * 100) {
      return res.status(400).json({
        erro: "Valor deve ser positivo e ter até duas casas decimais"
      });
    }

    if (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return res.status(400).json({
        erro: "Data inválida"
      });
    }

    const dataObjeto = new Date(`${data}T00:00:00Z`);

    if (Number.isNaN(dataObjeto.getTime()) || dataObjeto.toISOString().slice(0, 10) !== data) {
      return res.status(400).json({
        erro: "Data inexistente"
      });
    }

    const verificacao = await pool.query(
      `
      SELECT
        EXISTS (
          SELECT 1 FROM categorias
          WHERE id = $1 AND usuario_id = $3
          AND tipo = $4
        ) AS categoria_valida,
        EXISTS (
          SELECT 1 FROM fontes_destinos
          WHERE id = $2 AND usuario_id = $3
        ) AS fonte_valida
         `,
      [categoria_id, fonte_destino_id, usuarioId, tipo]
    );

    if (!verificacao.rows[0].categoria_valida) {
      return res.status(400).json({
        erro: "Categoria inválida para este usuário ou tipo"
      });
    }

    if (!verificacao.rows[0].fonte_valida) {
      return res.status(400).json({
        erro: "Fonte/destino inválido"
      });
    }

    const resultado = await pool.query(
      `
      INSERT INTO lancamentos
      (usuario_id, categoria_id, fonte_destino_id, descricao, tipo, valor, data, observacao)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
      `,
      [usuarioId, categoria_id, fonte_destino_id, descricao.trim(), tipo, valor, data, observacao || null]
    );
    return res.status(201).json({
      mensagem: "Lançamento criado com sucesso",
      lancamento: resultado.rows[0]
    });

  } catch (erro) {
    console.error(erro);

    return res.status(500).json({
      erro: "Erro ao criar lançamento"
    });
  }
});

// Listar lançamento específico (por ID)
router.get("/:id", async (req, res) => {
  try{
    const resultado = await pool.query(
      `
      SELECT
        l.*,
        c.nome AS categoria,
        fd.nome AS fonte_destino

       FROM lancamentos l

       INNER JOIN categorias c
         ON c.id = l.categoria_id

       INNER JOIN fontes_destinos fd
         ON fd.id = l.fonte_destino_id

       WHERE l.id = $1
       AND l.usuario_id = $2
       `,
      [req.params.id, req.user.id]
    );

    if (!resultado.rows.length) {
      return res.status(404).json({
        erro: "Lançamento não encontrado"
      });
    }
    return res.json(resultado.rows[0]);

  } catch (erro) {
    return res.status(500).json({
      erro: "Erro ao listar lançamento"
    });
  }
});

// Deletar/ Excluir lançamento
router.delete("/:id", async (req, res) => {
  try{
    const resultado = await pool.query(
      `
      DELETE FROM lancamentos
       WHERE id = $1
       AND usuario_id = $2
       RETURNING *
       `,
      [req.params.id, req.user.id]
    );

    if (!resultado.rows.length) {
      return res.status(404).json({
        erro: "Lançamento não encontrado"
      });
    }
    return res.json({
      mensagem: "Lançamento excluído"
    });

  } catch (erro) {
    console.error(erro);

    return res.status(500).json({
      erro: "Erro ao excluir lançamento"
    });
  }
});

module.exports = router;