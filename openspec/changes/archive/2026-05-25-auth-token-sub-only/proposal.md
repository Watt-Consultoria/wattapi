## Why

O token JWT atualmente carrega `sub` e `email`, mas o email não é verificado contra a tabela de autenticação — o sistema confia no valor do token, que pode estar desatualizado ou inconsistente com `auth.users`. Além disso, a validação de que `sub` é um UUID válido está no controller, onde não pertence.

## What Changes

- O token JWT passa a carregar apenas `sub` (UUID do usuário)
- A validação de UUID do `sub` é movida do `UsersController` para o `JwtGuard` — falha com `token-invalid`
- O `JwtGuard` passa a resolver o usuário por `id` (em vez de `email`)
- O `AuthService` adiciona método `getAuthEmail(id)` que consulta `auth.users` para obter o email real
- No fluxo de criação (`POST /users`), o email é obtido de `auth.users` via `sub`, nunca do token
- `JwtData` passa a ter apenas `{ sub }`, removendo `email`

## Capabilities

### New Capabilities

_Nenhuma._

### Modified Capabilities

- `jwt-verification`: o guard agora valida o formato UUID do `sub` e resolve o usuário por `id`, não por `email`; `jwtData` passa a ter apenas `{ sub }`
- `user-identity`: a resolução do usuário autenticado passa a ser feita por `id` em vez de `email`
- `create-user`: o `email` do novo usuário passa a ser obtido de `auth.users` via `sub`, não do payload do token

## Impact

- `src/modules/auth/jwt.guard.ts` — validação UUID, lookup por ID, remoção de `email` de `JwtData`
- `src/modules/auth/auth.service.ts` — `resolveUser(id)` e novo `getAuthEmail(id)`
- `src/modules/users/users.controller.ts` — remove validação UUID e uso de `email` de `jwtData`
- Specs modificadas: `jwt-verification`, `user-identity`, `create-user`
