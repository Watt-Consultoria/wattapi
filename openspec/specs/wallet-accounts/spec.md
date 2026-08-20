## ADDED Requirements

### Requirement: Presidente Executivo can create a wallet account
A user with rank > 3 (Presidente Executivo) SHALL be able to create a wallet account by providing a name, a type (`checking`, `savings`, `credit_card`, `investment`, or `cash`), and an optional starting balance in cents (defaults to `0` when omitted).

#### Scenario: Successful creation
- **WHEN** a Presidente Executivo sends `POST /wallet/accounts` with valid `name`, `type`, and optional `balance_cents`
- **THEN** the system SHALL persist a `wallet_accounts` row and return `201` with the created account

#### Scenario: Missing required fields
- **WHEN** a Presidente Executivo sends `POST /wallet/accounts` without `name` or `type`
- **THEN** the system SHALL return `400`

#### Scenario: Invalid type value
- **WHEN** a Presidente Executivo sends `POST /wallet/accounts` with a `type` not in `['checking', 'savings', 'credit_card', 'investment', 'cash']`
- **THEN** the system SHALL return `400`

#### Scenario: Non-presidente user attempts to create an account
- **WHEN** a user with rank <= 3 sends `POST /wallet/accounts`
- **THEN** the system SHALL return `403`

#### Scenario: Unauthenticated request
- **WHEN** a request reaches `POST /wallet/accounts` without a valid JWT
- **THEN** the system SHALL return `401`

---

### Requirement: Presidente Executivo can edit a wallet account
A user with rank > 3 (Presidente Executivo) SHALL be able to update an existing wallet account's `name` and/or `type`. Editing does not directly set `balance_cents` — balance only changes through wallet transactions.

#### Scenario: Successful edit
- **WHEN** a Presidente Executivo sends `PATCH /wallet/accounts/:id` with a new `name` and/or `type` for an existing account
- **THEN** the system SHALL update the account and return `200` with the updated account

#### Scenario: Invalid type value on edit
- **WHEN** a Presidente Executivo sends `PATCH /wallet/accounts/:id` with a `type` not in `['checking', 'savings', 'credit_card', 'investment', 'cash']`
- **THEN** the system SHALL return `400`

#### Scenario: Non-presidente user attempts to edit an account
- **WHEN** a user with rank <= 3 sends `PATCH /wallet/accounts/:id`
- **THEN** the system SHALL return `403`

#### Scenario: Account not found
- **WHEN** a Presidente Executivo sends `PATCH /wallet/accounts/:id` with a UUID that does not match any account
- **THEN** the system SHALL return `404`

---

### Requirement: User with rank >= 2 can list wallet accounts
A user with rank >= 2 (Diretor and above) SHALL be able to retrieve the list of all wallet accounts and fetch a single account by id.

#### Scenario: List all accounts
- **WHEN** a user with rank >= 2 sends `GET /wallet/accounts`
- **THEN** the system SHALL return `200` with all wallet accounts, including each account's current `balance_cents`

#### Scenario: Fetch a single account
- **WHEN** a user with rank >= 2 sends `GET /wallet/accounts/:id` with a valid account UUID
- **THEN** the system SHALL return `200` with that account

#### Scenario: Single account not found
- **WHEN** a user with rank >= 2 sends `GET /wallet/accounts/:id` with a UUID that does not match any account
- **THEN** the system SHALL return `404`

#### Scenario: User below rank 2 attempts to list accounts
- **WHEN** a user with rank < 2 sends `GET /wallet/accounts` or `GET /wallet/accounts/:id`
- **THEN** the system SHALL return `403`

#### Scenario: Unauthenticated request
- **WHEN** a request reaches `GET /wallet/accounts` without a valid JWT
- **THEN** the system SHALL return `401`
