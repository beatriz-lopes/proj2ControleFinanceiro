
import { Router } from 'express';

import { authenticate } from '../middlewares/authenticate.js';
import { HttpError } from '../middlewares/errors.js';
import * as Accounts from '../models/accounts.model.js';

const router = Router();

router.use(authenticate);

const VALID_TYPES = [
  'income_source',
  'bank_account',
  'credit_card'
];

function validateAccount(body) {
  const name = String(body?.name ?? '').trim();
  const type = body?.type;

  const fields = {};

  if (!name) {
    fields.name = 'Informe o nome.';
  } else if (name.length > 60) {
    fields.name = 'Máximo de 60 caracteres.';
  }

  if (!VALID_TYPES.includes(type)) {
    fields.type = 'Tipo de fonte/destino inválido.';
  }

  let closingDay = null;
  let dueDay = null;
  let creditLimit = null;

  if (type === 'credit_card') {
    closingDay = Number(body.closingDay);
    dueDay = Number(body.dueDay);
    creditLimit = body.creditLimit;

    if (
      !Number.isInteger(closingDay) ||
      closingDay < 1 ||
      closingDay > 31
    ) {
      fields.closingDay = 'Informe um dia entre 1 e 31.';
    }

    if (
      !Number.isInteger(dueDay) ||
      dueDay < 1 ||
      dueDay > 31
    ) {
      fields.dueDay = 'Informe um dia entre 1 e 31.';
    }

    if (
      creditLimit === undefined ||
      creditLimit === null ||
      creditLimit === '' ||
      !Number.isFinite(Number(creditLimit)) ||
      Number(creditLimit) <= 0 ||
      !/^\d{1,10}(\.\d{1,2})?$/.test(String(creditLimit))
    ) {
      fields.creditLimit =
        'Informe um limite positivo com até duas casas decimais.';
    } else {
      creditLimit = Number(creditLimit);
    }
  }

  const emergencyReserve =
    body?.emergencyReserve ?? false;

  if (typeof emergencyReserve !== 'boolean') {
    fields.emergencyReserve = 'Valor inválido.';
  }

  if (Object.keys(fields).length) {
    throw new HttpError(
      400,
      'Dados inválidos.',
      fields
    );
  }

  return {
    name,
    type,
    closingDay,
    dueDay,
    creditLimit,
    emergencyReserve
  };
}

// Listar fontes e destinos.
router.get('/', async (req, res) => {
  const accounts = await Accounts.findAll(req.userId);

  res.json(accounts);
});

// Consultar fonte ou destino.
router.get('/:id', async (req, res) => {
  const account = await Accounts.findById(
    req.params.id,
    req.userId
  );

  if (!account) {
    throw new HttpError(
      404,
      'Fonte/destino não encontrada.'
    );
  }

  res.json(account);
});

// Criar fonte ou destino.
router.post('/', async (req, res) => {
  const data = validateAccount(req.body);

  try {
    const account = await Accounts.create({
      userId: req.userId,
      ...data
    });

    res.status(201).json(account);
  } catch (error) {
    if (error.code === '23505') {
      throw new HttpError(
        409,
        'Já existe uma fonte/destino com esse nome.'
      );
    }

    throw error;
  }
});

// Atualizar fonte ou destino.
router.put('/:id', async (req, res) => {
  const data = validateAccount(req.body);

  try {
    const account = await Accounts.update(
      req.params.id,
      req.userId,
      data
    );

    if (!account) {
      throw new HttpError(
        404,
        'Fonte/destino não encontrada.'
      );
    }

    if (account.error === 'incompatible_transactions') {
      throw new HttpError(
        409,
        'Não é possível alterar o tipo desta fonte/destino porque existem lançamentos incompatíveis.'
      );
    }

    res.json(account);
  } catch (error) {
    if (error.code === '23505') {
      throw new HttpError(
        409,
        'Já existe uma fonte/destino com esse nome.'
      );
    }

    if (
      error.code === '23503' ||
      error.code === '23514'
    ) {
      throw new HttpError(
        409,
        'Não é possível alterar o tipo desta fonte/destino porque existem lançamentos incompatíveis.'
      );
    }

    throw error;
  }
});

// Excluir fonte ou destino.
router.delete('/:id', async (req, res) => {
  try {
    const account = await Accounts.remove(
      req.params.id,
      req.userId
    );

    if (!account) {
      throw new HttpError(
        404,
        'Fonte/destino não encontrada.'
      );
    }

    res.status(204).end();
  } catch (error) {
    if (error.code === '23503') {
      throw new HttpError(
        409,
        'Não é possível excluir uma fonte/destino que possui lançamentos vinculados.'
      );
    }

    throw error;
  }
});

export default router;
