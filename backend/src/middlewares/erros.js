// Padrão único de erro da API: { erro: 'mensagem geral', campos: { campo: 'mensagem' } }
//
// Uso nas rotas:
//   throw new HttpError(400, 'Dados inválidos.', { valor: 'Deve ser maior que zero.' });
//   throw new HttpError(404, 'Lançamento não encontrado.');
// O Express 5 encaminha erros (inclusive de funções async) para tratarErros.
export class HttpError extends Error {
  constructor(status, erro, campos = {}) {
    super(erro);
    this.status = status;
    this.campos = campos;
  }
}

export function rotaNaoEncontrada(req, res) {
  res.status(404).json({ erro: 'Rota não encontrada.', campos: {} });
}

// eslint-disable-next-line no-unused-vars
export function tratarErros(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ erro: err.message, campos: err.campos });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.', campos: {} });
  }
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor.', campos: {} });
}
