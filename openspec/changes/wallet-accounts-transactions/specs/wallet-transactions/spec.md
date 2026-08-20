## ADDED Requirements

### Requirement: Presidente Executivo can create a wallet transaction
A user with rank > 3 (Presidente Executivo) SHALL be able to create a wallet transaction by providing an `account_id`, a `type` (`income` or `expense`), a positive `amount_cents`, a `category` (one of the reimbursement categories: `ingresso`, `alimentação`, `transporte`, `equipamento`, `outro`), a `description`, and a `transaction_date`. The system SHALL look up the referenced account and apply the transaction to its balance: `income` increases `balance_cents` by `amount_cents`; `expense` decreases it by `amount_cents`. There is no minimum-balance check — the resulting balance MAY be negative.

#### Scenario: Successful expense transaction
- **WHEN** a Presidente Executivo sends `POST /wallet/transactions` with `type = 'expense'`, a valid `account_id`, `amount_cents` (positive integer), `category`, `description`, and `transaction_date`
- **THEN** the system SHALL persist a `wallet_transactions` row, decrease the referenced account's `balance_cents` by `amount_cents`, and return `201` with the created transaction

#### Scenario: Successful income transaction
- **WHEN** a Presidente Executivo sends `POST /wallet/transactions` with `type = 'income'`, a valid `account_id`, `amount_cents` (positive integer), `category`, `description`, and `transaction_date`
- **THEN** the system SHALL persist a `wallet_transactions` row, increase the referenced account's `balance_cents` by `amount_cents`, and return `201` with the created transaction

#### Scenario: Transaction leaves the account balance negative
- **WHEN** a Presidente Executivo sends `POST /wallet/transactions` with `type = 'expense'` and `amount_cents` greater than the referenced account's current `balance_cents`
- **THEN** the system SHALL still persist the transaction, apply the negative balance to the account, and return `201`

#### Scenario: Account not found
- **WHEN** a Presidente Executivo sends `POST /wallet/transactions` with an `account_id` that does not match any wallet account
- **THEN** the system SHALL return `404` and SHALL NOT persist the transaction

#### Scenario: Invalid category value
- **WHEN** a Presidente Executivo sends `POST /wallet/transactions` with a `category` not in `['ingresso', 'alimentação', 'transporte', 'equipamento', 'outro']`
- **THEN** the system SHALL return `400`

#### Scenario: Invalid type value
- **WHEN** a Presidente Executivo sends `POST /wallet/transactions` with a `type` not in `['income', 'expense']`
- **THEN** the system SHALL return `400`

#### Scenario: Amount in cents must be positive
- **WHEN** a Presidente Executivo sends `POST /wallet/transactions` with `amount_cents` equal to zero or negative
- **THEN** the system SHALL return `400`

#### Scenario: Missing required fields
- **WHEN** a Presidente Executivo sends `POST /wallet/transactions` without `account_id`, `type`, `amount_cents`, `category`, or `transaction_date`
- **THEN** the system SHALL return `400`

#### Scenario: Non-presidente user attempts to create a transaction
- **WHEN** a user with rank <= 3 sends `POST /wallet/transactions`
- **THEN** the system SHALL return `403`

#### Scenario: Unauthenticated request
- **WHEN** a request reaches `POST /wallet/transactions` without a valid JWT
- **THEN** the system SHALL return `401`

---

### Requirement: User with rank >= 2 can list wallet transactions
A user with rank >= 2 (Diretor and above) SHALL be able to retrieve wallet transactions, optionally filtered by `account_id`.

#### Scenario: List all transactions
- **WHEN** a user with rank >= 2 sends `GET /wallet/transactions`
- **THEN** the system SHALL return `200` with all wallet transactions

#### Scenario: List transactions filtered by account
- **WHEN** a user with rank >= 2 sends `GET /wallet/transactions?account_id=:id` with a valid account UUID
- **THEN** the system SHALL return `200` with only the transactions belonging to that account

#### Scenario: User below rank 2 attempts to list transactions
- **WHEN** a user with rank < 2 sends `GET /wallet/transactions`
- **THEN** the system SHALL return `403`

#### Scenario: Unauthenticated request
- **WHEN** a request reaches `GET /wallet/transactions` without a valid JWT
- **THEN** the system SHALL return `401`
