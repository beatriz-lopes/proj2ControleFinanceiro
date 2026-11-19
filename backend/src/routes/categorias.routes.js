const express = require("express");
const router = express.Router();

const pool =  require("../config/db");

// Listar categorias
router.get("/", async (req, res) => {
    try{
        const usuarioId = req.user.id;
        const resultado = await pool.query(
            `
            SELECT *
            FROM categorias
            WHERE usuario_id = $1
            ORDER BY nome ASC
            `,
            [usuarioId]
        );
        return res.status(200).json(resultado.rows);

    } catch (erro){
        console.error(erro);

        return res.status(500).json({
            erro: "Erro ao listar categorias"
        });
    }
});

// Cadastrar/ Criar categoria
router.post("/", async (req, res) => {
    try{
        const usuarioId = req.user.id;
        const {nome, tipo, descricao} = req.body;

        if(!nome || nome.trim()){
            return res.status(400).json({
                erro: "O campo nome é obrigatório"
            });
        }

        if(!["receita", "despesa"].includes(tipo)){
            return res.status(400).json({
                erro: "Tipo de categoria inválida"
            });
        }

        const resultado = await pool.query(
            `
            INSERT INTO categorias
            (usuario_id, nome, tipo, descricao)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            `,
            [usuarioId, nome.trim(), tipo, decricao || null]
        );
        return res.status(200).json({
            mensagem: "Categoria criada com sucesso",
            categoria: resultado.rows[0]
        });

    } catch (erro){
        console.error(erro);
        
        return res.status(500).json({
            erro: "Erro ao criar categoria"
        });
    }
});

// Listar categoria específica (por ID)
router.get("/:id", async (req, res) => {
    try{
        const usuarioId = req.user.id;
        const { id } = req.params;
        const resultado = await pool.query(
            `
            SELECT *
            FROM categorias
            WHERE id = $1
            AND usuario_id = $2
            `,
            [id, usuarioId]
        );

        if(resultado.rows.length === 0){
            return res.status(404).json({
                erro: "Categoria não encontrada"
            });
        }
        return res.status(200).json(resultado.rows[0]);
    } catch (erro){
        console.error(erro);

        return res.status(500).json({
            erro: "Erro ao listar categoria"
        });
    }
});

