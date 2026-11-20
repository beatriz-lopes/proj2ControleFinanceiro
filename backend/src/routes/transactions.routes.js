
import { Router } from 'express';
import { randomUUID } from 'node:crypto';

import { authenticate } from '../middlewares/authenticate.js';
import { HttpError } from '../middlewares/errors.js';

import * as Transactions from '../models/transactions.model.js';

import {
  isValidDate,
  isValidPositiveId,
  toCents,
  splitInstallments
} from '../models/validation.js';

const router = Router();

router.use(authenticate);

const VALID_TYPES = ['income', 'expense'];

// Valida os dados recebidos para criar ou atualizar um lançamento.
function validateTransaction(body) {
  const type = body?.type;
  const description = String(body?.description ?? '').trim();
  const amountCents = toCents(body?.amount);
  const date = body?.date;

  const categoryId = Number(body?.categoryId);
  const accountId = Number(body?.accountId);

  const installments = body?.installments ?? 1;

  const fields = {};

  if (!VALID_TYPES.includes(type)) {
    fields.type = 'Informe income ou expense.';
  }

  if (!description || description.length > 120) {
    fields.description =
      'Descrição obrigatória, com até 120 caracteres.';
  }

  if (amountCents === null || amountCents <= 0) {
    fields.amount =
      'Informe um valor positivo com até duas casas decimais.';
  }

  if (!isValidDate(date)) {
    fields.date =
      'Informe uma data válida no formato AAAA-MM-DD.';
  }

  if (!isValidPositiveId(categoryId)) {
    fields.categoryId = 'Categoria inválida.';
  }

  if (!isValidPositiveId(accountId)) {
    fields.accountId = 'Fonte/destino inválido.';
  }

  if (
    !Number.isInteger(installments) ||
    installments < 1 ||
    installments > 48
  ) {
    fields.installments =
      'Informe entre 1 e 48 parcelas.';
  }

  if (
    amountCents !== null &&
    installments > amountCents
  ) {
    fields.installments =
      'O valor não permite essa quantidade de parcelas.';
  }

  if (Object.keys(fields).length) {
    throw new HttpError(
      400,
      'Dados inválidos.',
      fields
    );
  }

  return {
    type,
    description,
    amountCents,
    date,
    categoryId,
    accountId,
    installments
  };
}

// Converte erros de relacionamento em respostas HTTP.
function handleRelationError(error) {
  if (error === 'category') {
    throw new HttpError(
      404,
      'Categoria não encontrada.'
    );
  }

  if (error === 'account') {
    throw new HttpError(
      404,
      'Fonte/destino não encontrada.'
    );
  }

  if (error === 'category_type') {
    throw new HttpError(
      400,
      'A categoria não corresponde ao tipo do lançamento.',
      {
        categoryId: 'Escolha uma categoria do mesmo tipo.'
      }
    );
  }

  if (error === 'account_type') {
    throw new HttpError(
      400,
      'A fonte/destino não é compatível com o tipo do lançamento.',
      {
        accountId:
          'Entradas exigem uma fonte de renda ou conta bancária; saídas não podem utilizar uma fonte exclusiva de renda.'
      }
    );
  }
}

// Prepara os dados e distribui o valor entre as parcelas.
function prepareData(userId, input, accountType) {
  if (
    input.installments > 1 &&
    accountType !== 'credit_card'
  ) {
    throw new HttpError(
      400,
      'Parcelamentos são permitidos somente em cartões de crédito.',
      {
        installments: 'Selecione um cartão de crédito.'
      }
    );
  }

  if (
    (input.type === 'income' && accountType === 'credit_card') ||
    (input.type === 'expense' && accountType === 'income_source')
  ) {
    throw new HttpError(
      400,
      'A fonte/destino não é compatível com o tipo do lançamento.',
      {
        accountId: 'Selecione uma fonte/destino compatível.'
      }
    );
  }

  return {
    userId,
    type: input.type,
    description: input.description,
    date: input.date,
    categoryId: input.categoryId,
    accountId: input.accountId,

    installments: splitInstallments(
      input.amountCents,
      input.installments
    ),

    installmentGroup: input.installments > 1
      ? randomUUID()
      : null
  };
}

