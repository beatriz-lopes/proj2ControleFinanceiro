# Controle Financeiro (Projeto 2 — Programação Web Full Stack)

API REST em Node.js/Express + SPA em React para controle financeiro pessoal: cadastro e login,
categorias, fontes/destinos, lançamentos (com compras parceladas), relatórios e previsão de faturas.

## Tecnologias

| Camada | Tecnologias |
|---|---|
| Banco | PostgreSQL 18 (via Docker) |
| Back-end | Node.js 24, Express 5, pg (pool), bcrypt, jsonwebtoken, dotenv, cors, express-rate-limit |
| Front-end | React 19, Vite, React Router, Recharts (gráficos) |

## Como rodar do zero

Pré-requisitos: Node.js 20+ e Docker Desktop **aberto**.

```bash
# 1. Banco (na raiz do repositório)
docker compose up -d

# 2. Back-end
cd backend
npm install
cp .env.example .env        # ajuste JWT_SECRET (comando para gerar no próprio arquivo)
npm run db:reset            # cria as tabelas e carrega o seed
npm run dev                 # http://localhost:3000/api

# 3. Front-end (outro terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Sem Docker: instale o PostgreSQL 18, crie o banco `financas` e ajuste `DATABASE_URL` no `backend/.env`.

### Usuários de teste (seed)

| Nome | E-mail | CPF | Senha |
|---|---|---|---|
| Ana Souza | ana@email.com | 529.982.247-25 | Senha1234 |
| Bruno Lima | bruno@email.com | 111.444.777-35 | Senha1234 |

O seed gera lançamentos do mês atual e dos 2 anteriores, com cartões (Nubank fecha 3/vence 10,
Visa fecha 25/vence 5, Inter fecha 28/vence 7) e compras parceladas. `npm run db:reset` apaga tudo e recria.

## Variáveis de ambiente (`backend/.env`)

| Variável | Exemplo | Uso |
|---|---|---|
| `PORT` | `3000` | Porta da API |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/financas` | Conexão com o banco |
| `JWT_SECRET` | (texto aleatório longo) | Assinatura dos tokens |
| `JWT_EXPIRES_IN` | `1h` | Validade do token |
| `CORS_ORIGIN` | `http://localhost:5173` | Única origem aceita pelo CORS |

O `.env` não vai para o Git; o `.env.example` sim.

## Estrutura

```
backend/
  database/        schema.sql, seed.js e reset.js (npm run db:reset)
  src/
    server.js      app Express, middlewares e registro das rotas
    routes/        rotas + controladores
    models/        acesso ao banco e funções puras (validation.js: isValidCpf etc.)
    middlewares/   authenticate.js (JWT) e errors.js (HttpError + tratamento central)
    config/        db.js (pool, withTransaction) e auth.js (JWT, bcrypt)
frontend/src/
  components/      páginas e componentes
  contexts/        AuthContext
  services/        api.js (único cliente HTTP) e validation.js
```

## Idioma e nomes

O **código está em inglês** (arquivos, variáveis, tabelas, colunas, rotas e campos JSON); **todo texto exibido ao
usuário está em português** (telas, mensagens de erro da API, nomes de categorias padrão). O enunciado permite
adaptar nomes (seção 10.6) desde que entidades, relacionamentos e restrições do modelo sejam mantidos (10.4).
Correspondência com os nomes do enunciado:

