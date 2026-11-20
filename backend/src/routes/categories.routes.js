
import { Router } from 'express';

import { authenticate } from '../middlewares/authenticate.js';
import { HttpError } from '../middlewares/errors.js';
import * as Categories from '../models/categories.model.js';

const router = Router();

router.use(authenticate);

const VALID_TYPES = ['income', 'expense'];

function validateCategory(body) {
  const name = String(body?.name ?? '').trim();
  const type = body?.type;

  const fields = {};

  if (!name) {
    fields.name = 'Informe o nome da categoria.';
  } else if (name.length > 60) {
    fields.name = 'O nome deve ter no máximo 60 caracteres.';
  }

  if (!VALID_TYPES.includes(type)) {
    fields.type = 'Selecione entrada ou saída.';
  }

  if (Object.keys(fields).length) {
    throw new HttpError(400, 'Dados inválidos.', fields);
  }

  return { name, type };
}

// Listar categorias
router.get('/', async (req, res) => {
  const categories = await Categories.findAll(req.userId);

  res.json(categories);
});

// Consultar categoria
router.get('/:id', async (req, res) => {
  const category = await Categories.findById(
    req.params.id,
    req.userId
  );

  if (!category) {
    throw new HttpError(404, 'Categoria não encontrada.');
  }

  res.json(category);
});

// Criar categoria
router.post('/', async (req, res) => {
  const data = validateCategory(req.body);

  try {
    const category = await Categories.create({
      userId: req.userId,
      ...data
    });

    res.status(201).json(category);
  } catch (error) {
    if (error.code === '23505') {
      throw new HttpError(
        409,
        'Já existe uma categoria com esse nome e tipo.',
        { name: 'Categoria já cadastrada.' }
      );
    }

    throw error;
  }
});

// Atualizar categoria
router.put('/:id', async (req, res) => {
  const data = validateCategory(req.body);

  try {
    const category = await Categories.update(
      req.params.id,
      req.userId,
      data
    );

    if (!category) {
      throw new HttpError(404, 'Categoria não encontrada.');
    }

    res.json(category);
  } catch (error) {
    if (error.code === '23505') {
      throw new HttpError(
        409,
        'Já existe uma categoria com esse nome e tipo.',
        { name: 'Categoria já cadastrada.' }
      );
    }

    if (error.code === '23503') {
      throw new HttpError(
        409,
        'Não é possível alterar o tipo de uma categoria vinculada a lançamentos.'
      );
    }

    throw error;
  }
});

// Excluir categoria
router.delete('/:id', async (req, res) => {
  try {
    const category = await Categories.remove(
      req.params.id,
      req.userId
    );

    if (!category) {
      throw new HttpError(404, 'Categoria não encontrada.');
    }

    res.status(204).end();
  } catch (error) {
    if (error.code === '23503') {
      throw new HttpError(
        409,
        'Não é possível excluir uma categoria que possui lançamentos vinculados.'
      );
    }

    throw error;
  }
});

export default router;
