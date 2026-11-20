
import { Router } from 'express';

import { authenticate } from '../middlewares/authenticate.js';
import { HttpError } from '../middlewares/errors.js';
import { isValidDate } from '../models/validation.js';

import * as Reports from '../models/reports.model.js';

const router = Router();


router.use(authenticate);


function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

// Calcula o período anterior com a mesma duração.

function getPreviousPeriod(start, end) {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);

  const year = startDate.getUTCFullYear();
  const month = startDate.getUTCMonth();

  const dayMilliseconds = 24 * 60 * 60 * 1000;

  // Verifica se o usuário selecionou um mês completo.
  const firstDayOfMonth = new Date(
    Date.UTC(year, month, 1)
  );

  const lastDayOfMonth = new Date(
    Date.UTC(year, month + 1, 0)
  );

  const isFullMonth =
    start === formatDate(firstDayOfMonth) &&
    end === formatDate(lastDayOfMonth);

  // Caso 1: mês completo.
  // Compara com o mês calendário anterior.
  if (isFullMonth) {
    const previousStart = new Date(
      Date.UTC(year, month - 1, 1)
    );

    const previousEnd = new Date(
      Date.UTC(year, month, 0)
    );

    return {
      previousStart: formatDate(previousStart),
      previousEnd: formatDate(previousEnd)
    };
  }

  // Caso 2: período personalizado.
  // Compara com um intervalo de mesma duração.
  const days = Math.round(
    (endDate.getTime() - startDate.getTime()) /
    dayMilliseconds
  ) + 1;

  const previousEnd = new Date(
    startDate.getTime() - dayMilliseconds
  );

  const previousStart = new Date(
    startDate.getTime() - days * dayMilliseconds
  );

  return {
    previousStart: formatDate(previousStart),
    previousEnd: formatDate(previousEnd)
  };
}


// GET /api/reports/categories?start=2026-10-01&end=2026-10-31
router.get('/categories', async (req, res) => {
  const now = new Date();

  const year = now.getFullYear();
  const month = now.getMonth();

  // Datas padrão: primeiro e último dia do mês atual.
  const defaultStart =
    `${year}-${String(month + 1).padStart(2, '0')}-01`;

  const defaultEnd = formatDate(
    new Date(Date.UTC(year, month + 1, 0))
  );

  const start = req.query.start ?? defaultStart;
  const end = req.query.end ?? defaultEnd;

  // Validação das datas.
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
      'A data final não pode ser anterior à inicial.';
  }

  if (Object.keys(fields).length > 0) {
    throw new HttpError(400, 'Período inválido.', fields);
  }

  const { previousStart, previousEnd } =
    getPreviousPeriod(start, end);

  // O usuário é identificado pelo token JWT.
  const report = await Reports.reportByCategory(
    req.userId,
    start,
    end,
    previousStart,
    previousEnd
  );

  return res.json(report);
});


// RF8 - Relatório por fonte/destino.

router.get('/accounts', async (req, res) => {
  const now = new Date();

  const year = now.getFullYear();
  const month = now.getMonth();

  // Por padrão, consulta o mês atual.
  const defaultStart =
    `${year}-${String(month + 1).padStart(2, '0')}-01`;

  const defaultEnd = formatDate(
    new Date(Date.UTC(year, month + 1, 0))
  );

  const start = req.query.start ?? defaultStart;
  const end = req.query.end ?? defaultEnd;

  // Valida os parâmetros recebidos.
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
      'A data final não pode ser anterior à inicial.';
  }

  if (Object.keys(fields).length > 0) {
    throw new HttpError(400, 'Período inválido.', fields);
  }

  // Consulta os dados do usuário autenticado.
  const report = await Reports.reportByAccount(
    req.userId,
    start,
    end
  );

  return res.json(report);
});


export default router;
