const express = require("express");
const router = express.Router();

const pool =  require("../config/db");

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

