-- Esquema do banco (PostgreSQL 18). Executado por: npm run db:reset
-- ATENÇÃO: apaga e recria todas as tabelas.

DROP TABLE IF EXISTS lancamentos;
DROP TABLE IF EXISTS fontes_destinos;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS usuarios;

CREATE TABLE usuarios (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(120) NOT NULL,
  email       VARCHAR(160) NOT NULL,          -- gravado em minúsculas pela API
  cpf         CHAR(11)     NOT NULL,          -- só dígitos
  senha_hash  VARCHAR(100) NOT NULL,
  criado_em   TIMESTAMP    NOT NULL DEFAULT now(),
  -- A unicidade é garantida pelo banco (não só por consulta prévia na API).
  -- Os nomes das constraints são usados na API para saber qual campo duplicou.
  CONSTRAINT usuarios_email_unico UNIQUE (email),
  CONSTRAINT usuarios_cpf_unico   UNIQUE (cpf),
  CONSTRAINT usuarios_email_minusculo CHECK (email = lower(email)),
  CONSTRAINT usuarios_cpf_digitos     CHECK (cpf ~ '^[0-9]{11}$')
);

CREATE TABLE categorias (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER     NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  nome        VARCHAR(60) NOT NULL,
  tipo        VARCHAR(7)  NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  CONSTRAINT categorias_nome_unico UNIQUE (usuario_id, nome, tipo),
  -- usada pela FK composta de lancamentos (garante dono e tipo iguais)
  CONSTRAINT categorias_id_usuario_tipo UNIQUE (id, usuario_id, tipo)
);

CREATE TABLE fontes_destinos (
  id              SERIAL PRIMARY KEY,
  usuario_id      INTEGER     NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  nome            VARCHAR(60) NOT NULL,
  tipo            VARCHAR(14) NOT NULL CHECK (tipo IN ('renda', 'conta', 'cartao_credito')),
  dia_fechamento  SMALLINT CHECK (dia_fechamento BETWEEN 1 AND 31),
  dia_vencimento  SMALLINT CHECK (dia_vencimento BETWEEN 1 AND 31),
  limite          NUMERIC(12, 2) CHECK (limite >= 0),
  reserva         BOOLEAN NOT NULL DEFAULT false,  -- extra: conta de reserva de emergência (saúde financeira)
  CONSTRAINT fontes_destinos_nome_unico UNIQUE (usuario_id, nome),
  CONSTRAINT fontes_destinos_id_usuario UNIQUE (id, usuario_id),
  CONSTRAINT fontes_destinos_cartao_completo CHECK (
    tipo <> 'cartao_credito'
    OR (dia_fechamento IS NOT NULL AND dia_vencimento IS NOT NULL AND limite IS NOT NULL)
  )
);

CREATE TABLE lancamentos (
  id                  SERIAL PRIMARY KEY,
  usuario_id          INTEGER        NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  tipo                VARCHAR(7)     NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  descricao           VARCHAR(120)   NOT NULL,
  valor               NUMERIC(12, 2) NOT NULL CHECK (valor > 0),
  data                DATE           NOT NULL,   -- data da compra (igual em todas as parcelas)
  categoria_id        INTEGER        NOT NULL,
  fonte_destino_id    INTEGER        NOT NULL,
  parcela_atual       SMALLINT       NOT NULL DEFAULT 1,
  total_parcelas      SMALLINT       NOT NULL DEFAULT 1 CHECK (total_parcelas BETWEEN 1 AND 48),
  grupo_parcelamento  UUID,                      -- igual em todas as parcelas de uma compra
  criado_em           TIMESTAMP      NOT NULL DEFAULT now(),
  CONSTRAINT lancamentos_parcela_valida CHECK (parcela_atual BETWEEN 1 AND total_parcelas),
  -- FKs compostas (sem cascade): a categoria precisa ser do MESMO usuário e do MESMO tipo
  -- do lançamento, e a fonte/destino do MESMO usuário. A API valida antes; o banco garante.
  CONSTRAINT lancamentos_categoria_fk FOREIGN KEY (categoria_id, usuario_id, tipo)
    REFERENCES categorias (id, usuario_id, tipo),
  CONSTRAINT lancamentos_fonte_destino_fk FOREIGN KEY (fonte_destino_id, usuario_id)
    REFERENCES fontes_destinos (id, usuario_id)
);

CREATE INDEX idx_lancamentos_usuario_data ON lancamentos (usuario_id, data);
CREATE INDEX idx_lancamentos_categoria ON lancamentos (categoria_id);
CREATE INDEX idx_lancamentos_fonte_destino ON lancamentos (fonte_destino_id);
