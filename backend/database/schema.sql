-- Database schema (PostgreSQL 18). Run with: npm run db:reset
-- WARNING: drops and recreates every table.

DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(120) NOT NULL,
  email          VARCHAR(160) NOT NULL,          -- stored lowercase by the API
  cpf            CHAR(11)     NOT NULL,          -- digits only
  password_hash  VARCHAR(100) NOT NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT now(),
  -- Uniqueness is guaranteed by the database (not only by a lookup in the API).
  -- The API uses these constraint names to tell which field is duplicated.
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_cpf_unique   UNIQUE (cpf),
  CONSTRAINT users_email_lowercase CHECK (email = lower(email)),
  CONSTRAINT users_cpf_digits      CHECK (cpf ~ '^[0-9]{11}$')
);

CREATE TABLE categories (
  id       SERIAL PRIMARY KEY,
  user_id  INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name     VARCHAR(60) NOT NULL,
  type     VARCHAR(7)  NOT NULL CHECK (type IN ('income', 'expense')),
  CONSTRAINT categories_name_unique UNIQUE (user_id, name, type),
  -- target of the composite FK in transactions (same owner and same type)
  CONSTRAINT categories_id_user_type UNIQUE (id, user_id, type)
);

-- "Fontes/destinos": where money comes from (income) or goes to (expense)
CREATE TABLE accounts (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name               VARCHAR(60) NOT NULL,
  type               VARCHAR(14) NOT NULL CHECK (type IN ('income_source', 'bank_account', 'credit_card')),
  closing_day        SMALLINT CHECK (closing_day BETWEEN 1 AND 31),
  due_day            SMALLINT CHECK (due_day BETWEEN 1 AND 31),
  credit_limit       NUMERIC(12, 2) CHECK (credit_limit >= 0),
  emergency_reserve  BOOLEAN NOT NULL DEFAULT false,  -- extra: emergency fund account (financial health)
  CONSTRAINT accounts_name_unique UNIQUE (user_id, name),
  CONSTRAINT accounts_id_user UNIQUE (id, user_id),
  CONSTRAINT accounts_credit_card_complete CHECK (
    type <> 'credit_card'
    OR (closing_day IS NOT NULL AND due_day IS NOT NULL AND credit_limit IS NOT NULL)
  )
);

CREATE TABLE transactions (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type                VARCHAR(7)     NOT NULL CHECK (type IN ('income', 'expense')),
  description         VARCHAR(120)   NOT NULL,
  amount              NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date                DATE           NOT NULL,   -- purchase date (same in every installment)
  category_id         INTEGER        NOT NULL,
  account_id          INTEGER        NOT NULL,
  installment_number  SMALLINT       NOT NULL DEFAULT 1,
  installment_count   SMALLINT       NOT NULL DEFAULT 1 CHECK (installment_count BETWEEN 1 AND 48),
  installment_group   UUID,                      -- same value in all installments of a purchase
  created_at          TIMESTAMP      NOT NULL DEFAULT now(),
  CONSTRAINT transactions_installment_valid CHECK (installment_number BETWEEN 1 AND installment_count),
  -- Composite FKs (no cascade): the category must belong to the SAME user and have the SAME
  -- type as the transaction; the account must belong to the SAME user. The API validates
  -- first; the database guarantees it.
  CONSTRAINT transactions_category_fk FOREIGN KEY (category_id, user_id, type)
    REFERENCES categories (id, user_id, type),
  CONSTRAINT transactions_account_fk FOREIGN KEY (account_id, user_id)
    REFERENCES accounts (id, user_id)
);

CREATE INDEX idx_transactions_user_date ON transactions (user_id, date);
CREATE INDEX idx_transactions_category ON transactions (category_id);
CREATE INDEX idx_transactions_account ON transactions (account_id);
