## MODIFIED Requirements

### Requirement: Auto-registro via POST /users

O sistema SHALL expor um endpoint `POST /users` com `mode: ['unexistent']` que permite a um usuário autenticado via JWT criar seu próprio registro em `public.users` pela primeira vez.

O `id` do novo usuário é extraído do JWT (`sub`). O `email` é obtido consultando `auth.users WHERE id = sub` — nunca do corpo da requisição nem do payload do token. O `role` é sempre `'consultor'`, independentemente de qualquer dado enviado pelo cliente.

#### Scenario: Auto-registro bem-sucedido

- **WHEN** `jwtStatus = 'user-not-found'` e o body contém `{ name, sector, cpf }` válidos
- **THEN** o sistema SHALL consultar `auth.users` para obter o email correspondente ao `sub`, inserir uma nova row com `id = jwtData.sub`, `email = <email de auth.users>`, `role = 'consultor'` e os campos do body, e retornar HTTP 201 com o objeto do usuário criado

#### Scenario: Usuário já cadastrado (rejeitado pelo guard)

- **WHEN** `jwtStatus = 'ok'` (usuário já existe em `public.users`)
- **THEN** o `RoutePolicyGuard` SHALL retornar HTTP 409 "Usuário já registrado" — o controller não é chamado

#### Scenario: Token ausente ou inválido

- **WHEN** `jwtStatus` é `'no-token'`, `'token-expired'` ou `'token-invalid'`
- **THEN** o `RoutePolicyGuard` SHALL retornar HTTP 401 com mensagem contextual correspondente

### Requirement: Validar campos obrigatórios do body

O sistema SHALL rejeitar requisições com campos ausentes ou inválidos.

#### Scenario: Campo obrigatório ausente

- **WHEN** o body não contém um dos campos obrigatórios (`name`, `sector`, `cpf`)
- **THEN** o sistema SHALL retornar HTTP 400 com mensagem de erro descritiva

#### Scenario: Valor de sector inválido

- **WHEN** o body contém `sector` fora de `['projetos', 'comercial', 'marketing', 'executivo', 'institucional']`
- **THEN** o sistema SHALL retornar HTTP 400

#### Scenario: Formato de CPF inválido

- **WHEN** o body contém `cpf` que não corresponde ao padrão `^([0-9]{11}|[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2})$`
- **THEN** o sistema SHALL retornar HTTP 400

### Requirement: Unicidade de CPF

O sistema SHALL rejeitar cadastros com CPF já existente em `public.users`.

#### Scenario: CPF duplicado

- **WHEN** o body contém um `cpf` que já existe em `public.users`
- **THEN** o sistema SHALL retornar HTTP 409 com mensagem indicando que o CPF já está em uso

### Requirement: Role não é editável no cadastro

O body de criação não aceita o campo `role`. O sistema SHALL sempre criar o usuário com `role = 'consultor'`.

