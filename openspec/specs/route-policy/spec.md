### Requirement: Decorator @RoutePolicy define política completa de uma rota
O sistema SHALL fornecer um decorator `@RoutePolicy` que aceita um objeto com três slices opcionais — `access`, `write` e `output` — e registra esses metadados na rota via `SetMetadata`. Rotas sem o decorator SHALL ser tratadas como sem restrições por todos os consumidores.

#### Scenario: Decorator registra metadados acessíveis via Reflector
- **WHEN** `@RoutePolicy(policy)` é aplicado a um handler de rota
- **THEN** um `NestJS Reflector` consultando a chave `route_policy` nesse handler SHALL retornar o objeto `policy` completo

#### Scenario: Rota sem decorator não é bloqueada por falta de metadados
- **WHEN** um handler não possui `@RoutePolicy`
- **THEN** o `RoutePolicyGuard` e o `RoleSerializerInterceptor` SHALL deixar a requisição passar sem erro

### Requirement: RoutePolicyGuard controla acesso via slice access
O sistema SHALL fornecer um `RoutePolicyGuard` que lê a slice `access` do `@RoutePolicy` e aplica a política de acesso correspondente ao modo declarado.

Modos suportados:
- `authenticated`: qualquer usuário autenticado passa
- `min-rank`: apenas usuários com `rank(caller) >= minRank` passam; o campo `minRank` é obrigatório neste modo
- `superuser-or-self`: rank >= 3 passa para qualquer target de rank inferior; rank < 3 passa apenas se `caller.id === target.id`
- `superuser-only`: apenas rank >= 3 passa; se `noSelfAccess: true`, mesmo superuser não pode agir sobre si mesmo

O guard SHALL também resolver a slice `write` e injetar `req.policy` com `{ canAccess: true, writableFields: string[] }`.

#### Scenario: Modo authenticated permite qualquer usuário autenticado
- **WHEN** a rota usa `access: { mode: 'authenticated' }` e o caller está autenticado
- **THEN** o guard SHALL retornar `true` e não lançar exceção

#### Scenario: Modo min-rank permite caller com rank suficiente
- **WHEN** a rota usa `access: { mode: 'min-rank', minRank: 2 }` e caller tem rank >= 2
- **THEN** o guard SHALL retornar `true`

#### Scenario: Modo min-rank bloqueia caller com rank insuficiente
- **WHEN** a rota usa `access: { mode: 'min-rank', minRank: 2 }` e caller tem rank < 2
- **THEN** o guard SHALL lançar `ForbiddenException`

#### Scenario: Modo superuser-or-self permite superuser editar target de rank inferior
- **WHEN** a rota usa `access: { mode: 'superuser-or-self' }`, caller é assessor (rank 3) e target é gerente (rank 1)
- **THEN** o guard SHALL retornar `true`

#### Scenario: Modo superuser-or-self bloqueia superuser tentando editar target de rank igual ou superior
- **WHEN** a rota usa `access: { mode: 'superuser-or-self' }`, caller é assessor (rank 3) e target é presidente (rank 4)
- **THEN** o guard SHALL lançar `ForbiddenException`

#### Scenario: Modo superuser-or-self permite regular editar a si mesmo
- **WHEN** a rota usa `access: { mode: 'superuser-or-self' }`, caller é gerente e `caller.id === param.user_id`
- **THEN** o guard SHALL retornar `true`

#### Scenario: Modo superuser-or-self bloqueia regular tentando editar outro usuário
- **WHEN** a rota usa `access: { mode: 'superuser-or-self' }`, caller é gerente e `caller.id !== param.user_id`
- **THEN** o guard SHALL lançar `ForbiddenException`

#### Scenario: Modo superuser-only bloqueia usuário regular
- **WHEN** a rota usa `access: { mode: 'superuser-only' }` e caller tem rank < 3
- **THEN** o guard SHALL lançar `ForbiddenException`

#### Scenario: Modo superuser-only com noSelfAccess bloqueia self-action
- **WHEN** a rota usa `access: { mode: 'superuser-only', noSelfAccess: true }` e `caller.id === param.user_id`
- **THEN** o guard SHALL lançar `ForbiddenException`

#### Scenario: Guard injeta writableFields resolvidos no request
- **WHEN** o guard autoriza uma requisição e a rota possui slice write
- **THEN** `req.policy.writableFields` SHALL conter os campos permitidos para o rank do caller

### Requirement: RoleSerializerInterceptor filtra campos de saída via slice output
O sistema SHALL fornecer um `RoleSerializerInterceptor` que lê a slice `output` do `@RoutePolicy` e remove da resposta campos que o caller não tem permissão de ver.

A slice `output` é um mapa de `fieldName → { minRank: number, selfBypass: boolean }`:
- Se `rank(caller) >= minRank` → campo é visível
- Se `selfBypass: true` e resposta é objeto singular com `response.id === caller.id` → campo é visível independente do rank
- Se resposta é array → `selfBypass` nunca se aplica (sem conceito de dono singular)

#### Scenario: Campo restrito é removido para caller de rank insuficiente em lista
- **WHEN** a rota retorna array de usuários, `output.cpf.minRank = 2` e caller tem rank 1 (gerente)
- **THEN** o interceptor SHALL remover o campo `cpf` de todos os objetos da resposta

#### Scenario: Campo restrito é visível para caller de rank suficiente em lista
- **WHEN** a rota retorna array de usuários, `output.cpf.minRank = 2` e caller tem rank 2 (diretor)
- **THEN** o interceptor SHALL preservar o campo `cpf` em todos os objetos da resposta

#### Scenario: selfBypass permite caller ver próprio campo restrito em recurso singular
- **WHEN** a rota retorna objeto singular, `output.cpf = { minRank: 2, selfBypass: true }`, caller tem rank 1 e `response.id === caller.id`
- **THEN** o interceptor SHALL preservar o campo `cpf` na resposta

#### Scenario: selfBypass não se aplica em resposta de lista
- **WHEN** a rota retorna array, `output.cpf = { minRank: 2, selfBypass: true }` e caller tem rank 0
- **THEN** o interceptor SHALL remover `cpf` de todos os objetos, incluindo o objeto do próprio caller
