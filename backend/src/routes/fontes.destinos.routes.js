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
