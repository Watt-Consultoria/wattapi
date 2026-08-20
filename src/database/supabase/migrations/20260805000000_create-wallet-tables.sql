CREATE TYPE wallet_account_type AS ENUM (
  'checking',
  'savings',
  'credit_card',
  'investment',
  'cash'
);

CREATE TYPE wallet_transaction_type AS ENUM ('income', 'expense');

CREATE TABLE wallet_accounts (
  id            UUID                 NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT                 NOT NULL,
  type          wallet_account_type  NOT NULL,
  balance_cents INTEGER              NOT NULL DEFAULT 0,
  created_by    UUID                 NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ          NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ          NOT NULL DEFAULT now()
);

CREATE TABLE wallet_transactions (
  id               UUID                     NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id       UUID                     NOT NULL REFERENCES wallet_accounts(id),
  type             wallet_transaction_type  NOT NULL,
  amount_cents     INTEGER                  NOT NULL CHECK (amount_cents > 0),
  category         reimbursement_category   NOT NULL,
  description      TEXT                     NOT NULL,
  transaction_date DATE                     NOT NULL,
  created_by       UUID                     NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ              NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_accounts_created_by      ON wallet_accounts(created_by);
CREATE INDEX idx_wallet_transactions_account_id  ON wallet_transactions(account_id);
CREATE INDEX idx_wallet_transactions_date        ON wallet_transactions(transaction_date DESC);
