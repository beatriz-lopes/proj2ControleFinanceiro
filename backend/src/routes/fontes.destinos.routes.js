const express = require('express');
const router = express.Router();

const pool = require('../config/db');

// Listar fontes e destinos
router.get("/", async (req, res) => {
  try{
    const usuarioId = req.user.id;
    const resultado = await pool.query(
      `
      SELECT *
       FROM fontes_destinos
       WHERE usuario_id = $1
       ORDER BY nome ASC
       `,
      [usuarioId]
    );
    return res.status(200).json(resultado.rows);

  } catch (erro) {
    console.error(erro);

    return res.status(500).json({
      erro: "Erro ao listar fontes e destinos"
    });
  }
});

// Cadastrar/ Criar fonte ou destino
router.post("/", async (req, res) => {
    try{
        const usuarioId = req.user.id;
        const { nome, tipo, descricao } = req.body;

        if(!nome || !nome.trim()){
            return res.status(400).json({
                erro: "O campo nome é obrigatório"
            });
        }

        if(!["fonte", "destino"].includes(tipo)){
            return res.status(400).json({
                erro: "Tipo deve ser fonte ou destino"
            });
        }

        const resultado = await pool.query(
            `
            INSERT INTO fontes_destinos
            (usuario_id, nome, tipo, descricao)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            `,
            [usuarioId, nome.trim(), tipo, descricao || null]
        );
        return res.status(201).json({
            mensagem: "Fonte/Destino criado com sucesso",
            dados: resultado.rows[0]
        });
    } catch (erro){
        console.error(erro);

        return res.status(500).json({
            erro: "Erro ao criar fonte/destino"
        });
    }
});

// Listar fonte/destino específico (por ID)
router.get("/:id", async (req, res) => {
  try{
    const resultado = await pool.query(
      `
      SELECT *
       FROM fontes_destinos
       WHERE id = $1
       AND usuario_id = $2
       `,
      [req.params.id, req.user.id]
    );

    if (!resultado.rows.length) {
      return res.status(404).json({
        erro: "Fonte/destino não encontrado"
      });
    }
    return res.json(resultado.rows[0]);

  } catch (erro) {
    return res.status(500).json({
      erro: "Erro ao listar fonte/destino"
    });
  }
});

// Editar fonte/destino
router.put("/:id", async (req, res) => {
  try{
    const { nome, tipo, descricao } = req.body;

    if (!nome?.trim() || !["fonte", "destino"].includes(tipo)) {
      return res.status(400).json({
        erro: "Dados inválidos"
      });
    }

    const resultado = await pool.query(
      `
      UPDATE fontes_destinos
       SET nome = $1, tipo = $2, descricao = $3
       WHERE id = $4 AND usuario_id = $5
       RETURNING *
       `,
      [
        nome.trim(), tipo, descricao || null, 
        req.params.id, req.user.id
      ]
    );

    if (!resultado.rows.length) {
      return res.status(404).json({
        erro: "Fonte/destino não encontrado"
      });
    }
    return res.json(resultado.rows[0]);

  } catch (erro) {
    return res.status(500).json({
      erro: "Erro ao atualizar fonte/destino"
    });
  }
});

// Deletar/ Excluir fonte/destino
router.delete("/:id", async (req, res) => {
  try{
    const resultado = await pool.query(
      `
      DELETE FROM fontes_destinos
       WHERE id = $1 AND usuario_id = $2
       RETURNING *
       `,
      [req.params.id, req.user.id]
    );

    if (!resultado.rows.length) {
      return res.status(404).json({
        erro: "Fonte/destino não encontrado"
      });
    }
    return res.json({
      mensagem: "Fonte/destino excluído"
    });

  } catch (erro) {
    return res.status(409).json({
      erro: "Erro ao excluir fonte/destino. Verifique os vínculos."
    });
  }
});

module.exports = router;