| Enunciado | Código |
|---|---|
| `usuarios` (`nome`, `senha_hash`, `criado_em`) | `users` (`name`, `password_hash`, `created_at`) |
| `categorias` (`tipo`: `entrada`/`saida`) | `categories` (`type`: `income`/`expense`) |
| `fontes_destinos` (`tipo`: `renda`/`conta`/`cartao_credito`) | `accounts` (`type`: `income_source`/`bank_account`/`credit_card`) |
| `dia_fechamento`, `dia_vencimento`, `limite` | `closing_day`, `due_day`, `credit_limit` |
| `lancamentos` (`descricao`, `valor`, `data`) | `transactions` (`description`, `amount`, `date`) |
| `categoria_id`, `fonte_destino_id` | `category_id`, `account_id` |
| `parcela_atual`, `total_parcelas`, `grupo_parcelamento` | `installment_number`, `installment_count`, `installment_group` |
| `/api/auth/cadastro` | `/api/auth/register` |
| `/api/categorias`, `/api/fontes-destinos`, `/api/lancamentos` | `/api/categories`, `/api/accounts`, `/api/transactions` |
| `/api/relatorios/...`, `/api/saude-financeira` | `/api/reports/...`, `/api/financial-health` |
| erro `{ erro, campos }` | `{ error, fields }` |

## Rotas da API

As rotas abaixo de `/api`, exceto cadastro e login, exigem o cabeçalho `Authorization: Bearer <token>`.

| Método | Caminho | Uso |
|---|---|---|
| POST | `/api/auth/register` | Cadastro |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Usuário autenticado |
| GET, POST | `/api/categories` | Listar e criar categorias |
| GET, PUT, DELETE | `/api/categories/:id` | Consultar, alterar e excluir categoria |
| GET, POST | `/api/accounts` | Listar e criar fontes/destinos |
| GET, PUT, DELETE | `/api/accounts/:id` | Consultar, alterar e excluir fonte/destino |
| GET, POST | `/api/transactions` | Listar com filtros/paginação e criar lançamento |
| GET, PUT, DELETE | `/api/transactions/:id` | Consultar, alterar e excluir lançamento |
| GET | `/api/reports/categories?start=AAAA-MM-DD&end=AAAA-MM-DD` | RF7 |
| GET | `/api/reports/accounts?start=AAAA-MM-DD&end=AAAA-MM-DD` | RF8 |
| GET | `/api/reports/invoices?months=3` | RF9 |
| GET | `/api/financial-health` | Desafio extra |

As consultas de lançamentos aceitam parâmetros de período, tipo, categoria, conta e página. Algumas operações de parcelas têm parâmetros próprios; consulte `transactions.routes.js` para os detalhes. Os erros da API seguem o formato `{ "error": "Mensagem", "fields": {} }`.

### Padrão de erro

Toda resposta de erro tem o formato:

```json
{ "error": "Dados inválidos.", "fields": { "cpf": "CPF inválido." } }
```

No back-end, basta `throw new HttpError(status, mensagem, fields)` (de `middlewares/errors.js`).

## Decisões de modelagem