// GET /api/transactions
// Lista lançamentos com filtros, paginação e resumo financeiro.
router.get('/', async (req, res) => {
  const now = new Date();

  const currentYear = now.getFullYear();

  const currentMonth = String(
    now.getMonth() + 1
  ).padStart(2, '0');

  const defaultStart =
    `${currentYear}-${currentMonth}-01`;

  const lastDay = new Date(
    currentYear,
    now.getMonth() + 1,
    0
  ).getDate();

  const defaultEnd =
    `${currentYear}-${currentMonth}-${String(lastDay).padStart(2, '0')}`;

  const start = req.query.start || defaultStart;
  const end = req.query.end || defaultEnd;
  const type = req.query.type || null;

  const categoryId = req.query.categoryId
    ? Number(req.query.categoryId)
    : null;

  const accountId = req.query.accountId
    ? Number(req.query.accountId)
    : null;

  const page = Number(req.query.page || 1);

  const limit = 20;

  const fields = {};

  if (!isValidDate(start)) {
    fields.start = 'Data inicial inválida.';
  }

  if (!isValidDate(end)) {
    fields.end = 'Data final inválida.';
  }

  if (
    isValidDate(start) &&
    isValidDate(end) &&
    start > end
  ) {
    fields.end =
      'A data final deve ser posterior à inicial.';
  }

  if (type && !VALID_TYPES.includes(type)) {
    fields.type = 'Tipo inválido.';
  }

  if (
    categoryId !== null &&
    !isValidPositiveId(categoryId)
  ) {
    fields.categoryId = 'Categoria inválida.';
  }

  if (
    accountId !== null &&
    !isValidPositiveId(accountId)
  ) {
    fields.accountId = 'Fonte/destino inválido.';
  }

  if (!Number.isInteger(page) || page < 1) {
    fields.page = 'Página inválida.';
  }

  if (Object.keys(fields).length) {
    throw new HttpError(
      400,
      'Filtros inválidos.',
      fields
    );
  }

  const result = await Transactions.findAll(
    req.userId,
    {
      start,
      end,
      type,
      categoryId,
      accountId,
      page,
      limit
    }
  );

  res.json(result);
});

// GET /api/transactions/:id
// Consulta um lançamento específico.
router.get('/:id', async (req, res) => {
  const transaction = await Transactions.findById(
    req.params.id,
    req.userId
  );

  if (!transaction) {
    throw new HttpError(
      404,
      'Lançamento não encontrado.'
    );
  }

  res.json(transaction);
});

// POST /api/transactions
// Cria um lançamento ou um grupo de parcelas.
router.post('/', async (req, res) => {
  const input = validateTransaction(req.body);

  const relations = await Transactions.getRelations(
    req.userId,
    input.categoryId,
    input.accountId
  );

  if (!relations) {
    throw new HttpError(
      404,
      'Categoria ou fonte/destino não encontrada.'
    );
  }

  const data = prepareData(
    req.userId,
    input,
    relations.account.type
  );

  const result = await Transactions.insertGroup(data);

  if (result.error) {
    handleRelationError(result.error);
  }

  res.status(201).json(result.data);
});

// PUT /api/transactions/:id
// Atualiza um lançamento ou todo o grupo de parcelas.
router.put('/:id', async (req, res) => {
  const input = validateTransaction(req.body);

  const relations = await Transactions.getRelations(
    req.userId,
    input.categoryId,
    input.accountId
  );

  if (!relations) {
    throw new HttpError(
      404,
      'Categoria ou fonte/destino não encontrada.'
    );
  }

  const data = prepareData(
    req.userId,
    input,
    relations.account.type
  );

  const result = await Transactions.updateGroup(
    req.params.id,
    req.userId,
    data
  );

  if (!result) {
    throw new HttpError(
      404,
      'Lançamento não encontrado.'
    );
  }

  if (result.error) {
    handleRelationError(result.error);
  }

  res.json(result.data);
});

// DELETE /api/transactions/:id
// Permite excluir uma parcela ou todas as parcelas.
router.delete('/:id', async (req, res) => {
  const allInstallments =
    req.query.allInstallments === 'true';

  const removed = await Transactions.remove(
    req.params.id,
    req.userId,
    allInstallments
  );

  if (!removed.length) {
    throw new HttpError(
      404,
      'Lançamento não encontrado.'
    );
  }

  res.status(204).end();
});

export default router;
