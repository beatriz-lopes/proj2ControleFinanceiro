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
    models/        acesso ao banco e funções puras (validacao.js: cpfValido etc.)
    middlewares/   autenticar.js (JWT) e erros.js (HttpError + tratamento central)
    config/        db.js (pool, transacao) e auth.js (JWT, bcrypt)
frontend/src/
  components/      páginas e componentes
  contexts/        AuthContext
  services/        api.js (único cliente HTTP) e validacao.js
```

## Rotas da API

Todas sob `/api` exigem `Authorization: Bearer <token>`, exceto cadastro e login.

| Método | Rota | Descrição | Respostas |
|---|---|---|---|
| POST | `/api/auth/cadastro` | Cadastra usuário (cria categorias e conta padrão) e devolve token | 201, 400, 409 |
| POST | `/api/auth/login` | Autentica e devolve JWT (máx. 10 tentativas / 15 min) | 200, 400, 401, 429 |
| GET | `/api/auth/me` | Dados do usuário logado | 200, 401 |

_(Rotas de categorias, fontes/destinos, lançamentos, relatórios e saúde financeira: a completar pelos responsáveis.)_

### Padrão de erro

Toda resposta de erro tem o formato:

```json
{ "erro": "Dados inválidos.", "campos": { "cpf": "CPF inválido." } }
```

No back-end, basta `throw new HttpError(status, mensagem, campos)` (de `middlewares/erros.js`).

## Decisões de modelagem

- **Unicidade de e-mail e CPF garantida pelo banco** (`UNIQUE`). E-mail é gravado em minúsculas e CPF só com
  dígitos; a API traduz o erro `23505` do PostgreSQL em `409` indicando o campo duplicado.
- **Dinheiro em `NUMERIC(12,2)`**, nunca float.
- **FKs compostas em `lancamentos`**: `(categoria_id, usuario_id, tipo)` referencia `categorias` e
  `(fonte_destino_id, usuario_id)` referencia `fontes_destinos`. O banco impede usar categoria/fonte de outro
  usuário ou categoria de tipo diferente do lançamento.
- **Parcelas**: um lançamento por parcela, mesmo `grupo_parcelamento`, `data` = data da compra em todas as
  parcelas; a fatura de cada parcela é calculada a partir da data da compra e de `parcela_atual`.
  Centavos de diferença ficam na 1ª parcela.
- Campo extra `fontes_destinos.reserva` (boolean) para o indicador de reserva de emergência.
- `usuario_id` sempre vem do token (`req.usuarioId`), nunca do corpo ou da URL. Registro de outro usuário → 404.

## Equipe

| Integrante | Responsabilidade |
|---|---|
| Pessoa 1 | Estrutura, banco, usuários e autenticação |
| Pessoa 2 | Categorias, fontes/destinos e lançamentos |
| Pessoa 3 | Relatórios, faturas e saúde financeira |
