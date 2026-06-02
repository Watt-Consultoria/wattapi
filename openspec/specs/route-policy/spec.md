## MODIFIED Requirements

### Requirement: Estrutura de acesso em dois níveis — mode e rba

O sistema SHALL suportar uma estrutura `access` com dois campos distintos:

- `mode`: portão de entrada — define o nível de autenticação exigido pela rota
- `rba` (role-based access): restrição adicional — só avaliada quando `mode` passa

```typescript
type AccessPolicy =
  | { mode: 'unauthenticated' }
  | { mode: 'unexistent' }
  | { mode: 'authenticated'; rba?: RbaCondition[] };

type RbaCondition =
  | 'self'
  | ['minRank', number]
  | ['sector', string | string[]]
  | ['roleAndSector', { roles: string[]; sectors: string[] }];
```

`rba` é válido apenas com `mode: 'authenticated'` — as condições exigem `request.user` presente, o que só é garantido por esse modo.

### Requirement: Avaliação sequencial mode → rba

O guard SHALL avaliar `mode` primeiro e, somente se passar, avaliar `rba` com lógica OR entre as condições.

#### Scenario: mode passa, rba ausente

- **WHEN** `mode: 'authenticated'` e `rba` não está definido e o caller está autenticado
- **THEN** o sistema SHALL permitir o acesso

#### Scenario: mode passa, rba satisfeito por qualquer condição

- **WHEN** `mode: 'authenticated'`, `rba: [['minRank', 3], 'self']` e o caller é self (rank < 3)
- **THEN** o sistema SHALL permitir o acesso (condição `'self'` satisfeita)

#### Scenario: mode passa, nenhuma condição rba satisfeita

- **WHEN** `mode: 'authenticated'`, `rba: [['minRank', 3]]` e o caller tem rank 1 (gerente)
- **THEN** o sistema SHALL retornar HTTP 403

#### Scenario: Composição de minRank e sector

- **WHEN** `mode: 'authenticated'`, `rba: [['minRank', 2], ['sector', ['comercial', 'marketing']]]` e o caller tem rank 1 e setor 'projetos'
- **THEN** o sistema SHALL retornar HTTP 403

- **WHEN** as mesmas condições mas o caller tem setor 'comercial'
- **THEN** o sistema SHALL permitir o acesso (condição `sector` satisfeita)

### Requirement: Respostas de erro contextuais por jwtStatus

O `RoutePolicyGuard` SHALL ler `request.jwtStatus` e retornar mensagens de erro específicas antes de avaliar `mode` ou `rba`.

#### Scenario: Status 'no-token' em rota que exige autenticação

- **WHEN** `jwtStatus = 'no-token'` e `mode` é `'authenticated'` ou `'unexistent'`
- **THEN** o sistema SHALL retornar HTTP 401 com mensagem "Nenhum token de autenticação fornecido"

#### Scenario: Status 'token-expired'

- **WHEN** `jwtStatus = 'token-expired'` e `mode` exige autenticação
- **THEN** o sistema SHALL retornar HTTP 401 com mensagem "Token expirado, faça login novamente"

#### Scenario: Status 'token-invalid'

- **WHEN** `jwtStatus = 'token-invalid'` e `mode` exige autenticação
- **THEN** o sistema SHALL retornar HTTP 401 com mensagem "Token de autenticação inválido"

#### Scenario: Status 'user-not-found' em rota 'authenticated'

- **WHEN** `jwtStatus = 'user-not-found'` e `mode: 'authenticated'`
- **THEN** o sistema SHALL retornar HTTP 401 com mensagem "Usuário não registrado no sistema"

### Requirement: Modo 'unexistent' — controle do fluxo de registro

O modo `'unexistent'` exige que o token seja válido (`jwtData` presente) mas que o usuário ainda não exista em `public.users`.

#### Scenario: Registro de novo usuário (caso normal)

- **WHEN** `jwtStatus = 'user-not-found'` e `mode: 'unexistent'`
- **THEN** o sistema SHALL permitir o acesso ao handler

#### Scenario: Usuário já registrado em rota 'unexistent'

- **WHEN** `jwtStatus = 'ok'` e `mode: 'unexistent'`
- **THEN** o sistema SHALL retornar HTTP 409 "Usuário já registrado" — sem chegar ao controller

#### Scenario: Token ausente ou inválido em rota 'unexistent'

- **WHEN** `jwtStatus` é `'no-token'`, `'token-expired'` ou `'token-invalid'` e `mode: 'unexistent'`
- **THEN** o sistema SHALL retornar HTTP 401 com a mensagem contextual correspondente

### Requirement: Condição ['minRank', n] respeita hierarquia de ranks ao operar sobre outro usuário

Quando `['minRank', n]` é satisfeito e a rota contém `params.user_id`, o guard SHALL verificar que o caller tem rank estritamente maior que o target.

#### Scenario: Caller opera sobre usuário de rank inferior

- **WHEN** `rba: [['minRank', 3]]`, caller tem rank 3 (assessor) e target tem rank 1 (gerente)
- **THEN** o sistema SHALL permitir o acesso

#### Scenario: Caller opera sobre usuário de rank igual ou superior

- **WHEN** `rba: [['minRank', 3]]`, caller tem rank 3 (assessor) e target tem rank 4 (presidente)
- **THEN** o sistema SHALL retornar HTTP 403

### Requirement: Condição ['sector', value] aceita string ou array de strings

A condição `['sector', value]` é satisfeita quando `request.user.sector` é igual a `value` (string) ou está contido em `value` (array de strings).

#### Scenario: Setor único

- **WHEN** `rba: [['sector', 'comercial']]` e `user.sector = 'comercial'`
- **THEN** o sistema SHALL permitir o acesso

#### Scenario: Array de setores

- **WHEN** `rba: [['sector', ['comercial', 'marketing']]]` e `user.sector = 'marketing'`
- **THEN** o sistema SHALL permitir o acesso

- **WHEN** as mesmas condições e `user.sector = 'projetos'`
- **THEN** o sistema SHALL retornar HTTP 403

### Requirement: Condição ['roleAndSector'] combina role e setor com lógica AND

A condição `['roleAndSector', { roles, sectors }]` SHALL ser satisfeita quando `roles.includes(caller.role) AND sectors.includes(caller.sector)`, permitindo restringir acesso a uma combinação específica de papel e setor.

#### Scenario: Caller satisfaz role e setor

- **WHEN** `rba: [['roleAndSector', { roles: ['diretor'], sectors: ['marketing'] }]]` e `caller.role = 'diretor'` e `caller.sector = 'marketing'`
- **THEN** o sistema SHALL permitir o acesso

#### Scenario: Caller tem o setor correto mas role errado

- **WHEN** `rba: [['roleAndSector', { roles: ['diretor'], sectors: ['marketing'] }]]` e `caller.role = 'gerente'` e `caller.sector = 'marketing'`
- **THEN** o sistema SHALL retornar HTTP 403

#### Scenario: Caller tem o role correto mas setor errado

- **WHEN** `rba: [['roleAndSector', { roles: ['diretor'], sectors: ['marketing'] }]]` e `caller.role = 'diretor'` e `caller.sector = 'projetos'`
- **THEN** o sistema SHALL retornar HTTP 403

#### Scenario: roleAndSector composto com outras condições via OR

- **WHEN** `rba: [['sector', 'comercial'], ['roleAndSector', { roles: ['diretor'], sectors: ['marketing'] }]]` e `caller.role = 'consultor'` e `caller.sector = 'comercial'`
- **THEN** o sistema SHALL permitir o acesso (condição `sector` satisfeita, OR é suficiente)
