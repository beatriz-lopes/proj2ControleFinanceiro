// Single API error format: { error: 'general message', fields: { field: 'message' } }
// Messages are shown to the user, so they are written in Portuguese.
//
// Usage in routes:
//   throw new HttpError(400, 'Dados inválidos.', { amount: 'Deve ser maior que zero.' });
//   throw new HttpError(404, 'Lançamento não encontrado.');
// Express 5 forwards errors (including from async handlers) to handleErrors.
export class HttpError extends Error {
  constructor(status, message, fields = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: 'Rota não encontrada.', fields: {} });
}

// eslint-disable-next-line no-unused-vars
export function handleErrors(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, fields: err.fields });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido no corpo da requisição.', fields: {} });
  }
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.', fields: {} });
}
