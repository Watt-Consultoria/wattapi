### Requirement: Create a new user via POST /users
The system SHALL expose a `POST /users` endpoint that accepts a JSON body, validates the input, persists a new user record, and returns the created user with HTTP 201.

#### Scenario: Successful user creation
- **WHEN** a client sends `POST /users` with a valid JSON body containing `email`, `name`, `role`, `sector`, and `cpf`
- **THEN** the system SHALL insert a new row into the `users` table and return HTTP 201 with the created user object (fields: `id`, `email`, `name`, `role`, `sector`, `cpf`, `created_at`, `updated_at`)

### Requirement: Validate required fields
The system SHALL reject requests that are missing required fields or contain invalid values.

#### Scenario: Missing required field
- **WHEN** a client sends `POST /users` without one or more required fields (`email`, `name`, `sector`, `cpf`)
- **THEN** the system SHALL return HTTP 400 with a descriptive validation error message

#### Scenario: Invalid email format
- **WHEN** a client sends `POST /users` with a malformed email address
- **THEN** the system SHALL return HTTP 400 indicating the email is invalid

#### Scenario: Invalid role value
- **WHEN** a client sends `POST /users` with a `role` not in `['consultor', 'gerente', 'diretor', 'presidente', 'assessor']`
- **THEN** the system SHALL return HTTP 400 indicating the role is invalid

#### Scenario: Invalid sector value
- **WHEN** a client sends `POST /users` with a `sector` not in `['projetos', 'comercial', 'marketing', 'executivo', 'institucional']`
- **THEN** the system SHALL return HTTP 400 indicating the sector is invalid

#### Scenario: Invalid CPF format
- **WHEN** a client sends `POST /users` with a `cpf` that does not match the pattern `^([0-9]{11}|[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2})$`
- **THEN** the system SHALL return HTTP 400 indicating the CPF format is invalid

### Requirement: Enforce uniqueness constraints
The system SHALL reject creation attempts that violate database uniqueness constraints.

#### Scenario: Duplicate email
- **WHEN** a client sends `POST /users` with an `email` that already exists in the database
- **THEN** the system SHALL return HTTP 409 with an error indicating the email is already in use

#### Scenario: Duplicate CPF
- **WHEN** a client sends `POST /users` with a `cpf` that already exists in the database
- **THEN** the system SHALL return HTTP 409 with an error indicating the CPF is already in use

### Requirement: Default role when not provided
The system SHALL use `'consultor'` as the default value for `role` when it is omitted from the request body.

#### Scenario: Role omitted defaults to consultor
- **WHEN** a client sends `POST /users` without the `role` field
- **THEN** the system SHALL create the user with `role` set to `'consultor'` and return it in the response