- **Unicidade de e-mail e CPF garantida pelo banco** (`UNIQUE`). E-mail é gravado em minúsculas e CPF só com dígitos; a API traduz o erro `23505` do PostgreSQL em `409` indicando o campo duplicado.
- **Dinheiro em `NUMERIC(12,2)`**, nunca float.
- **FKs compostas em `transactions`**: `(category_id, user_id, type)` referencia `categories` e `(account_id, user_id)` referencia `accounts`. O banco impede usar categoria/fonte de outro usuário ou categoria de tipo diferente do lançamento.
- **Parcelas**: um lançamento por parcela, mesmo `installment_group`, `date` = data da compra em todas as parcelas; a fatura de cada parcela é calculada a partir da data da compra e de `installment_number`. Centavos de diferença ficam na 1ª parcela.
- Campo extra `accounts.emergency_reserve` (boolean) para identificar contas destinadas à reserva de emergência.
- `user_id` sempre vem do token (`req.userId`), nunca do corpo ou da URL. Registro de outro usuário → 404.
- **Relatórios por categoria (RF7)**: os totais e percentuais são calculados no back-end, utilizando consultas SQL com `SUM` e `GROUP BY`. A comparação inclui categorias que tiveram gastos apenas no período anterior. Meses completos são comparados com o mês anterior; intervalos personalizados utilizam a mesma quantidade de dias.
- **Relatórios por fonte/destino (RF8)**: entradas e saídas são agrupadas por conta, cartão ou fonte de renda. O saldo é calculado apenas para contas bancárias, pela diferença entre entradas e saídas no período selecionado, não representando necessariamente o saldo bancário atual.
- **Previsão de faturas (RF9)**: cada parcela é associada a uma fatura considerando a data original da compra, o dia de fechamento e o número da parcela. Compras realizadas no dia do fechamento ou depois entram na fatura seguinte. O vencimento é calculado conforme as configurações do cartão, ajustando datas inexistentes para o último dia do mês.
- **Limite dos cartões**: o limite utilizado é estimado pela soma das parcelas com vencimento ainda não ocorrido. Como o sistema não registra pagamentos de faturas, os valores de limite utilizado e disponível são estimativas.
- **Indicadores de saúde financeira**: a taxa de poupança e a taxa de despesas são calculadas a partir das receitas e despesas do mês atual. O comprometimento com cartões considera o valor das faturas previstas para os próximos três meses em relação à renda média estimada para esse período.
- **Projeção financeira**: utiliza a média das receitas e despesas comuns dos três meses completos anteriores, evitando considerar o mês atual, que pode estar incompleto. As despesas de cartão são calculadas separadamente, conforme o vencimento das parcelas já registradas, para evitar sua contagem em duplicidade. A projeção parte de saldo inicial igual a zero e acumula os resultados estimados dos próximos três meses, não representando o saldo bancário real.
- **Dashboard**: apresenta o resumo mensal utilizando os dados dos lançamentos e relatórios existentes, sem duplicar os cálculos financeiros no front-end. O usuário pode selecionar o mês e o ano para consultar períodos diferentes.
- **Regras para geração de dicas financeiras**: as dicas são geradas automaticamente no back-end, utilizando condições definidas a partir dos indicadores, sem uso de uma API externa de inteligência artificial. Os critérios adotados são:
  - **Taxa de poupança negativa:** recomenda revisar os maiores gastos.
  - **Taxa de poupança inferior a 10%:** sugere estabelecer uma meta de economia mensal.
  - **Taxa de poupança igual ou superior a 10%:** incentiva a continuidade do acompanhamento financeiro.
  - **Ausência de receitas:** informa que não é possível calcular a taxa de poupança.
  - **Comprometimento com cartões superior a 30%:** alerta sobre o percentual da renda estimada comprometido com as próximas faturas.
  - **Parcelas futuras:** informa o valor total das parcelas previstas para os próximos três meses, quando houver.
  - **Projeção acumulada negativa:** recomenda avaliar possíveis reduções de despesas.

  Os limites de 10% para a taxa de poupança e 30% para o comprometimento com cartões foram definidos pelo grupo como referências para gerar as mensagens. As dicas possuem caráter educativo e não constituem recomendação financeira profissional.

## Uso de inteligência artificial no desenvolvimento

- ChatGPT (OpenAI) e Claude: utilizados como ferramentas de apoio durante o desenvolvimento, principalmente para: 
  - interpretação dos requisitos do Capítulo 10 e divisão das funcionalidades em etapas;
  - sugestões de estrutura de arquivos, rotas, consultas SQL e componentes React;
  - apoio na implementação de funcionalidades;
  - explicação de trechos de código e auxílio para identificar erros durante os testes;
  - sugestões de organização de commits, revisão dos casos extremos, clareza das mensagens exibidas e documentação.

## Equipe

| Integrante | Responsabilidade |
|---|---|
| Fabio Eizo Rodriguez Matsumoto | Estrutura, banco, usuários e autenticação |
| Nádia Akemi Yuzawa | Categorias, fontes/destinos e lançamentos |
| Beatriz Milanezi Lopes | Relatórios, faturas, saúde financeira e resumo |
